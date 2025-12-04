import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * PUT - Update lesson progress for a student
 * Body: { userId: string, lessonId: string, progressPercentage: number, completed: boolean }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, lessonId, progressPercentage, completed, watchTime, lastPosition } = body

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: "User ID and Lesson ID are required" },
        { status: 400 }
      )
    }

    // Get lesson details to find courseId
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { courseId: true }
    })

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      )
    }

    const courseId = lesson.courseId

    // Check if enrollment exists
    let enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: userId,
          courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: "User is not enrolled in this course" },
        { status: 404 }
      )
    }

    // Upsert progress record
    const progress = await prisma.progress.upsert({
      where: {
        studentId_lessonId: {
          studentId: userId,
          lessonId
        }
      },
      update: {
        progressPercentage,
        completed,
        watchTime: watchTime || 0,
        lastPosition: lastPosition || 0,
        updatedAt: new Date()
      },
      create: {
        studentId: userId,
        lessonId,
        enrollmentId: enrollment.id,
        progressPercentage,
        completed,
        watchTime: watchTime || 0,
        lastPosition: lastPosition || 0
      }
    })

    // Calculate overall course progress
    const totalLessons = await prisma.lesson.count({
      where: { courseId }
    })

    const completedLessons = await prisma.progress.count({
      where: {
        studentId: userId,
        lesson: { courseId },
        completed: true
      }
    })

    const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    // Update enrollment progress
    const updatedEnrollment = await prisma.enrollment.update({
      where: {
        studentId_courseId: {
          studentId: userId,
          courseId
        }
      },
      data: {
        progress: courseProgress,
        completedAt: courseProgress === 100 ? new Date() : enrollment.completedAt
      }
    })

    // If course is now completed (100%), generate certificate
    let certificate = null
    if (courseProgress === 100) {
      // Check if certificate already exists
      certificate = await prisma.certificate.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      })

      // If no certificate exists, create one
      if (!certificate) {
        const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        // In a real implementation, you would generate the actual PDF here
        const certificateUrl = `/certificates/${certificateId}.pdf`

        certificate = await prisma.certificate.create({
          data: {
            userId,
            courseId,
            certificateUrl,
            certificateId,
            issuedAt: new Date()
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        progress,
        enrollment: updatedEnrollment,
        certificate
      }
    })

  } catch (error) {
    console.error("Progress update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}