import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const instructorId = searchParams.get('instructorId')
    const courseId = params.courseId

    if (!instructorId) {
      return NextResponse.json(
        { success: false, error: 'Instructor ID is required' },
        { status: 400 }
      )
    }

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Fetch the course with all related data
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        trainerId: instructorId // Ensure instructor owns this course
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        chapters: {
          include: {
            lessons: {
              orderBy: {
                order: 'asc'
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found or access denied' },
        { status: 404 }
      )
    }

    // Transform the data to match frontend expectations
    const transformedCourse = {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      price: course.price,
      status: course.status,
      level: course.level,
      language: course.language || 'English',
      thumbnailUrl: course.thumbnailUrl,
      targetAudience: course.targetAudience,
      learningObjectives: course.learningObjectives ? 
        (Array.isArray(course.learningObjectives) ? 
          course.learningObjectives : 
          JSON.parse(course.learningObjectives as string)
        ) : [''],
      requirements: course.requirements ? 
        (Array.isArray(course.requirements) ? 
          course.requirements : 
          JSON.parse(course.requirements as string)
        ) : [''],
      category: course.category,
      trainer: course.trainer,
      chapters: course.chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        lessons: chapter.lessons.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          duration: lesson.duration,
          order: lesson.order,
          videoUrl: lesson.videoUrl,
          resources: lesson.resources ? 
            (Array.isArray(lesson.resources) ? 
              lesson.resources : 
              JSON.parse(lesson.resources as string)
            ) : []
        }))
      })),
      enrollmentCount: course._count.enrollments,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: transformedCourse
    })

  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const instructorId = searchParams.get('instructorId')
    const courseId = params.courseId
    const body = await request.json()

    if (!instructorId) {
      return NextResponse.json(
        { success: false, error: 'Instructor ID is required' },
        { status: 400 }
      )
    }

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Verify instructor owns the course
    const existingCourse = await prisma.course.findUnique({
      where: {
        id: courseId,
        trainerId: instructorId
      }
    })

    if (!existingCourse) {
      return NextResponse.json(
        { success: false, error: 'Course not found or access denied' },
        { status: 404 }
      )
    }

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: {
        id: courseId
      },
      data: {
        title: body.title,
        subtitle: body.subtitle,
        description: body.description,
        price: body.price ? parseFloat(body.price) : null,
        level: body.level,
        language: body.language,
        thumbnailUrl: body.thumbnailUrl,
        targetAudience: body.targetAudience,
        learningObjectives: JSON.stringify(body.learningObjectives || []),
        requirements: JSON.stringify(body.requirements || []),
        categoryId: body.categoryId,
        updatedAt: new Date()
      },
      include: {
        category: true,
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedCourse
    })

  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}