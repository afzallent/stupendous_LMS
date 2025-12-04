import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schema
const analyticsQuerySchema = z.object({
  instructorId: z.string().min(1, 'Instructor ID is required'),
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  courseId: z.string().optional()
})

// GET - Fetch comprehensive instructor analytics
export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const { searchParams } = new URL(request.url)
    
    const params = analyticsQuerySchema.parse(Object.fromEntries(searchParams))
    
    // If no instructorId provided, use the authenticated instructor's ID
    const instructorId = params.instructorId || instructor.id
    
    // Verify instructor can only access their own analytics (unless admin)
    if (instructor.role !== 'ADMIN' && instructorId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to analytics' },
        { status: 403 }
      )
    }
    
    // Calculate date range
    const now = new Date()
    let startDate: Date
    
    switch (params.timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    // Build course filter
    const courseFilter: any = { trainerId: instructorId }
    if (params.courseId) {
      courseFilter.id = params.courseId
    }

    // Get instructor courses
    const courses = await db.course.findMany({
      where: courseFilter,
      include: {
        enrollments: {
          include: {
            progress: true,
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            }
          }
        },
        reviews: {
          where: {
            createdAt: { gte: startDate }
          }
        },
        lessons: {
          select: {
            id: true,
            duration: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
            lessons: true
          }
        }
      }
    })

    // Calculate course performance metrics
    const coursePerformance = courses.map(course => {
      const totalStudents = course.enrollments.length
      const completedStudents = course.enrollments.filter(enrollment => {
        return enrollment.progress.some(p => p.progressPercentage >= 100)
      }).length
      
      const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0
      
      // Calculate average progress
      const totalProgress = course.enrollments.reduce((sum, enrollment) => {
        const maxProgress = Math.max(...enrollment.progress.map(p => p.progressPercentage), 0)
        return sum + maxProgress
      }, 0)
      const averageProgress = totalStudents > 0 ? totalProgress / totalStudents : 0
      
      // Calculate average rating
      const averageRating = course.reviews.length > 0 
        ? course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length 
        : 0
      
      return {
        courseId: course.id,
        courseTitle: course.title,
        totalStudents,
        completedStudents,
        completionRate: Math.round(completionRate * 10) / 10,
        averageProgress: Math.round(averageProgress * 10) / 10,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: course.reviews.length,
        totalLessons: course._count.lessons
      }
    })

    // Student progress distribution across all courses
    const allEnrollments = courses.flatMap(course => course.enrollments)
    const progressDistribution = {
      '0-25': 0,
      '26-50': 0,
      '51-75': 0,
      '76-100': 0
    }

    allEnrollments.forEach(enrollment => {
      const maxProgress = Math.max(...enrollment.progress.map(p => p.progressPercentage), 0)
      if (maxProgress <= 25) {
        progressDistribution['0-25']++
      } else if (maxProgress <= 50) {
        progressDistribution['26-50']++
      } else if (maxProgress <= 75) {
        progressDistribution['51-75']++
      } else {
        progressDistribution['76-100']++
      }
    })

    // Convert to percentages
    const totalEnrollments = allEnrollments.length
    if (totalEnrollments > 0) {
      Object.keys(progressDistribution).forEach(key => {
        const count = progressDistribution[key as keyof typeof progressDistribution]
        progressDistribution[key as keyof typeof progressDistribution] = 
          Math.round((count / totalEnrollments) * 100)
      })
    }

    // Student engagement metrics (enrollments over time)
    const enrollmentsByDay = await db.enrollment.groupBy({
      by: ['enrolledAt'],
      where: {
        course: {
          trainerId: instructorId
        },
        enrolledAt: {
          gte: startDate
        }
      },
      _count: {
        _all: true
      },
      orderBy: {
        enrolledAt: 'asc'
      }
    })

    // Format enrollment data for charts
    const enrollmentTrend = enrollmentsByDay.map(item => ({
      date: item.enrolledAt.toISOString().split('T')[0],
      enrollments: item._count._all
    }))

    // Top performing courses
    const topCourses = coursePerformance
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)

    // Review trends
    const recentReviews = await db.review.findMany({
      where: {
        course: {
          trainerId: instructorId
        },
        createdAt: {
          gte: startDate
        }
      },
      include: {
        course: {
          select: {
            title: true
          }
        },
        student: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Calculate overall metrics
    const totalStudentsAcrossCourses = allEnrollments.length
    const totalCompletedStudents = coursePerformance.reduce((sum, course) => sum + course.completedStudents, 0)
    const overallCompletionRate = totalStudentsAcrossCourses > 0 
      ? (totalCompletedStudents / totalStudentsAcrossCourses) * 100 
      : 0

    const overallAverageRating = coursePerformance.length > 0
      ? coursePerformance.reduce((sum, course) => sum + course.averageRating, 0) / coursePerformance.length
      : 0

    return NextResponse.json({
      success: true,
      data: {
        timeRange: params.timeRange,
        courseId: params.courseId,
        overview: {
          totalCourses: courses.length,
          totalStudents: totalStudentsAcrossCourses,
          totalCompletedStudents,
          overallCompletionRate: Math.round(overallCompletionRate * 10) / 10,
          overallAverageRating: Math.round(overallAverageRating * 10) / 10,
          totalReviews: recentReviews.length
        },
        coursePerformance,
        progressDistribution,
        enrollmentTrend,
        topCourses,
        recentReviews: recentReviews.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          courseTitle: review.course.title,
          studentName: review.student.name,
          createdAt: review.createdAt.toISOString()
        }))
      }
    })

  } catch (error) {
    console.error('Instructor analytics API error:', error)
    
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
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}