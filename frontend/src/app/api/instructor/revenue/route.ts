import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schema
const revenueQuerySchema = z.object({
  instructorId: z.string().min(1, 'Instructor ID is required'),
  timeRange: z.enum(['7d', '30d', '90d', '6m', '1y']).default('6m'),
  groupBy: z.enum(['day', 'week', 'month']).default('month')
})

// GET - Fetch instructor revenue data
export async function GET(request: NextRequest) {
  try {
    const instructor = await verifyInstructorAccess(request)
    const { searchParams } = new URL(request.url)
    
    const params = revenueQuerySchema.parse(Object.fromEntries(searchParams))
    
    // If no instructorId provided, use the authenticated instructor's ID
    const instructorId = params.instructorId || instructor.id
    
    // Verify instructor can only access their own revenue (unless admin)
    if (instructor.role !== 'ADMIN' && instructorId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to revenue data' },
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
      case '6m':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000) // 6 months default
    }

    // Get instructor's courses
    const instructorCourses = await db.course.findMany({
      where: { trainerId: instructorId },
      select: { id: true, title: true, price: true }
    })

    const courseIds = instructorCourses.map(course => course.id)

    if (courseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          timeRange: params.timeRange,
          summary: {
            totalRevenue: 0,
            totalSales: 0,
            averageOrderValue: 0,
            monthlyGrowthRate: 0,
            totalCourses: 0
          },
          revenueByPeriod: [],
          revenueByCourse: [],
          salesTrend: [],
          topCourses: []
        }
      })
    }

    // Get completed payments for instructor's courses
    const payments = await db.payment.findMany({
      where: {
        enrollment: {
          courseId: { in: courseIds }
        },
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      },
      include: {
        enrollment: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Calculate total revenue and metrics
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const totalSales = payments.length
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

    // Revenue by time period
    const revenueByPeriod: { [key: string]: number } = {}
    const salesByPeriod: { [key: string]: number } = {}

    payments.forEach(payment => {
      let periodKey: string
      const paymentDate = payment.createdAt

      switch (params.groupBy) {
        case 'day':
          periodKey = paymentDate.toISOString().split('T')[0] // YYYY-MM-DD
          break
        case 'week':
          const weekStart = new Date(paymentDate)
          weekStart.setDate(paymentDate.getDate() - paymentDate.getDay())
          periodKey = weekStart.toISOString().split('T')[0]
          break
        case 'month':
        default:
          periodKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
          break
      }

      revenueByPeriod[periodKey] = (revenueByPeriod[periodKey] || 0) + payment.amount
      salesByPeriod[periodKey] = (salesByPeriod[periodKey] || 0) + 1
    })

    // Format revenue data for charts
    const revenueChartData = Object.entries(revenueByPeriod)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, revenue]) => ({
        period,
        revenue,
        sales: salesByPeriod[period] || 0,
        formattedPeriod: formatPeriodLabel(period, params.groupBy)
      }))

    // Revenue by course
    const revenueByCourse: { [courseId: string]: { title: string, revenue: number, sales: number, price: number } } = {}
    
    payments.forEach(payment => {
      const course = payment.enrollment.course
      if (!revenueByCourse[course.id]) {
        revenueByCourse[course.id] = {
          title: course.title,
          revenue: 0,
          sales: 0,
          price: course.price
        }
      }
      revenueByCourse[course.id].revenue += payment.amount
      revenueByCourse[course.id].sales += 1
    })

    // Convert to array and sort by revenue
    const courseRevenueArray = Object.entries(revenueByCourse)
      .map(([courseId, data]) => ({
        courseId,
        ...data
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // Calculate growth rate (compare with previous period)
    let monthlyGrowthRate = 0
    if (revenueChartData.length >= 2) {
      const currentPeriod = revenueChartData[revenueChartData.length - 1]
      const previousPeriod = revenueChartData[revenueChartData.length - 2]
      
      if (previousPeriod.revenue > 0) {
        monthlyGrowthRate = ((currentPeriod.revenue - previousPeriod.revenue) / previousPeriod.revenue) * 100
      }
    }

    // Get all-time revenue for instructor
    const allTimePayments = await db.payment.aggregate({
      where: {
        enrollment: {
          courseId: { in: courseIds }
        },
        status: 'COMPLETED'
      },
      _sum: { amount: true },
      _count: { _all: true }
    })

    const allTimeRevenue = allTimePayments._sum.amount || 0
    const allTimeSales = allTimePayments._count || 0

    // Top performing courses (by revenue)
    const topCourses = courseRevenueArray.slice(0, 5)

    // Sales trend (daily sales count for the period)
    const salesTrend = Object.entries(salesByPeriod)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, sales]) => ({
        period,
        sales,
        formattedPeriod: formatPeriodLabel(period, params.groupBy)
      }))

    // Recent transactions
    const recentTransactions = payments
      .slice(-10)
      .map(payment => ({
        id: payment.id,
        amount: payment.amount,
        courseTitle: payment.enrollment.course.title,
        date: payment.createdAt.toISOString(),
        status: payment.status
      }))

    return NextResponse.json({
      success: true,
      data: {
        timeRange: params.timeRange,
        groupBy: params.groupBy,
        summary: {
          totalRevenue,
          allTimeRevenue,
          totalSales,
          allTimeSales,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          monthlyGrowthRate: Math.round(monthlyGrowthRate * 10) / 10,
          totalCourses: instructorCourses.length,
          activeCourses: courseRevenueArray.length // Courses that have sales
        },
        revenueByPeriod: revenueChartData,
        revenueByCourse: courseRevenueArray,
        salesTrend,
        topCourses,
        recentTransactions
      }
    })

  } catch (error) {
    console.error('Instructor revenue API error:', error)
    
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
      { success: false, error: 'Failed to fetch revenue data' },
      { status: 500 }
    )
  }
}

// Helper function to format period labels
function formatPeriodLabel(period: string, groupBy: string): string {
  switch (groupBy) {
    case 'day':
      return new Date(period).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    case 'week':
      return `Week of ${new Date(period).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}`
    case 'month':
    default:
      const [year, month] = period.split('-')
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      })
  }
}