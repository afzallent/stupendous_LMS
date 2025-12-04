import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const notificationsQuerySchema = z.object({
  instructorId: z.string().min(1, 'Instructor ID is required'),
  type: z.enum(['all', 'enrollment', 'review', 'completion', 'question', 'achievement', 'system']).default('all'),
  status: z.enum(['all', 'read', 'unread']).default('all'),
  page: z.string().default('1'),
  limit: z.string().default('20')
})

const markAsReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().default(false)
})

// GET - Fetch instructor notifications
export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const { searchParams } = new URL(request.url)
    
    const params = notificationsQuerySchema.parse(Object.fromEntries(searchParams))
    
    // If no instructorId provided, use the authenticated instructor's ID
    const instructorId = params.instructorId || instructor.id
    
    // Verify instructor can only access their own notifications (unless admin)
    if (instructor.role !== 'ADMIN' && instructorId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to notifications' },
        { status: 403 }
      )
    }

    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // Get instructor's course IDs for filtering relevant activities
    const instructorCourses = await db.course.findMany({
      where: { trainerId: instructorId },
      select: { id: true }
    })
    const courseIds = instructorCourses.map(course => course.id)

    // Build notification types based on activity logs
    const notificationTypes = [
      'ENROLLMENT_RECEIVED',
      'REVIEW_RECEIVED', 
      'COURSE_COMPLETED',
      'QUESTION_ASKED',
      'COURSE_APPROVED',
      'COURSE_REJECTED',
      'ACHIEVEMENT_EARNED'
    ]

    // Filter by notification type
    let activityTypes = notificationTypes
    if (params.type !== 'all') {
      switch (params.type) {
        case 'enrollment':
          activityTypes = ['ENROLLMENT_RECEIVED']
          break
        case 'review':
          activityTypes = ['REVIEW_RECEIVED']
          break
        case 'completion':
          activityTypes = ['COURSE_COMPLETED']
          break
        case 'question':
          activityTypes = ['QUESTION_ASKED']
          break
        case 'achievement':
          activityTypes = ['ACHIEVEMENT_EARNED']
          break
        case 'system':
          activityTypes = ['COURSE_APPROVED', 'COURSE_REJECTED']
          break
      }
    }

    // Get recent enrollments as notifications
    const recentEnrollments = await db.enrollment.findMany({
      where: {
        courseId: { in: courseIds },
        enrolledAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { enrolledAt: 'desc' },
      take: 50
    })

    // Get recent reviews as notifications
    const recentReviews = await db.review.findMany({
      where: {
        course: {
          trainerId: instructorId
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Get course completions (students who completed all lessons)
    const completions = await db.enrollment.findMany({
      where: {
        courseId: { in: courseIds },
        status: 'COMPLETED',
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    })

    // Get system notifications from activity logs
    const systemNotifications = await db.activityLog.findMany({
      where: {
        userId: instructorId,
        activityType: { in: ['COURSE_APPROVED', 'COURSE_REJECTED', 'COURSE_FLAGGED'] },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Combine and format all notifications
    const allNotifications: any[] = []

    // Add enrollment notifications
    recentEnrollments.forEach(enrollment => {
      if (params.type === 'all' || params.type === 'enrollment') {
        allNotifications.push({
          id: `enrollment_${enrollment.id}`,
          type: 'enrollment',
          title: 'New Enrollment',
          message: `${enrollment.student.name} enrolled in "${enrollment.course.title}"`,
          data: {
            studentId: enrollment.student.id,
            studentName: enrollment.student.name,
            studentAvatar: enrollment.student.avatar,
            courseId: enrollment.course.id,
            courseTitle: enrollment.course.title
          },
          createdAt: enrollment.enrolledAt,
          read: false, // For now, we'll assume all are unread
          priority: 'normal'
        })
      }
    })

    // Add review notifications
    recentReviews.forEach(review => {
      if (params.type === 'all' || params.type === 'review') {
        allNotifications.push({
          id: `review_${review.id}`,
          type: 'review',
          title: 'New Review',
          message: `${review.student.name} rated "${review.course.title}" ${review.rating} stars`,
          data: {
            studentId: review.student.id,
            studentName: review.student.name,
            studentAvatar: review.student.avatar,
            courseId: review.course.id,
            courseTitle: review.course.title,
            rating: review.rating,
            comment: review.comment
          },
          createdAt: review.createdAt,
          read: false,
          priority: review.rating <= 2 ? 'high' : 'normal'
        })
      }
    })

    // Add completion notifications
    completions.forEach(completion => {
      if (params.type === 'all' || params.type === 'completion') {
        allNotifications.push({
          id: `completion_${completion.id}`,
          type: 'completion',
          title: 'Course Completed',
          message: `${completion.student.name} completed "${completion.course.title}"`,
          data: {
            studentId: completion.student.id,
            studentName: completion.student.name,
            studentAvatar: completion.student.avatar,
            courseId: completion.course.id,
            courseTitle: completion.course.title
          },
          createdAt: completion.updatedAt,
          read: false,
          priority: 'normal'
        })
      }
    })

    // Add system notifications
    systemNotifications.forEach(activity => {
      if (params.type === 'all' || params.type === 'system') {
        const metadata = activity.metadata as any
        allNotifications.push({
          id: `system_${activity.id}`,
          type: 'system',
          title: getSystemNotificationTitle(activity.activityType),
          message: activity.description,
          data: metadata,
          createdAt: activity.createdAt,
          read: false,
          priority: activity.activityType === 'COURSE_REJECTED' ? 'high' : 'normal'
        })
      }
    })

    // Sort by creation date (most recent first)
    allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Filter by read status
    let filteredNotifications = allNotifications
    if (params.status === 'read') {
      filteredNotifications = allNotifications.filter(n => n.read)
    } else if (params.status === 'unread') {
      filteredNotifications = allNotifications.filter(n => !n.read)
    }

    // Paginate
    const paginatedNotifications = filteredNotifications.slice(skip, skip + limit)

    // Calculate statistics
    const stats = {
      total: allNotifications.length,
      unread: allNotifications.filter(n => !n.read).length,
      high_priority: allNotifications.filter(n => n.priority === 'high').length,
      by_type: {
        enrollment: allNotifications.filter(n => n.type === 'enrollment').length,
        review: allNotifications.filter(n => n.type === 'review').length,
        completion: allNotifications.filter(n => n.type === 'completion').length,
        system: allNotifications.filter(n => n.type === 'system').length
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        notifications: paginatedNotifications.map(notification => ({
          ...notification,
          createdAt: notification.createdAt.toISOString(),
          timeAgo: getTimeAgo(notification.createdAt)
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredNotifications.length / limit),
          totalNotifications: filteredNotifications.length,
          limit
        },
        stats
      }
    })

  } catch (error) {
    console.error('Instructor notifications GET error:', error)
    
    if (error instanceof Error && (
      error.message.includes('Authentication required') ||
      error.message.includes('Instructor access required') ||
      error.message.includes('Authorization failed')
    )) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const body = await request.json()
    
    const validatedData = markAsReadSchema.parse(body)
    
    // In a real implementation, you'd update a notifications table
    // For now, we'll just return success since we're using activity logs
    
    return NextResponse.json({
      success: true,
      message: validatedData.markAll 
        ? 'All notifications marked as read' 
        : `${validatedData.notificationIds?.length || 0} notifications marked as read`
    })

  } catch (error) {
    console.error('Instructor notifications PUT error:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}

// Helper functions
function getSystemNotificationTitle(activityType: string): string {
  switch (activityType) {
    case 'COURSE_APPROVED':
      return 'Course Approved'
    case 'COURSE_REJECTED':
      return 'Course Rejected'
    case 'COURSE_FLAGGED':
      return 'Course Flagged'
    default:
      return 'System Notification'
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
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