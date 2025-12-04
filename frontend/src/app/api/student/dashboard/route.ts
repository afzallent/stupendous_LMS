import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    console.log('🔍 Dashboard API called with userId:', userId)

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get user's enrollments with course details
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: userId,
        status: 'ACTIVE'
      },
      include: {
        course: {
          include: {
            trainer: {
              select: {
                name: true
              }
            },
            lessons: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        lessonProgress: {
          include: {
            lesson: true
          }
        }
      }
    })

    console.log(`📊 Found ${enrollments.length} enrollments for user ${userId}`)

    // Transform data for frontend
    const enrolledCourses = enrollments.map(enrollment => {
      const completedLessons = enrollment.lessonProgress.filter(p => p.completed).length
      const totalLessons = enrollment.course.lessons.length
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

      // Find next lesson
      const completedLessonIds = enrollment.lessonProgress
        .filter(p => p.completed)
        .map(p => p.lessonId)
      
      const nextLesson = enrollment.course.lessons.find(lesson => 
        !completedLessonIds.includes(lesson.id)
      )

      return {
        id: enrollment.course.id,
        title: enrollment.course.title,
        instructor: enrollment.course.trainer.name,
        progress,
        totalLessons,
        completedLessons,
        nextLesson: nextLesson ? {
          id: nextLesson.id,
          title: nextLesson.title
        } : null
      }
    })

    // Calculate stats
    const totalEnrolled = enrollments.length
    const totalCompleted = enrolledCourses.filter(course => course.progress === 100).length
    const totalHours = enrollments.reduce((acc, enrollment) => {
      const watchTime = enrollment.lessonProgress.reduce((time, progress) => time + progress.watchTime, 0)
      return acc + Math.round(watchTime / 3600) // Convert seconds to hours
    }, 0)

    // Mock achievements for now (you can create an achievements table later)
    const achievements = [
      {
        id: "1",
        title: "First Course Enrolled",
        description: "Enrolled in your first course",
        icon: "🎓",
        earnedAt: "2024-01-15"
      },
      {
        id: "2",
        title: "Learning Streak",
        description: "Learned for 7 days in a row",
        icon: "🔥",
        earnedAt: "2024-01-20"
      }
    ]

    return NextResponse.json({
      success: true,
      data: {
        enrolledCourses,
        stats: {
          totalEnrolled,
          totalCompleted,
          totalHours,
          currentStreak: 12 // Mock for now
        },
        achievements
      }
    })

  } catch (error) {
    console.error("Dashboard API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}