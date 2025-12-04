import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

const publishCourseSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  instructorId: z.string().min(1, "Instructor ID is required")
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the input
    const validatedData = publishCourseSchema.parse(body)
    
    // Check if course exists and belongs to the instructor
    const course = await prisma.course.findUnique({
      where: { 
        id: validatedData.courseId,
        trainerId: validatedData.instructorId
      },
      include: {
        lessons: true,
        trainer: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: "Course not found or you don't have permission to publish it" },
        { status: 404 }
      )
    }

    // Check if course is ready to be published (has lessons)
    if (course.lessons.length === 0) {
      return NextResponse.json(
        { error: "Course must have at least one lesson before publishing" },
        { status: 400 }
      )
    }

    // Update course status to PUBLISHED
    const updatedCourse = await prisma.course.update({
      where: { id: validatedData.courseId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      },
      include: {
        category: {
          select: {
            name: true
          }
        },
        trainer: {
          select: {
            name: true
          }
        }
      }
    })

    // Create activity log entry for course publishing
    await prisma.activityLog.create({
      data: {
        userId: validatedData.instructorId,
        activityType: 'COURSE_PUBLISHED',
        description: `Published course: ${updatedCourse.title}`,
        metadata: {
          courseId: updatedCourse.id,
          courseTitle: updatedCourse.title,
          category: updatedCourse.category?.name || 'Uncategorized'
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Course published successfully",
      data: {
        course: {
          id: updatedCourse.id,
          title: updatedCourse.title,
          status: updatedCourse.status,
          publishedAt: updatedCourse.publishedAt,
          category: updatedCourse.category?.name,
          instructor: updatedCourse.trainer.name
        }
      }
    })

  } catch (error) {
    console.error("Course publish API error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}