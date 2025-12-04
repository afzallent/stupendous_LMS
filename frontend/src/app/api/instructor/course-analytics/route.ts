import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schema
const courseAnalyticsSchema = z.object({
  instructorId: z.string().min(1, 'Instructor ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  timeRange: z.enum(['7d', '30d', '90d', 'all']).default('30d')
})

// GET - Fetch detailed course performance analytics
export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const { searchParams } = new URL(request.url)
    
    const params = courseAnalyticsSchema.parse(Object.fromEntries(searchParams))
    
    // If no instructorId provided, use the authenticated instructor's ID
    const instructorId = params.instructorId || instructor.id
    
    // Verify instructor can only access their own course analytics (unless admin)
    if (instructor.role !== 'ADMIN' && instructorId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to course analytics' },
        { status: 403 }
      )
    }
    
    // Calculate date range
    let startDate: Date | undefined
    if (params.timeRange !== 'all') {
      const now = new Date()
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
      }
    }

    // Get course with comprehensive data
    const course = await db.course.findUnique({
      where: { 
        id: params.courseId,
        trainerId: instructorId
      },
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            },
            progress: {
              include: {
                lesson: {
                  select: {
                    id: true,
                    title: true,
                    order: true,
                    duration: true
                  }
                }
              }
            }
          },
          where: startDate ? {
            enrolledAt: { gte: startDate }
          } : undefined
        },
        lessons: {
          include: {
            chapter: {
              select: {
                id: true,
                title: true,
                order: true
              }
            }
          },
          orderBy: [
            { chapter: { order: 'asc' } },
            { order: 'asc' }
          ]
        },
        reviews: {
          where: startDate ? {
            createdAt: { gte: startDate }
          } : undefined,
          include: {
            student: {
              select: {
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          where: {
            status: 'COMPLETED',
            ...(startDate ? { createdAt: { gte: startDate } } : {})
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
    
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found or unauthorized' },
        { status: 404 }
      )
    }

    // Calculate lesson-level analytics
    const lessonAnalytics = course.lessons.map(lesson => {
      // Get all progress records for this lesson
      const lessonProgress = course.enrollments.flatMap(enrollment => 
        enrollment.progress.filter(p => p.lessonId === lesson.id)
      )
      
      const totalStudents = course.enrollments.length
      const studentsStarted = lessonProgress.length
      const studentsCompleted = lessonProgress.filter(p => p.progressPercentage >= 100).length
      
      // Calculate average time to complete (using progress timestamps)
      const completedProgress = lessonProgress.filter(p => p.progressPercentage >= 100)
      const avgCompletionTime = completedProgress.length > 0
        ? Math.round(completedProgress.reduce((sum, progress) => {
            const enrollment = course.enrollments.find(e => 
              e.progress.some(p => p.id === progress.id)
            )
            if (!enrollment) return sum
            
            // Estimate time based on when progress was updated vs enrollment
            const timeDiff = progress.updatedAt.getTime() - enrollment.enrolledAt.getTime()
            return sum + (timeDiff / (1000 * 60 * 60 * 24)) // Convert to days
          }, 0) / completedProgress.length)
        : 0

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonOrder: lesson.order,
        chapterId: lesson.chapter.id,
        chapterTitle: lesson.chapter.title,
        chapterOrder: lesson.chapter.order,
        duration: lesson.duration,
        totalStudents,
        studentsStarted,
        studentsCompleted,
        startRate: totalStudents > 0 ? Math.round((studentsStarted / totalStudents) * 100) : 0,
        completionRate: studentsStarted > 0 ? Math.round((studentsCompleted / studentsStarted) * 100) : 0,
        averageCompletionTime: avgCompletionTime,
        dropOffRate: studentsStarted > 0 ? Math.round(((studentsStarted - studentsCompleted) / studentsStarted) * 100) : 0
      }
    })

    // Calculate overall course metrics
    const totalEnrollments = course.enrollments.length
    const completedEnrollments = course.enrollments.filter(enrollment => {
      // Check if student has completed all lessons
      const completedLessons = enrollment.progress.filter(p => p.progressPercentage >= 100).length
      return completedLessons === course.lessons.length
    }).length
    
    const overallCompletionRate = totalEnrollments > 0 
      ? Math.round((completedEnrollments / totalEnrollments) * 100) 
      : 0

    // Revenue analytics
    const totalRevenue = course.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const averageRevenue = totalEnrollments > 0 ? Math.round(totalRevenue / totalEnrollments) : 0

    // Review analytics
    const averageRating = course.reviews.length > 0
      ? Math.round((course.reviews.reduce((sum, review) => sum + review.rating, 0) / course.reviews.length) * 10) / 10
      : 0

    const ratingDistribution = {
      5: course.reviews.filter(r => r.rating === 5).length,
      4: course.reviews.filter(r => r.rating === 4).length,
      3: course.reviews.filter(r => r.rating === 3).length,
      2: course.reviews.filter(r => r.rating === 2).length,
      1: course.reviews.filter(r => r.rating === 1).length
    }

    // Enrollment trends (by day/week)
    const enrollmentTrend: { [key: string]: number } = {}
    course.enrollments.forEach(enrollment => {
      const date = enrollment.enrolledAt.toISOString().split('T')[0]
      enrollmentTrend[date] = (enrollmentTrend[date] || 0) + 1
    })

    const enrollmentChartData = Object.entries(enrollmentTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        enrollments: count,
        formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }))

    // Student progress distribution
    const progressDistribution = {
      '0-25': 0,
      '26-50': 0,
      '51-75': 0,
      '76-100': 0
    }

    course.enrollments.forEach(enrollment => {
      // Calculate overall progress for this student
      const totalLessons = course.lessons.length
      const completedLessons = enrollment.progress.filter(p => p.progressPercentage >= 100).length
      const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

      if (overallProgress <= 25) {
        progressDistribution['0-25']++
      } else if (overallProgress <= 50) {
        progressDistribution['26-50']++
      } else if (overallProgress <= 75) {
        progressDistribution['51-75']++
      } else {
        progressDistribution['76-100']++
      }
    })

    // Top performing students
    const studentPerformance = course.enrollments.map(enrollment => {
      const completedLessons = enrollment.progress.filter(p => p.progressPercentage >= 100).length
      const overallProgress = course.lessons.length > 0 ? (completedLessons / course.lessons.length) * 100 : 0
      const lastActive = enrollment.progress.length > 0 
        ? Math.max(...enrollment.progress.map(p => p.updatedAt.getTime()))
        : enrollment.enrolledAt.getTime()

      return {
        studentId: enrollment.student.id,
        studentName: enrollment.student.name,
        enrolledAt: enrollment.enrolledAt,
        progress: Math.round(overallProgress),
        completedLessons,
        totalLessons: course.lessons.length,
        lastActive: new Date(lastActive),
        daysSinceEnrollment: Math.floor((Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24))
      }
    }).sort((a, b) => b.progress - a.progress)

    const topPerformers = studentPerformance.slice(0, 5)
    const strugglingStudents = studentPerformance.filter(s => s.progress < 25 && s.daysSinceEnrollment > 7).slice(0, 5)

    return NextResponse.json({
      success: true,
      data: {
        courseId: course.id,
        courseTitle: course.title,
        timeRange: params.timeRange,
        overview: {
          totalEnrollments,
          completedEnrollments,
          overallCompletionRate,
          totalRevenue,
          averageRevenue,
          averageRating,
          totalReviews: course.reviews.length,
          totalLessons: course.lessons.length
        },
        lessonAnalytics,
        enrollmentTrend: enrollmentChartData,
        progressDistribution,
        ratingDistribution,
        topPerformers,
        strugglingStudents,
        recentReviews: course.reviews.slice(0, 5).map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          studentName: review.student.name,
          createdAt: review.createdAt.toISOString()
        }))
      }
    })

  } catch (error) {
    console.error('Course analytics API error:', error)
    
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
      { success: false, error: 'Failed to fetch course analytics' },
      { status: 500 }
    )
  }
}