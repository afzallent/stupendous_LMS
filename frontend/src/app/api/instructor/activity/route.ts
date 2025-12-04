import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const instructorId = searchParams.get('instructorId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!instructorId) {
      return NextResponse.json(
        { error: "Instructor ID is required" },
        { status: 400 }
      )
    }

    // Get recent activities for the instructor
    const activities = await prisma.activityLog.findMany({
      where: {
        userId: instructorId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    })

    // Get recent enrollments for instructor's courses
    const enrollments = await prisma.enrollment.findMany({
      where: {
        course: {
          trainerId: instructorId
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        student: {
          select: {
            name: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      }
    })

    // Get recent reviews for instructor's courses
    const reviews = await prisma.review.findMany({
      where: {
        course: {
          trainerId: instructorId
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        student: {
          select: {
            name: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      }
    })

    // Transform and combine all activities
    const allActivities = [
      // Course publishing and other instructor activities
      ...activities.map(activity => ({
        id: `activity_${activity.id}`,
        type: activity.activityType.toLowerCase(),
        description: activity.description,
        course: activity.metadata ? (activity.metadata as any).courseTitle : null,
        student: null,
        rating: null,
        timestamp: activity.createdAt,
        relativeTime: getRelativeTime(activity.createdAt)
      })),
      
      // Student enrollments
      ...enrollments.map(enrollment => ({
        id: `enrollment_${enrollment.id}`,
        type: 'enrollment',
        description: `New enrollment in ${enrollment.course.title}`,
        course: enrollment.course.title,
        student: enrollment.student.name,
        rating: null,
        timestamp: enrollment.createdAt,
        relativeTime: getRelativeTime(enrollment.createdAt)
      })),
      
      // Course reviews
      ...reviews.map(review => ({
        id: `review_${review.id}`,
        type: 'review',
        description: `New review for ${review.course.title}`,
        course: review.course.title,
        student: review.student.name,
        rating: review.rating,
        timestamp: review.createdAt,
        relativeTime: getRelativeTime(review.createdAt)
      }))
    ]

    // Sort by timestamp and take the most recent
    const sortedActivities = allActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: sortedActivities
    })

  } catch (error) {
    console.error("Activity log API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}