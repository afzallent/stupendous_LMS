import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schemas
const updateCourseSchema = z.object({
  courseId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'flag', 'unflag', 'archive']),
  reason: z.string().optional(),
  adminNotes: z.string().optional()
})

const courseQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'draft', 'published', 'archived']).optional(),
  instructor: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
})

// GET - List courses with filters and pagination
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await verifyAdminAccess(request)

    const { searchParams } = new URL(request.url)
    const params = courseQuerySchema.parse(Object.fromEntries(searchParams))
    
    const page = parseInt(params.page || '1')
    const limit = parseInt(params.limit || '20')
    const skip = (page - 1) * limit

    // Build where clause
    let whereClause: any = {}

    // Search filter
    if (params.search) {
      whereClause.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { trainer: { name: { contains: params.search, mode: 'insensitive' } } }
      ]
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      whereClause.status = params.status.toUpperCase()
    }

    // Instructor filter
    if (params.instructor) {
      whereClause.trainerId = params.instructor
    }

    // Get courses with related data
    const [courses, totalCourses] = await Promise.all([
      prisma.course.findMany({
        where: whereClause,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          category: {
            select: {
              name: true,
              icon: true
            }
          },
          _count: {
            select: {
              enrollments: true,
              reviews: true,
              lessons: true
            }
          },
          reviews: {
            select: { rating: true }
          },
          payments: {
            where: { status: 'COMPLETED' },
            select: { amount: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.course.count({ where: whereClause })
    ])

    // Transform course data
    const transformedCourses = courses.map(course => {
      const totalRevenue = course.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const averageRating = course.reviews.length > 0 
        ? course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length 
        : 0

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        instructor: {
          id: course.trainer.id,
          name: course.trainer.name || 'Unknown',
          email: course.trainer.email,
          avatar: course.trainer.avatar
        },
        category: course.category?.name || 'Uncategorized',
        status: course.status.toLowerCase(),
        price: course.price,
        thumbnail: course.thumbnail,
        level: course.level,
        language: course.language,
        students: course._count.enrollments,
        revenue: totalRevenue,
        rating: Math.round(averageRating * 10) / 10,
        totalReviews: course._count.reviews,
        totalLessons: course._count.lessons,
        createdAt: course.createdAt.toISOString().split('T')[0],
        updatedAt: course.updatedAt.toISOString().split('T')[0],
        publishedAt: course.publishedAt?.toISOString().split('T')[0] || null
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        courses: transformedCourses,
        pagination: {
          page,
          limit,
          total: totalCourses,
          pages: Math.ceil(totalCourses / limit)
        }
      }
    })

  } catch (error) {
    console.error("Admin courses GET API error:", error)
    
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update course status (approve, reject, flag, etc.)
export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const adminUser = await verifyAdminAccess(request)

    const body = await request.json()
    const validatedData = updateCourseSchema.parse(body)

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: validatedData.courseId },
      include: {
        trainer: {
          select: { name: true, email: true }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    let updateData: any = {}
    let activityDescription = ''

    // Handle different actions
    switch (validatedData.action) {
      case 'approve':
        updateData.status = 'PUBLISHED'
        updateData.publishedAt = new Date()
        activityDescription = `Approved course: ${course.title}`
        break
        
      case 'reject':
        updateData.status = 'DRAFT'
        activityDescription = `Rejected course: ${course.title}${validatedData.reason ? ` - Reason: ${validatedData.reason}` : ''}`
        break
        
      case 'flag':
        updateData.status = 'ARCHIVED' // Using ARCHIVED as flagged for now
        activityDescription = `Flagged course: ${course.title}${validatedData.reason ? ` - Reason: ${validatedData.reason}` : ''}`
        break
        
      case 'unflag':
        updateData.status = 'PUBLISHED'
        activityDescription = `Unflagged course: ${course.title}`
        break
        
      case 'archive':
        updateData.status = 'ARCHIVED'
        activityDescription = `Archived course: ${course.title}`
        break
    }

    // Update course
    const updatedCourse = await prisma.course.update({
      where: { id: validatedData.courseId },
      data: updateData,
      include: {
        trainer: {
          select: { name: true, email: true }
        }
      }
    })

    // Log admin activity
    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        activityType: 'COURSE_MANAGEMENT',
        description: activityDescription,
        metadata: {
          courseId: course.id,
          courseTitle: course.title,
          instructorId: course.trainerId,
          instructorName: course.trainer.name,
          action: validatedData.action,
          reason: validatedData.reason,
          adminNotes: validatedData.adminNotes,
          previousStatus: course.status,
          newStatus: updateData.status
        }
      }
    })

    // If approving a course, also create activity log for the instructor
    if (validatedData.action === 'approve') {
      await prisma.activityLog.create({
        data: {
          userId: course.trainerId,
          activityType: 'COURSE_APPROVED',
          description: `Your course "${course.title}" has been approved and published`,
          metadata: {
            courseId: course.id,
            courseTitle: course.title,
            approvedBy: adminUser.name || adminUser.email
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Course ${validatedData.action}d successfully`,
      data: {
        course: {
          id: updatedCourse.id,
          title: updatedCourse.title,
          status: updatedCourse.status,
          publishedAt: updatedCourse.publishedAt
        }
      }
    })

  } catch (error) {
    console.error("Admin courses PUT API error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}