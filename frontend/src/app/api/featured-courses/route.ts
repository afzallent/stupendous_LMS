import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get featured courses (we'll consider courses with high enrollment and rating as featured)
    const courses = await db.course.findMany({
      where: {
        status: 'PUBLISHED'
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy: [
        {
          enrollments: {
            _count: 'desc'
          }
        }
      ],
      take: 6 // Limit to 6 featured courses
    })

    // Calculate average rating and format courses
    const featuredCourses = courses.map(course => {
      const totalReviews = course.reviews.length
      const averageRating = totalReviews > 0 
        ? course.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0
      
      // Calculate total duration from lessons (if available)
      let totalDuration = 0
      // Note: We would need to include lessons in the query to calculate duration
      
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        thumbnail: course.thumbnail,
        level: course.level.toLowerCase(),
        category: course.category?.name || 'Uncategorized',
        instructor: course.trainer.name || 'Unknown Instructor',
        instructorAvatar: course.trainer.avatar,
        rating: Math.round(averageRating * 10) / 10,
        students: course._count.enrollments,
        totalReviews,
        duration: 'N/A', // Would calculate from lessons in a real implementation
        featured: true,
        createdAt: course.createdAt
      }
    })

    return NextResponse.json(featuredCourses)
  } catch (error) {
    console.error('Error fetching featured courses:', error)
    return NextResponse.json({ error: 'Failed to fetch featured courses' }, { status: 500 })
  }
}