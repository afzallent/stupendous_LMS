import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

interface QuestionInput {
  question: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_THE_BLANK' | 'MULTIPLE_ANSWER'
  options: string[]
  correctAnswer: string | string[]
  points: number
  explanation?: string
  order: number
}

interface QuizInput {
  title: string
  description: string
  passingScore: number
  lessonId: string
  timeLimit?: number
  randomizeQuestions?: boolean
  showExplanations?: boolean
  allowRetakes?: boolean
  maxRetakes?: number
  questions: QuestionInput[]
}

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

export async function POST(request: NextRequest) {
  try {
    const instructor = await verifyInstructor(request)
    if (!instructor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: QuizInput = await request.json()

    // Validate input
    if (!body.title || !body.lessonId || !body.questions || body.questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify lesson exists and instructor owns the course
    const lesson = await prisma.lesson.findUnique({
      where: { id: body.lessonId },
      include: {
        chapter: {
          include: {
            course: {
              select: { instructorId: true }
            }
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    if (lesson.chapter.course.instructorId !== instructor.id && instructor.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to modify this lesson' }, { status: 403 })
    }

    // Check if quiz already exists for this lesson
    const existingQuiz = await prisma.quiz.findUnique({
      where: { lessonId: body.lessonId }
    })

    if (existingQuiz) {
      return NextResponse.json(
        { error: 'Quiz already exists for this lesson' },
        { status: 400 }
      )
    }

    // Create quiz with questions
    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        description: body.description,
        passingScore: body.passingScore,
        lessonId: body.lessonId,
        questions: {
          create: body.questions.map((q, index) => ({
            question: q.question,
            type: q.type,
            options: Array.isArray(q.options) ? JSON.stringify(q.options) : null,
            correctAnswer: Array.isArray(q.correctAnswer)
              ? JSON.stringify(q.correctAnswer)
              : q.correctAnswer,
            points: q.points,
            explanation: q.explanation,
            order: q.order || index
          }))
        }
      },
      include: {
        questions: {
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

    // Store quiz metadata (optional settings)
    if (body.timeLimit || body.randomizeQuestions !== undefined ||
        body.showExplanations !== undefined || body.allowRetakes !== undefined) {
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: {
          metadata: {
            timeLimit: body.timeLimit,
            randomizeQuestions: body.randomizeQuestions,
            showExplanations: body.showExplanations,
            allowRetakes: body.allowRetakes,
            maxRetakes: body.maxRetakes
          }
        }
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: instructor.id,
        action: 'QUIZ_CREATED',
        details: `Created quiz "${body.title}" for lesson "${lesson.title}"`,
        metadata: {
          quizId: quiz.id,
          lessonId: body.lessonId,
          courseId: quiz.lesson.chapter.course.id,
          questionCount: body.questions.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questionCount: quiz.questions.length,
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        courseId: quiz.lesson.chapter.course.id,
        courseName: quiz.lesson.chapter.course.title
      }
    })
  } catch (error) {
    console.error('Error creating quiz:', error)
    return NextResponse.json(
      { error: 'Failed to create quiz' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructor(request)
    if (!instructor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 })
    }

    // Get existing quiz for the lesson
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        lesson: {
          include: {
            chapter: {
              include: {
                course: {
                  select: { id: true, title: true, instructorId: true }
                }
              }
            }
          }
        },
        _count: {
          select: { attempts: true }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json({ quiz: null })
    }

    // Verify instructor owns the course
    if (quiz.lesson.chapter.course.instructorId !== instructor.id && instructor.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Parse JSON fields
    const questionsWithParsedData = quiz.questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
      correctAnswer: q.correctAnswer.startsWith('[')
        ? JSON.parse(q.correctAnswer)
        : q.correctAnswer
    }))

    return NextResponse.json({
      quiz: {
        ...quiz,
        questions: questionsWithParsedData,
        metadata: quiz.metadata || {},
        attemptCount: quiz._count.attempts
      }
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