import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const studentsQuerySchema = z.object({
  instructorId: z.string().min(1, 'Instructor ID is required'),
  courseId: z.string().optional(),
  status: z.enum(['all', 'active', 'at-risk', 'completed', 'inactive']).default('all'),
  search: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('20'),
  sortBy: z.enum(['name', 'progress', 'lastActive', 'enrolledAt']).default('lastActive'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// GET - Fetch instructor's students with comprehensive data
export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const { searchParams } = new URL(request.url)
    
    const params = studentsQuerySchema.parse(Object.fromEntries(searchParams))
    
    // If no instructorId provided, use the authenticated instructor's ID
    const instructorId = params.instructorId || instructor.id
    
    // Verify instructor can only access their own students (unless admin)
    if (instructor.role !== 'ADMIN' && instructorId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to student data' },
        { status: 403 }
      )
    }

    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // Build course filter
    const courseFilter: any = { trainerId: instructorId }
    if (params.courseId) {
      courseFilter.id = params.courseId
    }

    // Get instructor's courses
    const instructorCourses = await db.course.findMany({
      where: courseFilter,
      select: { id: true, title: true }
    })

    const courseIds = instructorCourses.map(course => course.id)

    if (courseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          students: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalStudents: 0,
            limit
          },
          stats: {
            totalStudents: 0,
            activeStudents: 0,
            atRiskStudents: 0,
            completedStudents: 0,
            averageProgress: 0
          },
          atRiskStudents: [],
          topPerformers: []
        }
      })
    }

    // Build where clause for enrollments
    const enrollmentWhere: any = {
      courseId: { in: courseIds }
    }

    // Add search filter
    if (params.search) {
      enrollmentWhere.student = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } }
        ]
      }
    }

    // Get all enrollments for filtering
    const allEnrollments = await db.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        },
        progress: {
          orderBy: { updatedAt: 'desc' },
          take: 1
        }
      }
    })

    // Calculate progress and activity for each enrollment
    const studentsData = allEnrollments.map(enrollment => {
      const latestProgress = enrollment.progress[0]
      const progressPercentage = latestProgress?.progressPercentage || 0
      const lastActiveDate = latestProgress?.updatedAt || enrollment.enrolledAt
      const daysSinceLastActive = Math.floor(
        (new Date().getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Determine status
      let status: string
      if (progressPercentage >= 100) {
        status = 'completed'
      } else if (daysSinceLastActive > 7 && progressPercentage < 25) {
        status = 'at-risk'
      } else if (daysSinceLastActive <= 7) {
        status = 'active'
      } else {
        status = 'inactive'
      }

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        studentName: enrollment.student.name,
        studentEmail: enrollment.student.email,
        studentAvatar: enrollment.student.avatar,
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.title,
        enrolledAt: enrollment.enrolledAt,
        lastActive: lastActiveDate,
        daysSinceLastActive,
        progress: progressPercentage,
        status,
        completionDate: progressPercentage >= 100 ? lastActiveDate : null
      }
    })

    // Filter by status
    let filteredStudents = studentsData
    if (params.status !== 'all') {
      filteredStudents = studentsData.filter(student => student.status === params.status)
    }

    // Sort students
    filteredStudents.sort((a, b) => {
      let aValue, bValue
      switch (params.sortBy) {
        case 'name':
          aValue = a.studentName
          bValue = b.studentName
          break
        case 'progress':
          aValue = a.progress
          bValue = b.progress
          break
        case 'lastActive':
          aValue = a.lastActive.getTime()
          bValue = b.lastActive.getTime()
          break
        case 'enrolledAt':
          aValue = a.enrolledAt.getTime()
          bValue = b.enrolledAt.getTime()
          break
        default:
          aValue = a.lastActive.getTime()
          bValue = b.lastActive.getTime()
      }

      if (params.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Paginate results
    const paginatedStudents = filteredStudents.slice(skip, skip + limit)

    // Calculate statistics
    const stats = {
      totalStudents: studentsData.length,
      activeStudents: studentsData.filter(s => s.status === 'active').length,
      atRiskStudents: studentsData.filter(s => s.status === 'at-risk').length,
      completedStudents: studentsData.filter(s => s.status === 'completed').length,
      averageProgress: studentsData.length > 0 
        ? Math.round(studentsData.reduce((sum, s) => sum + s.progress, 0) / studentsData.length)
        : 0
    }

    // Get at-risk students (students with low progress and inactive)
    const atRiskStudents = studentsData
      .filter(student => student.status === 'at-risk')
      .sort((a, b) => a.progress - b.progress) // Sort by lowest progress first
      .slice(0, 10)
      .map(student => ({
        id: student.studentId,
        name: student.studentName,
        email: student.studentEmail,
        avatar: student.studentAvatar,
        course: student.courseTitle,
        progress: student.progress,
        lastActive: student.lastActive.toISOString(),
        daysSinceLastActive: student.daysSinceLastActive,
        enrolledAt: student.enrolledAt.toISOString()
      }))

    // Get top performers (students with high progress)
    const topPerformers = studentsData
      .filter(student => student.progress > 50)
      .sort((a, b) => b.progress - a.progress) // Sort by highest progress first
      .slice(0, 10)
      .map(student => ({
        id: student.studentId,
        name: student.studentName,
        email: student.studentEmail,
        avatar: student.studentAvatar,
        course: student.courseTitle,
        progress: student.progress,
        lastActive: student.lastActive.toISOString(),
        daysSinceLastActive: student.daysSinceLastActive,
        enrolledAt: student.enrolledAt.toISOString(),
        completionTime: student.status === 'completed' && student.completionDate
          ? Math.floor((student.completionDate.getTime() - student.enrolledAt.getTime()) / (1000 * 60 * 60 * 24))
          : null
      }))

    // Format paginated results
    const formattedStudents = paginatedStudents.map(student => ({
      enrollmentId: student.enrollmentId,
      student: {
        id: student.studentId,
        name: student.studentName,
        email: student.studentEmail,
        avatar: student.studentAvatar
      },
      course: {
        id: student.courseId,
        title: student.courseTitle
      },
      enrolledAt: student.enrolledAt.toISOString(),
      lastActive: student.lastActive.toISOString(),
      daysSinceLastActive: student.daysSinceLastActive,
      progress: student.progress,
      status: student.status,
      completionDate: student.completionDate?.toISOString() || null
    }))

    return NextResponse.json({
      success: true,
      data: {
        students: formattedStudents,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredStudents.length / limit),
          totalStudents: filteredStudents.length,
          limit
        },
        stats,
        atRiskStudents,
        topPerformers
      }
    })

  } catch (error) {
    console.error('Instructor students API error:', error)
    
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
      { success: false, error: 'Failed to fetch students data' },
      { status: 500 }
    )
  }
}

// PUT - Update student status or send message
export async function PUT(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const body = await request.json()
    
    const updateSchema = z.object({
      enrollmentId: z.string().min(1, 'Enrollment ID is required'),
      action: z.enum(['message', 'note']),
      message: z.string().min(1, 'Message is required'),
      isPrivate: z.boolean().default(true)
    })
    
    const validatedData = updateSchema.parse(body)
    
    // Verify enrollment belongs to instructor's course
    const enrollment = await db.enrollment.findUnique({
      where: { id: validatedData.enrollmentId },
      include: {
        course: {
          select: {
            trainerId: true,
            title: true
          }
        },
        student: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404 }
      )
    }
    
    if (enrollment.course.trainerId !== instructor.id && instructor.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to this enrollment' },
        { status: 403 }
      )
    }
    
    // For now, we'll log the action as an activity
    // In a real implementation, you might want a messages table
    await db.activityLog.create({
      data: {
        userId: instructor.id,
        activityType: validatedData.action === 'message' ? 'STUDENT_MESSAGE_SENT' : 'STUDENT_NOTE_ADDED',
        description: `${validatedData.action === 'message' ? 'Sent message to' : 'Added note for'} ${enrollment.student.name} in course "${enrollment.course.title}"`,
        metadata: {
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          message: validatedData.message,
          isPrivate: validatedData.isPrivate
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `${validatedData.action === 'message' ? 'Message sent' : 'Note added'} successfully`
    })

  } catch (error) {
    console.error('Instructor student update error:', error)
    
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
      { success: false, error: 'Failed to update student data' },
      { status: 500 }
    )
  }
}