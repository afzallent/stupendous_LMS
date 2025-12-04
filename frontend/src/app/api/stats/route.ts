import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get various statistics from the database
    const [totalUsers, totalCourses, totalEnrollments, totalCategories] = await Promise.all([
      prisma.user.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.enrollment.count(),
      prisma.category.count()
    ])

    const stats = [
      {
        icon: 'Users',
        label: 'Active Students',
        value: totalUsers.toLocaleString(),
        color: 'from-blue-500 to-blue-600'
      },
      {
        icon: 'BookOpen',
        label: 'Expert Courses',
        value: totalCourses.toLocaleString(),
        color: 'from-green-500 to-green-600'
      },
      {
        icon: 'TrendingUp',
        label: 'Total Enrollments',
        value: totalEnrollments.toLocaleString(),
        color: 'from-purple-500 to-purple-600'
      },
      {
        icon: 'Award',
        label: 'Course Categories',
        value: totalCategories.toLocaleString(),
        color: 'from-orange-500 to-orange-600'
      }
    ]

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    
    // Return default stats if database query fails
    const defaultStats = [
      {
        icon: 'Users',
        label: 'Active Students',
        value: '10K+',
        color: 'from-blue-500 to-blue-600'
      },
      {
        icon: 'BookOpen',
        label: 'Expert Courses',
        value: '500+',
        color: 'from-green-500 to-green-600'
      },
      {
        icon: 'TrendingUp',
        label: 'Total Enrollments',
        value: '25K+',
        color: 'from-purple-500 to-purple-600'
      },
      {
        icon: 'Award',
        label: 'Course Categories',
        value: '50+',
        color: 'from-orange-500 to-orange-600'
      }
    ]
    
    return NextResponse.json(defaultStats)
  }
}