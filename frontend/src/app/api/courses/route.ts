import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const price = searchParams.get('price')
    const sort = searchParams.get('sort') || 'popular'

    let whereClause: any = {
      status: 'PUBLISHED'
    }

    // Search filter
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { trainer: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Category filter
    if (category && category !== 'all') {
      whereClause.category = {
        name: { equals: category, mode: 'insensitive' }
      }
    }

    // Level filter
    if (level && level !== 'all') {
      whereClause.level = level.toUpperCase()
    }

    // Price filter
    if (price && price !== 'all') {
      if (price === 'free') {
        whereClause.price = 0
      } else if (price === '0-50') {
        whereClause.price = { gt: 0, lte: 50 }
      } else if (price === '50-100') {
        whereClause.price = { gt: 50, lte: 100 }
      } else if (price === '100+') {
        whereClause.price = { gt: 100 }
      }
    }

    // Get courses with related data
    const courses = await db.course.findMany({
      where: whereClause,
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
      }
    })

    // Calculate average rating and total students for each course
    const coursesWithStats = courses.map(course => {
      const totalReviews = course.reviews.length
      const averageRating = totalReviews > 0 
        ? course.reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
        : 0
      
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
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        students: course._count.enrollments,
        totalReviews,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }
    })

    // Sorting
    let sortedCourses = [...coursesWithStats]
    switch (sort) {
      case 'rating':
        sortedCourses.sort((a, b) => b.rating - a.rating)
        break
      case 'newest':
        sortedCourses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'price-low':
        sortedCourses.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        sortedCourses.sort((a, b) => b.price - a.price)
        break
      default: // popular
        sortedCourses.sort((a, b) => b.students - a.students)
    }

    return NextResponse.json(sortedCourses)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}