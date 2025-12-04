import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

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

export async function GET(
  request: NextRequest,
  { params }: { params: { quizId: string } }
) {
  try {
    const student = await verifyStudent(request)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quizId } = params

    // Fetch quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            type: true,
            options: true,
            points: true,
            order: true
          },
          orderBy: { order: 'asc' }
        },
        lesson: {
          include: {
            chapter: {
              include: {
                course: {
                  select: { id: true, title: true }
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

    // Check if student is enrolled in the course
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

    // Get previous attempts
    const previousAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        studentId: student.id,
        completedAt: { not: null }
      },
      select: {
        id: true,
        score: true,
        maxScore: true,
        passed: true,
        completedAt: true
      },
      orderBy: { completedAt: 'desc' }
    })

    // Count total attempts
    const attemptCount = previousAttempts.length

    // Parse questions options
    const questionsWithParsedOptions = quiz.questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null
    }))

    // Remove correct answers from questions for security
    const sanitizedQuestions = questionsWithParsedOptions.map(({ ...q }) => q)

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passingScore: quiz.passingScore,
        questions: sanitizedQuestions,
        metadata: quiz.metadata || {},
        course: {
          id: quiz.lesson.chapter.course.id,
          title: quiz.lesson.chapter.course.title
        },
        lesson: {
          id: quiz.lesson.id,
          title: quiz.lesson.title
        }
      },
      previousAttempts,
      attemptCount
    })
  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}