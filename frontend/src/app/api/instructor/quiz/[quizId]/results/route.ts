import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

async function verifyInstructor(request: NextRequest) {
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true }
    })

    if (user?.role === 'TRAINER' || user?.role === 'ADMIN') {
      return user
    }
    return null
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const instructor = await verifyInstructor(request)
    if (!instructor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizId } = params

    // Fetch quiz with course info to verify ownership
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          include: {
            chapter: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    instructorId: true
                  }
                }
              }
            }
          }
        },
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Verify instructor owns the course
    if (quiz.lesson.chapter.course.instructorId !== instructor.id && instructor.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to view these results' },
        { status: 403 }
      )
    }

    // Fetch all attempts for this quiz
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        completedAt: { not: null }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
                points: true
              }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    })

    // Calculate analytics
    const totalAttempts = attempts.length
    const passedAttempts = attempts.filter(a => a.passed).length
    const scores = attempts.map(a => a.score)
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0
    const passRate = totalAttempts > 0
      ? (passedAttempts / totalAttempts) * 100
      : 0

    // Calculate median score
    const sortedScores = [...scores].sort((a, b) => a - b)
    const medianScore = sortedScores.length > 0
      ? sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)]
      : 0

    // Calculate question performance
    const questionPerformance = quiz.questions.map(question => {
      const answers = attempts.flatMap(a => a.answers.filter(ans => ans.questionId === question.id))
      const correctAnswers = answers.filter(a => a.isCorrect).length
      const totalAnswers = answers.length
      const correctRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0
      const averagePoints = totalAnswers > 0
        ? answers.reduce((sum, a) => sum + a.points, 0) / totalAnswers
        : 0

      return {
        questionId: question.id,
        question: question.question,
        type: question.type,
        maxPoints: question.points,
        totalAnswers,
        correctAnswers,
        correctRate: parseFloat(correctRate.toFixed(1)),
        averagePoints: parseFloat(averagePoints.toFixed(2))
      }
    })

    // Get unique students who attempted
    const uniqueStudents = new Set(attempts.map(a => a.studentId))
    const studentCount = uniqueStudents.size

    // Get best and worst performers
    const studentPerformance = Array.from(uniqueStudents).map(studentId => {
      const studentAttempts = attempts.filter(a => a.studentId === studentId)
      const bestScore = Math.max(...studentAttempts.map(a => a.score))
      const student = studentAttempts[0].student

      return {
        studentId,
        studentName: student.name,
        studentEmail: student.email,
        attempts: studentAttempts.length,
        bestScore,
        lastAttempt: studentAttempts[0].completedAt
      }
    }).sort((a, b) => b.bestScore - a.bestScore)

    // Format attempts for response
    const formattedAttempts = attempts.map(attempt => ({
      id: attempt.id,
      studentId: attempt.student.id,
      studentName: attempt.student.name,
      studentEmail: attempt.student.email,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: parseFloat(((attempt.score / attempt.maxScore) * 100).toFixed(1)),
      passed: attempt.passed,
      completedAt: attempt.completedAt,
      duration: attempt.completedAt && attempt.startedAt
        ? Math.floor((new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000 / 60)
        : null
    }))

    // Score distribution for histogram
    const scoreDistribution = {
      '0-20': scores.filter(s => s / quiz.questions.reduce((sum, q) => sum + q.points, 0) * 100 <= 20).length,
      '21-40': scores.filter(s => {
        const percentage = s / quiz.questions.reduce((sum, q) => sum + q.points, 0) * 100
        return percentage > 20 && percentage <= 40
      }).length,
      '41-60': scores.filter(s => {
        const percentage = s / quiz.questions.reduce((sum, q) => sum + q.points, 0) * 100
        return percentage > 40 && percentage <= 60
      }).length,
      '61-80': scores.filter(s => {
        const percentage = s / quiz.questions.reduce((sum, q) => sum + q.points, 0) * 100
        return percentage > 60 && percentage <= 80
      }).length,
      '81-100': scores.filter(s => {
        const percentage = s / quiz.questions.reduce((sum, q) => sum + q.points, 0) * 100
        return percentage > 80
      }).length
    }

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passingScore: quiz.passingScore,
        questionCount: quiz.questions.length,
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        course: {
          id: quiz.lesson.chapter.course.id,
          title: quiz.lesson.chapter.course.title
        },
        lesson: {
          id: quiz.lesson.id,
          title: quiz.lesson.title
        }
      },
      attempts: formattedAttempts,
      analytics: {
        totalAttempts,
        uniqueStudents: studentCount,
        passedAttempts,
        failedAttempts: totalAttempts - passedAttempts,
        averageScore: parseFloat(averageScore.toFixed(2)),
        medianScore: parseFloat(medianScore.toFixed(2)),
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
        passRate: parseFloat(passRate.toFixed(1)),
        scoreDistribution,
        questionPerformance,
        topPerformers: studentPerformance.slice(0, 5),
        strugglingStudents: studentPerformance.filter(s =>
          (s.bestScore / quiz.questions.reduce((sum, q) => sum + q.points, 0)) * 100 < quiz.passingScore
        ).slice(-5).reverse()
      }
    })
  } catch (error) {
    console.error('Error fetching quiz results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz results' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}