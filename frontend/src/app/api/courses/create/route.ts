import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schema for course creation
const createCourseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  subtitle: z.string().optional(),
  description: z.string().min(1, "Course description is required"),
  category: z.string().min(1, "Category is required"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  language: z.string().default("English"),
  price: z.number().min(0, "Price must be non-negative"),
  trainerId: z.string().min(1, "Trainer ID is required"),
  learningObjectives: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  chapters: z.array(z.object({
    title: z.string().min(1, "Chapter title is required"),
    order: z.number(),
    lessons: z.array(z.object({
      title: z.string().min(1, "Lesson title is required"),
      description: z.string().optional(),
      order: z.number(),
      duration: z.number().optional(),
      videoUrl: z.string().optional(),
      content: z.string().optional(),
      isPreview: z.boolean().default(false)
    }))
  }))
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the input
    const validatedData = createCourseSchema.parse(body)
    
    // Check if category exists, create if it doesn't
    let category = await prisma.category.findUnique({
      where: { name: validatedData.category }
    })
    
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: validatedData.category,
          description: `${validatedData.category} courses`,
          icon: "📚" // Default icon
        }
      })
    }

    // Create the course with chapters and lessons in a transaction
    const course = await prisma.$transaction(async (tx) => {
      // Create the course
      const newCourse = await tx.course.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          price: validatedData.price,
          status: validatedData.status,
          level: validatedData.level,
          language: validatedData.language,
          trainerId: validatedData.trainerId,
          categoryId: category.id,
          // Store additional data as JSON in description for now
          // In a real app, you might want separate fields for these
        }
      })

      // Create chapters and lessons
      for (const chapterData of validatedData.chapters) {
        const chapter = await tx.chapter.create({
          data: {
            title: chapterData.title,
            order: chapterData.order,
            courseId: newCourse.id
          }
        })

        // Create lessons for this chapter
        for (const lessonData of chapterData.lessons) {
          await tx.lesson.create({
            data: {
              title: lessonData.title,
              description: lessonData.description,
              order: lessonData.order,
              duration: lessonData.duration,
              videoUrl: lessonData.videoUrl,
              content: lessonData.content,
              isPreview: lessonData.isPreview,
              chapterId: chapter.id,
              courseId: newCourse.id
            }
          })
        }
      }

      return newCourse
    })

    return NextResponse.json({
      success: true,
      message: "Course created successfully",
      data: {
        courseId: course.id,
        title: course.title,
        status: course.status
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: "Validation failed", 
          details: error.errors 
        },
        { status: 400 }
      )
    }

    console.error("Course creation error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}