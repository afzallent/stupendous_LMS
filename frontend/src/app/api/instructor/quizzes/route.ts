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

export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructor(request)
    if (!instructor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // Build where clause
    const whereClause: any = {}

    if (courseId) {
      whereClause.lesson = {
        chapter: {
          courseId
        }
      }
    }

    if (instructor.role === 'TRAINER') {
      // For instructors, only show their own quizzes
      whereClause.lesson = {
        ...whereClause.lesson,
        chapter: {
          ...whereClause.lesson?.chapter,
          course: {
            instructorId: instructor.id
          }
        }
      }
    }

    // Fetch quizzes
    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        lesson: {
          include: {
            chapter: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            questions: true,
            attempts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format response
    const formattedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      passingScore: quiz.passingScore,
      courseId: quiz.lesson.chapter.course.id,
      courseName: quiz.lesson.chapter.course.title,
      chapterName: quiz.lesson.chapter.title,
      lessonId: quiz.lesson.id,
      lessonName: quiz.lesson.title,
      questionCount: quiz._count.questions,
      attemptCount: quiz._count.attempts,
      createdAt: quiz.createdAt,
      metadata: quiz.metadata
    }))

    return NextResponse.json({
      quizzes: formattedQuizzes,
      total: formattedQuizzes.length
    })
  } catch (error) {
    console.error('Error fetching quizzes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}