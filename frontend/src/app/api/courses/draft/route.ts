import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schema for draft saving (more lenient than full course creation)
const saveDraftSchema = z.object({
  id: z.string().optional(), // For updating existing drafts
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  language: z.string().optional(),
  price: z.number().optional(),
  trainerId: z.string().min(1, "Trainer ID is required"),
  learningObjectives: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  chapters: z.array(z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    order: z.number(),
    lessons: z.array(z.object({
      id: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      order: z.number(),
      duration: z.number().optional(),
      videoUrl: z.string().optional(),
      content: z.string().optional(),
      isPreview: z.boolean().default(false)
    }))
  })).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the input
    const validatedData = saveDraftSchema.parse(body)
    
    let course

    if (validatedData.id) {
      // Update existing draft
      course = await prisma.course.update({
        where: { id: validatedData.id },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          price: validatedData.price || 0,
          level: validatedData.level,
          language: validatedData.language,
          status: "DRAFT"
        }
      })
    } else {
      // Create new draft
      let categoryId = null
      
      if (validatedData.category) {
        let category = await prisma.category.findUnique({
          where: { name: validatedData.category }
        })
        
        if (!category) {
          category = await prisma.category.create({
            data: {
              name: validatedData.category,
              description: `${validatedData.category} courses`,
              icon: "📚"
            }
          })
        }
        categoryId = category.id
      }

      course = await prisma.course.create({
        data: {
          title: validatedData.title || "Untitled Course",
          description: validatedData.description || "",
          price: validatedData.price || 0,
          status: "DRAFT",
          level: validatedData.level || "BEGINNER",
          language: validatedData.language || "English",
          trainerId: validatedData.trainerId,
          categoryId: categoryId
        }
      })
    }

    // Handle chapters and lessons if provided
    if (validatedData.chapters && validatedData.chapters.length > 0) {
      // For simplicity, we'll delete existing chapters and recreate them
      // In a production app, you'd want more sophisticated merging logic
      await prisma.lesson.deleteMany({
        where: { courseId: course.id }
      })
      await prisma.chapter.deleteMany({
        where: { courseId: course.id }
      })

      for (const chapterData of validatedData.chapters) {
        if (chapterData.title) {
          const chapter = await prisma.chapter.create({
            data: {
              title: chapterData.title,
              order: chapterData.order,
              courseId: course.id
            }
          })

          for (const lessonData of chapterData.lessons) {
            if (lessonData.title) {
              await prisma.lesson.create({
                data: {
                  title: lessonData.title,
                  description: lessonData.description,
                  order: lessonData.order,
                  duration: lessonData.duration,
                  videoUrl: lessonData.videoUrl,
                  content: lessonData.content,
                  isPreview: lessonData.isPreview,
                  chapterId: chapter.id,
                  courseId: course.id
                }
              })
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Draft saved successfully",
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

    console.error("Draft save error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}