import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * GET - Check if user is enrolled in a specific course
 * Query params: courseId, userId
 */
export async function GET(request: NextRequest) {
  try {
    // Get user info from middleware headers
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const requestedUserId = searchParams.get('userId')

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Verify user can only check their own enrollment (unless admin/trainer)
    if (requestedUserId && requestedUserId !== userId && !['ADMIN', 'TRAINER'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Can only check your own enrollment' },
        { status: 403 }
      )
    }

    const targetUserId = requestedUserId || userId

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        status: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: targetUserId,
          courseId: courseId
        }
      },
      select: {
        id: true,
        courseId: true,
        progress: true,
        enrolledAt: true
      }
    })

    // Count completed lessons for this enrollment
    let completedLessons = 0
    if (enrollment) {
      completedLessons = await prisma.progress.count({
        where: {
          studentId: targetUserId,
          lesson: {
            courseId: courseId
          },
          completed: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        enrolled: !!enrollment,
        enrollment: enrollment ? {
          ...enrollment,
          completedLessons
        } : null,
        course: {
          id: course.id,
          title: course.title,
          status: course.status
        }
      }
    })

  } catch (error) {
    console.error('Enrollment check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}