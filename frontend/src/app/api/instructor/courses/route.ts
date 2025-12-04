import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const instructorId = searchParams.get('instructorId')

    if (!instructorId) {
      return NextResponse.json(
        { error: "Instructor ID is required" },
        { status: 400 }
      )
    }

    // Get instructor's courses with related data
    const courses = await prisma.course.findMany({
      where: {
        trainerId: instructorId
      },
      include: {
        category: {
          select: {
            name: true
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
          select: {
            rating: true
          }
        },
        enrollments: {
          select: {
            id: true,
            status: true
          }
        },
        lessons: {
          select: {
            duration: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform data for frontend
    const transformedCourses = courses.map(course => {
      // Calculate average rating
      const totalReviews = course.reviews.length
      const averageRating = totalReviews > 0 
        ? course.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0

      // Calculate total revenue (mock calculation - in real app you'd have payment data)
      const revenue = course.enrollments.length * course.price

      // Calculate completion rate (mock - in real app you'd track actual completion)
      const completedEnrollments = course.enrollments.filter(e => e.status === 'COMPLETED').length
      const completionRate = course.enrollments.length > 0 
        ? Math.round((completedEnrollments / course.enrollments.length) * 100)
        : 0

      // Calculate total duration
      const totalDuration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0)
      const hours = Math.floor(totalDuration / 3600)
      const minutes = Math.floor((totalDuration % 3600) / 60)

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        status: course.status.toLowerCase(),
        students: course._count.enrollments,
        revenue: revenue,
        rating: Math.round(averageRating * 10) / 10,
        completionRate: completionRate,
        totalLessons: course._count.lessons,
        duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        category: course.category?.name || 'Uncategorized',
        price: course.price,
        created: course.createdAt.toISOString().split('T')[0],
        lastUpdated: course.updatedAt.toISOString().split('T')[0],
        thumbnail: course.thumbnail
      }
    })

    // Calculate instructor stats
    const totalStudents = courses.reduce((sum, course) => sum + course._count.enrollments, 0)
    const totalRevenue = transformedCourses.reduce((sum, course) => sum + course.revenue, 0)
    const totalCourses = courses.length
    const publishedCourses = courses.filter(c => c.status === 'PUBLISHED').length
    const averageRating = courses.length > 0 
      ? transformedCourses.reduce((sum, course) => sum + course.rating, 0) / transformedCourses.filter(c => c.rating > 0).length
      : 0

    return NextResponse.json({
      success: true,
      data: {
        courses: transformedCourses,
        stats: {
          totalStudents,
          totalRevenue,
          totalCourses,
          publishedCourses,
          averageRating: Math.round(averageRating * 10) / 10,
          completionRate: totalStudents > 0 
            ? Math.round((courses.reduce((sum, course) => 
                sum + course.enrollments.filter(e => e.status === 'COMPLETED').length, 0
              ) / totalStudents) * 100)
            : 0
        }
      }
    })

  } catch (error) {
    console.error("Instructor courses API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}