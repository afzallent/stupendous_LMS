import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const sendMessageSchema = z.object({
  type: z.enum(['direct', 'announcement']),
  recipientId: z.string().optional(), // For direct messages
  courseId: z.string().optional(), // For announcements to course students
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL')
})

const messagesQuerySchema = z.object({
  instructorId: z.string().min(1, 'Instructor ID is required'),
  type: z.enum(['all', 'direct', 'announcement']).default('all'),
  status: z.enum(['all', 'sent', 'read', 'unread']).default('all'),
  page: z.string().default('1'),
  limit: z.string().default('20')
})

// GET - Fetch instructor messages
export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const { searchParams } = new URL(request.url)
    
    const params = messagesQuerySchema.parse(Object.fromEntries(searchParams))
    
    // If no instructorId provided, use the authenticated instructor's ID
    const instructorId = params.instructorId || instructor.id
    
    // Verify instructor can only access their own messages (unless admin)
    if (instructor.role !== 'ADMIN' && instructorId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to messages' },
        { status: 403 }
      )
    }

    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // For now, we'll use activity logs as our message store
    // In a real implementation, you'd have a dedicated messages/notifications table
    
    // Build where clause for activity logs that represent messages
    const whereClause: any = {
      userId: instructorId,
      activityType: {
        in: ['STUDENT_MESSAGE_SENT', 'COURSE_ANNOUNCEMENT_SENT']
      }
    }

    // Filter by message type
    if (params.type === 'direct') {
      whereClause.activityType = 'STUDENT_MESSAGE_SENT'
    } else if (params.type === 'announcement') {
      whereClause.activityType = 'COURSE_ANNOUNCEMENT_SENT'
    }

    // Get messages from activity logs
    const [messages, totalMessages] = await Promise.all([
      db.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      db.activityLog.count({ where: whereClause })
    ])

    // Format messages
    const formattedMessages = await Promise.all(messages.map(async (activity) => {
      const metadata = activity.metadata as any
      
      let recipientInfo = null
      let courseInfo = null
      
      if (metadata?.studentId) {
        // Get student info for direct messages
        const student = await db.user.findUnique({
          where: { id: metadata.studentId },
          select: { name: true, email: true }
        })
        recipientInfo = student
      }
      
      if (metadata?.courseId) {
        // Get course info
        const course = await db.course.findUnique({
          where: { id: metadata.courseId },
          select: { title: true }
        })
        courseInfo = course
      }
      
      return {
        id: activity.id,
        type: activity.activityType === 'STUDENT_MESSAGE_SENT' ? 'direct' : 'announcement',
        subject: metadata?.subject || 'No Subject',
        message: metadata?.message || activity.description,
        priority: metadata?.priority || 'NORMAL',
        status: 'sent', // We'll assume all messages are sent for now
        createdAt: activity.createdAt.toISOString(),
        recipient: recipientInfo,
        course: courseInfo,
        readCount: metadata?.readCount || 0,
        totalRecipients: metadata?.totalRecipients || 1
      }
    }))

    // Get message statistics
    const messageStats = await db.activityLog.groupBy({
      by: ['activityType'],
      where: {
        userId: instructorId,
        activityType: {
          in: ['STUDENT_MESSAGE_SENT', 'COURSE_ANNOUNCEMENT_SENT']
        }
      },
      _count: {
        activityType: true
      }
    })

    const stats = {
      totalMessages,
      directMessages: messageStats.find(s => s.activityType === 'STUDENT_MESSAGE_SENT')?._count.activityType || 0,
      announcements: messageStats.find(s => s.activityType === 'COURSE_ANNOUNCEMENT_SENT')?._count.activityType || 0
    }

    return NextResponse.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMessages / limit),
          totalMessages,
          limit
        },
        stats
      }
    })

  } catch (error) {
    console.error('Instructor messages GET error:', error)
    
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
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Send message or announcement
export async function POST(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const body = await request.json()
    
    const validatedData = sendMessageSchema.parse(body)
    
    let recipientCount = 0
    let recipients: string[] = []
    
    if (validatedData.type === 'direct') {
      // Direct message to specific student
      if (!validatedData.recipientId) {
        return NextResponse.json(
          { success: false, error: 'Recipient ID is required for direct messages' },
          { status: 400 }
        )
      }
      
      // Verify student is enrolled in instructor's course
      const enrollment = await db.enrollment.findFirst({
        where: {
          studentId: validatedData.recipientId,
          course: {
            trainerId: instructor.id
          }
        },
        include: {
          student: {
            select: { name: true, email: true }
          },
          course: {
            select: { title: true }
          }
        }
      })
      
      if (!enrollment) {
        return NextResponse.json(
          { success: false, error: 'Student not found in your courses' },
          { status: 404 }
        )
      }
      
      recipients = [validatedData.recipientId]
      recipientCount = 1
      
      // Log direct message
      await db.activityLog.create({
        data: {
          userId: instructor.id,
          activityType: 'STUDENT_MESSAGE_SENT',
          description: `Sent direct message to ${enrollment.student.name}: ${validatedData.subject}`,
          metadata: {
            type: 'direct',
            studentId: validatedData.recipientId,
            studentName: enrollment.student.name,
            studentEmail: enrollment.student.email,
            courseId: enrollment.courseId,
            courseTitle: enrollment.course.title,
            subject: validatedData.subject,
            message: validatedData.message,
            priority: validatedData.priority
          }
        }
      })
      
    } else if (validatedData.type === 'announcement') {
      // Announcement to all students in a course
      if (!validatedData.courseId) {
        return NextResponse.json(
          { success: false, error: 'Course ID is required for announcements' },
          { status: 400 }
        )
      }
      
      // Verify course belongs to instructor
      const course = await db.course.findUnique({
        where: { 
          id: validatedData.courseId,
          trainerId: instructor.id
        },
        include: {
          enrollments: {
            include: {
              student: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      })
      
      if (!course) {
        return NextResponse.json(
          { success: false, error: 'Course not found or unauthorized' },
          { status: 404 }
        )
      }
      
      recipients = course.enrollments.map(e => e.student.id)
      recipientCount = recipients.length
      
      // Log announcement
      await db.activityLog.create({
        data: {
          userId: instructor.id,
          activityType: 'COURSE_ANNOUNCEMENT_SENT',
          description: `Sent announcement to ${course.title} (${recipientCount} students): ${validatedData.subject}`,
          metadata: {
            type: 'announcement',
            courseId: validatedData.courseId,
            courseTitle: course.title,
            subject: validatedData.subject,
            message: validatedData.message,
            priority: validatedData.priority,
            totalRecipients: recipientCount,
            recipients: recipients
          }
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `${validatedData.type === 'direct' ? 'Message' : 'Announcement'} sent successfully`,
      data: {
        type: validatedData.type,
        recipientCount,
        subject: validatedData.subject,
        priority: validatedData.priority
      }
    })

  } catch (error) {
    console.error('Instructor message send error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}