import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schema for enrollment creation
const createEnrollmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  courseIds: z.array(z.string()).min(1, "At least one course ID is required"),
  paymentId: z.string().optional(),
  paymentMethod: z.enum(["stripe", "upi"]).optional(),
  amount: z.number().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📥 Enrollment creation request received:', body)
    
    // Validate the input
    const validatedData = createEnrollmentSchema.parse(body)
    
    console.log('✅ Validated enrollment data:', validatedData)
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, name: true, email: true, role: true }
    })

    console.log('👤 User lookup result:', user)

    if (!user) {
      console.error('❌ User not found for enrollment:', validatedData.userId)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    // Check if user has STUDENT role
    if (user.role !== 'STUDENT') {
      console.error('❌ User does not have STUDENT role:', user.role)
      return NextResponse.json(
        { error: "Only students can enroll in courses" },
        { status: 403 }
      )
    }

    // Check if courses exist
    const courses = await prisma.course.findMany({
      where: { 
        id: { in: validatedData.courseIds },
        status: 'PUBLISHED'
      },
      select: { id: true, title: true, price: true, trainerId: true }
    })

    console.log('📚 Courses lookup result:', courses)

    if (courses.length !== validatedData.courseIds.length) {
      console.error('❌ Some courses not found or not published', {
        requested: validatedData.courseIds,
        found: courses.map(c => c.id)
      })
      return NextResponse.json(
        { error: "One or more courses not found or not published" },
        { status: 400 }
      )
    }

    // Check for existing enrollments to prevent duplicates
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: validatedData.userId,
        courseId: { in: validatedData.courseIds }
      },
      select: { courseId: true }
    })

    console.log('🔍 Existing enrollments:', existingEnrollments)

    const existingCourseIds = existingEnrollments.map(e => e.courseId)
    const newCourseIds = validatedData.courseIds.filter(id => !existingCourseIds.includes(id))

    console.log('🆕 New course IDs to enroll:', newCourseIds)

    if (newCourseIds.length === 0) {
      console.warn('⚠️ User is already enrolled in all specified courses')
      return NextResponse.json(
        { 
          success: true,
          message: "User is already enrolled in all specified courses",
          data: {
            enrollments: [],
            user: {
              id: user.id,
              name: user.name,
              email: user.email
            },
            skippedCourses: existingCourseIds
          }
        }
      )
    }

    // Create enrollments for new courses
    const newEnrollments = await Promise.all(
      newCourseIds.map(courseId =>
        prisma.enrollment.create({
          data: {
            studentId: validatedData.userId,
            courseId: courseId,
            status: 'ACTIVE',
            progress: 0,
            enrolledAt: new Date()
          },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
                trainer: {
                  select: { name: true }
                }
              }
            }
          }
        })
      )
    )

    console.log('✅ Created new enrollments:', newEnrollments)

    // Create payment record if payment details provided
    if (validatedData.paymentId && validatedData.paymentMethod && validatedData.amount) {
      try {
        await prisma.payment.create({
          data: {
            amount: validatedData.amount,
            currency: validatedData.paymentMethod === 'upi' ? 'INR' : 'USD',
            paymentMethod: validatedData.paymentMethod.toUpperCase(),
            status: 'COMPLETED',
            transactionId: validatedData.paymentId,
            studentId: validatedData.userId,
            // Link to the first course (in a real app, you might want a separate OrderItems table)
            courseId: newCourseIds[0]
          }
        })
        console.log('✅ Payment record created')
      } catch (paymentError) {
        console.error('❌ Failed to create payment record:', paymentError)
        // Don't fail the entire request if payment creation fails
      }
    }

    // Format response
    const enrolledCourses = newEnrollments.map(enrollment => ({
      id: enrollment.course.id,
      title: enrollment.course.title,
      instructor: enrollment.course.trainer.name,
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress
    }))

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled in ${newEnrollments.length} course(s)`,
      data: {
        enrollments: enrolledCourses,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        skippedCourses: existingCourseIds.length > 0 ? existingCourseIds : undefined
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation failed:', error.errors)
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Enrollment creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}