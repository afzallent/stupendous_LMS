import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schema
const engagementQuerySchema = z.object({
  instructorId: z.string().min(1, 'Instructor ID is required'),
  timeRange: z.enum(['7d', '30d', '90d']).default('7d'),
  courseId: z.string().optional(),
  granularity: z.enum(['hour', 'day', 'week']).default('day')
})

// GET - Fetch student engagement metrics
export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const { searchParams } = new URL(request.url)
    
    const params = engagementQuerySchema.parse(Object.fromEntries(searchParams))
    
    // If no instructorId provided, use the authenticated instructor's ID
    const instructorId = params.instructorId || instructor.id
    
    // Verify instructor can only access their own engagement data (unless admin)
    if (instructor.role !== 'ADMIN' && instructorId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to engagement data' },
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
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
    
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
          timeRange: params.timeRange,
          summary: {
            totalActiveStudents: 0,
            averageDailyActive: 0,
            peakActiveTime: null,
            totalEngagementHours: 0,
            averageSessionDuration: 0
          },
          dailyActiveStudents: [],
          hourlyEngagement: [],
          courseEngagement: [],
          engagementTrends: []
        }
      })
    }

    // Since we don't have explicit activity tracking yet, we'll use progress updates as proxy for engagement
    // In a real system, you'd have session tracking, page views, time spent, etc.
    
    // Get recent progress updates as engagement indicators
    const progressUpdates = await db.progress.findMany({
      where: {
        enrollment: {
          courseId: { in: courseIds }
        },
        updatedAt: {
          gte: startDate
        }
      },
      include: {
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                name: true
              }
            },
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        lesson: {
          select: {
            id: true,
            title: true,
            duration: true
          }
        }
      },
      orderBy: {
        updatedAt: 'asc'
      }
    })

    // Group progress updates by day for daily active students
    const dailyEngagement: { [date: string]: Set<string> } = {}
    const hourlyEngagement: { [hour: string]: number } = {}
    const courseEngagement: { [courseId: string]: { title: string, activeStudents: Set<string>, updates: number } } = {}

    progressUpdates.forEach(progress => {
      const updateDate = progress.updatedAt
      const dayKey = updateDate.toISOString().split('T')[0] // YYYY-MM-DD
      const hourKey = `${dayKey}T${updateDate.getHours().toString().padStart(2, '0')}:00`
      const studentId = progress.enrollment.student.id
      const courseId = progress.enrollment.courseId

      // Daily active students
      if (!dailyEngagement[dayKey]) {
        dailyEngagement[dayKey] = new Set()
      }
      dailyEngagement[dayKey].add(studentId)

      // Hourly engagement (number of progress updates)
      hourlyEngagement[hourKey] = (hourlyEngagement[hourKey] || 0) + 1

      // Course engagement
      if (!courseEngagement[courseId]) {
        courseEngagement[courseId] = {
          title: progress.enrollment.course.title,
          activeStudents: new Set(),
          updates: 0
        }
      }
      courseEngagement[courseId].activeStudents.add(studentId)
      courseEngagement[courseId].updates += 1
    })

    // Format daily active students data
    const dailyActiveData = Object.entries(dailyEngagement)
      .map(([date, students]) => ({
        date,
        activeStudents: students.size,
        dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Format hourly engagement data
    const hourlyEngagementData = Object.entries(hourlyEngagement)
      .map(([datetime, updates]) => {
        const date = new Date(datetime)
        return {
          datetime,
          hour: date.getHours(),
          date: datetime.split('T')[0],
          updates,
          dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' })
        }
      })
      .sort((a, b) => a.datetime.localeCompare(b.datetime))

    // Format course engagement data
    const courseEngagementData = Object.entries(courseEngagement)
      .map(([courseId, data]) => ({
        courseId,
        courseTitle: data.title,
        activeStudents: data.activeStudents.size,
        totalUpdates: data.updates,
        avgUpdatesPerStudent: data.activeStudents.size > 0 ? Math.round(data.updates / data.activeStudents.size) : 0
      }))
      .sort((a, b) => b.activeStudents - a.activeStudents)

    // Calculate summary metrics
    const totalActiveStudents = new Set(progressUpdates.map(p => p.enrollment.student.id)).size
    const averageDailyActive = dailyActiveData.length > 0 
      ? Math.round(dailyActiveData.reduce((sum, day) => sum + day.activeStudents, 0) / dailyActiveData.length)
      : 0

    // Find peak engagement hour
    const hourlyActivity: { [hour: number]: number } = {}
    hourlyEngagementData.forEach(item => {
      hourlyActivity[item.hour] = (hourlyActivity[item.hour] || 0) + item.updates
    })

    const peakHour = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)[0]

    const peakActiveTime = peakHour ? {
      hour: parseInt(peakHour[0]),
      updates: peakHour[1],
      formatted: `${peakHour[0]}:00`
    } : null

    // Estimate engagement hours (using lesson durations from progress updates)
    const totalEngagementMinutes = progressUpdates.reduce((sum, progress) => {
      return sum + (progress.lesson?.duration || 0)
    }, 0)
    const totalEngagementHours = Math.round(totalEngagementMinutes / 60)

    // Average session duration (estimated)
    const totalSessions = Object.values(dailyEngagement).reduce((sum, students) => sum + students.size, 0)
    const averageSessionDuration = totalSessions > 0 ? Math.round(totalEngagementMinutes / totalSessions) : 0

    // Engagement trends (weekly comparison if enough data)
    const engagementTrends = []
    if (params.timeRange !== '7d') {
      // Group by weeks for trend analysis
      const weeklyData: { [week: string]: Set<string> } = {}
      
      progressUpdates.forEach(progress => {
        const date = progress.updatedAt
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0]
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = new Set()
        }
        weeklyData[weekKey].add(progress.enrollment.student.id)
      })

      const sortedWeeks = Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, students], index) => {
          const prevWeek = sortedWeeks[index - 1]
          const growthRate = prevWeek 
            ? ((students.size - prevWeek[1].size) / prevWeek[1].size) * 100 
            : 0

          return {
            week,
            activeStudents: students.size,
            growthRate: Math.round(growthRate * 10) / 10
          }
        })

      engagementTrends.push(...sortedWeeks.slice(-4)) // Last 4 weeks
    }

    return NextResponse.json({
      success: true,
      data: {
        timeRange: params.timeRange,
        courseId: params.courseId,
        summary: {
          totalActiveStudents,
          averageDailyActive,
          peakActiveTime,
          totalEngagementHours,
          averageSessionDuration,
          totalProgressUpdates: progressUpdates.length
        },
        dailyActiveStudents: dailyActiveData,
        hourlyEngagement: hourlyEngagementData,
        courseEngagement: courseEngagementData,
        engagementTrends
      }
    })

  } catch (error) {
    console.error('Instructor engagement API error:', error)
    
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
      { success: false, error: 'Failed to fetch engagement data' },
      { status: 500 }
    )
  }
}