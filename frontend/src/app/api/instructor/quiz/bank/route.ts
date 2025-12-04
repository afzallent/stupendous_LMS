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
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}

    if (instructor.role === 'TRAINER') {
      // For instructors, only show their own questions
      whereClause.quiz = {
        lesson: {
          chapter: {
            course: {
              instructorId: instructor.id
            }
          }
        }
      }
    }

    if (courseId) {
      whereClause.quiz = {
        ...whereClause.quiz,
        lesson: {
          chapter: {
            courseId
          }
        }
      }
    }

    if (type) {
      whereClause.type = type
    }

    if (search) {
      whereClause.question = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Fetch questions with course and lesson info
    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: whereClause,
        include: {
          quiz: {
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
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.question.count({ where: whereClause })
    ])

    // Format questions for response
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      points: q.points,
      options: q.options ? JSON.parse(q.options) : null,
      correctAnswer: q.correctAnswer.startsWith('[')
        ? JSON.parse(q.correctAnswer)
        : q.correctAnswer,
      explanation: q.explanation,
      courseId: q.quiz.lesson.chapter.course.id,
      courseName: q.quiz.lesson.chapter.course.title,
      chapterName: q.quiz.lesson.chapter.title,
      lessonName: q.quiz.lesson.title,
      quizId: q.quiz.id,
      quizTitle: q.quiz.title,
      createdAt: q.createdAt,
      usage: 1 // In future, track how many times question is used
    }))

    // Get question type distribution
    const typeDistribution = await prisma.question.groupBy({
      by: ['type'],
      where: whereClause,
      _count: true
    })

    return NextResponse.json({
      questions: formattedQuestions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics: {
        total,
        typeDistribution: typeDistribution.map(t => ({
          type: t.type,
          count: t._count
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching question bank:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question bank' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    const instructor = await verifyInstructor(request)
    if (!instructor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.sourceQuestionId || !body.targetQuizId) {
      return NextResponse.json(
        { error: 'Source question ID and target quiz ID are required' },
        { status: 400 }
      )
    }

    // Fetch source question
    const sourceQuestion = await prisma.question.findUnique({
      where: { id: body.sourceQuestionId },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                chapter: {
                  include: {
                    course: {
                      select: { instructorId: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!sourceQuestion) {
      return NextResponse.json({ error: 'Source question not found' }, { status: 404 })
    }

    // Verify instructor owns the source question
    if (sourceQuestion.quiz.lesson.chapter.course.instructorId !== instructor.id &&
        instructor.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to copy this question' },
        { status: 403 }
      )
    }

    // Fetch target quiz
    const targetQuiz = await prisma.quiz.findUnique({
      where: { id: body.targetQuizId },
      include: {
        lesson: {
          include: {
            chapter: {
              include: {
                course: {
                  select: { instructorId: true }
                }
              }
            }
          }
        },
        questions: {
          select: { order: true },
          orderBy: { order: 'desc' },
          take: 1
        }
      }
    })

    if (!targetQuiz) {
      return NextResponse.json({ error: 'Target quiz not found' }, { status: 404 })
    }

    // Verify instructor owns the target quiz
    if (targetQuiz.lesson.chapter.course.instructorId !== instructor.id &&
        instructor.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to add questions to this quiz' },
        { status: 403 }
      )
    }

    // Determine the order for the new question
    const nextOrder = targetQuiz.questions.length > 0
      ? targetQuiz.questions[0].order + 1
      : 0

    // Create a copy of the question in the target quiz
    const newQuestion = await prisma.question.create({
      data: {
        quizId: body.targetQuizId,
        question: body.question || sourceQuestion.question,
        type: sourceQuestion.type,
        options: sourceQuestion.options,
        correctAnswer: sourceQuestion.correctAnswer,
        points: body.points || sourceQuestion.points,
        explanation: body.explanation || sourceQuestion.explanation,
        order: nextOrder
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: instructor.id,
        action: 'QUESTION_COPIED',
        details: `Copied question to quiz "${targetQuiz.title}"`,
        metadata: {
          sourceQuestionId: sourceQuestion.id,
          targetQuizId: targetQuiz.id,
          newQuestionId: newQuestion.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      question: {
        id: newQuestion.id,
        question: newQuestion.question,
        type: newQuestion.type,
        quizTitle: targetQuiz.title
      }
    })
  } catch (error) {
    console.error('Error copying question:', error)
    return NextResponse.json(
      { error: 'Failed to copy question' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const instructor = await verifyInstructor(request)
    if (!instructor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    // Fetch question with quiz info
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                chapter: {
                  include: {
                    course: {
                      select: { instructorId: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Verify instructor owns the question
    if (question.quiz.lesson.chapter.course.instructorId !== instructor.id &&
        instructor.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized to delete this question' },
        { status: 403 }
      )
    }

    // Delete the question (cascade will handle related records)
    await prisma.question.delete({
      where: { id: questionId }
    })

    // Reorder remaining questions
    const remainingQuestions = await prisma.question.findMany({
      where: { quizId: question.quizId },
      orderBy: { order: 'asc' }
    })

    // Update order for remaining questions
    await Promise.all(
      remainingQuestions.map((q, index) =>
        prisma.question.update({
          where: { id: q.id },
          data: { order: index }
        })
      )
    )

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: instructor.id,
        action: 'QUESTION_DELETED',
        details: `Deleted question from quiz "${question.quiz.title}"`,
        metadata: {
          questionId,
          quizId: question.quizId
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}