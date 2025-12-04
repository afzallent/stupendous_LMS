import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

interface AnswerSubmission {
  questionId: string
  answer: string | string[]
}

interface QuizSubmission {
  quizId: string
  answers: AnswerSubmission[]
}

async function verifyStudent(request: NextRequest) {
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true }
    })

    return user
  } catch {
    return null
  }
}

function calculateScore(
  userAnswer: string | string[],
  correctAnswer: string,
  questionType: string,
  points: number
): { isCorrect: boolean; score: number } {
  let isCorrect = false

  switch (questionType) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
    case 'FILL_IN_THE_BLANK':
      // For single answer questions, direct comparison
      isCorrect = userAnswer === correctAnswer ||
                  userAnswer?.toString().toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      break

    case 'MULTIPLE_ANSWER':
      // For multiple answer questions, parse and compare arrays
      const correctAnswers = JSON.parse(correctAnswer) as string[]
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : []

      // Check if arrays have same length and same elements
      if (correctAnswers.length === userAnswers.length) {
        const sortedCorrect = [...correctAnswers].sort()
        const sortedUser = [...userAnswers].sort()
        isCorrect = sortedCorrect.every((ans, idx) => ans === sortedUser[idx])
      }
      break
  }

  return {
    isCorrect,
    score: isCorrect ? points : 0
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await verifyStudent(request)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: QuizSubmission = await request.json()

    if (!body.quizId || !body.answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: body.quizId },
      include: {
        questions: true,
        lesson: {
          include: {
            chapter: {
              include: {
                course: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Check if student is enrolled
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        courseId: quiz.lesson.chapter.course.id,
        status: 'ACTIVE'
      }
    })

    if (!enrollment && student.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to take the quiz' },
        { status: 403 }
      )
    }

    // Check if student can retake (based on metadata)
    const previousAttempts = await prisma.quizAttempt.count({
      where: {
        quizId: body.quizId,
        studentId: student.id,
        completedAt: { not: null }
      }
    })

    const metadata = quiz.metadata as any
    if (metadata?.allowRetakes === false && previousAttempts > 0) {
      return NextResponse.json(
        { error: 'Retakes are not allowed for this quiz' },
        { status: 403 }
      )
    }

    if (metadata?.maxRetakes && previousAttempts >= metadata.maxRetakes) {
      return NextResponse.json(
        { error: `Maximum retakes (${metadata.maxRetakes}) exceeded` },
        { status: 403 }
      )
    }

    // Check if there's an incomplete attempt
    let attempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId: body.quizId,
        studentId: student.id,
        completedAt: null
      }
    })

    // Create new attempt if none exists
    if (!attempt) {
      attempt = await prisma.quizAttempt.create({
        data: {
          quizId: body.quizId,
          studentId: student.id,
          score: 0,
          maxScore: 0,
          passed: false
        }
      })
    }

    // Calculate scores and create answer records
    let totalScore = 0
    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0)
    const answerRecords = []

    // Create a map of user answers for easy lookup
    const userAnswersMap = new Map<string, string | string[]>()
    body.answers.forEach(ans => {
      userAnswersMap.set(ans.questionId, ans.answer)
    })

    // Process each question
    for (const question of quiz.questions) {
      const userAnswer = userAnswersMap.get(question.id) || ''
      const { isCorrect, score } = calculateScore(
        userAnswer,
        question.correctAnswer,
        question.type,
        question.points
      )

      totalScore += score

      answerRecords.push({
        attemptId: attempt.id,
        questionId: question.id,
        answer: Array.isArray(userAnswer) ? JSON.stringify(userAnswer) : userAnswer.toString(),
        isCorrect,
        points: score
      })
    }

    // Calculate pass/fail
    const percentageScore = (totalScore / maxScore) * 100
    const passed = percentageScore >= quiz.passingScore

    // Update attempt with final scores
    const completedAttempt = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        score: totalScore,
        maxScore,
        passed,
        completedAt: new Date()
      }
    })

    // Create answer records
    await prisma.quizAnswer.createMany({
      data: answerRecords
    })

    // Update lesson progress if quiz is passed
    if (passed) {
      await prisma.progress.updateMany({
        where: {
          studentId: student.id,
          lessonId: quiz.lessonId,
          enrollmentId: enrollment?.id
        },
        data: {
          completed: true,
          progressPercentage: 100
        }
      })

      // Check if all lessons in the course are completed
      const allLessons = await prisma.lesson.findMany({
        where: {
          chapter: {
            courseId: quiz.lesson.chapter.course.id
          }
        },
        select: { id: true }
      })

      const completedLessons = await prisma.progress.count({
        where: {
          studentId: student.id,
          lessonId: { in: allLessons.map(l => l.id) },
          completed: true
        }
      })

      const courseProgress = (completedLessons / allLessons.length) * 100

      // Update enrollment progress
      if (enrollment) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            progress: courseProgress,
            completedAt: courseProgress === 100 ? new Date() : null
          }
        })

        // Generate certificate if course is 100% complete
        if (courseProgress === 100) {
          const existingCertificate = await prisma.certificate.findFirst({
            where: {
              userId: student.id,
              courseId: quiz.lesson.chapter.course.id
            }
          })

          if (!existingCertificate) {
            await prisma.certificate.create({
              data: {
                certificateId: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
                userId: student.id,
                courseId: quiz.lesson.chapter.course.id
              }
            })
          }
        }
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: student.id,
        action: 'QUIZ_SUBMITTED',
        details: `Submitted quiz "${quiz.title}" with score ${totalScore}/${maxScore}`,
        metadata: {
          quizId: quiz.id,
          attemptId: completedAttempt.id,
          score: totalScore,
          maxScore,
          passed,
          courseId: quiz.lesson.chapter.course.id
        }
      }
    })

    // Prepare detailed results if explanations are enabled
    let detailedResults = null
    if (metadata?.showExplanations) {
      detailedResults = quiz.questions.map(question => {
        const userAnswer = userAnswersMap.get(question.id)
        const answerRecord = answerRecords.find(a => a.questionId === question.id)

        return {
          questionId: question.id,
          question: question.question,
          userAnswer,
          correctAnswer: question.correctAnswer.startsWith('[')
            ? JSON.parse(question.correctAnswer)
            : question.correctAnswer,
          isCorrect: answerRecord?.isCorrect || false,
          points: answerRecord?.points || 0,
          maxPoints: question.points,
          explanation: question.explanation
        }
      })
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: completedAttempt.id,
        score: totalScore,
        maxScore,
        passed,
        percentageScore: percentageScore.toFixed(1),
        completedAt: completedAttempt.completedAt
      },
      detailedResults
    })
  } catch (error) {
    console.error('Error submitting quiz:', error)
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}