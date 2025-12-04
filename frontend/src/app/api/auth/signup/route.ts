import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { 
  generateTokens, 
  hashPassword, 
  cookieConfig,
  validateAuthEnvironment 
} from "@/lib/jwt"

const prisma = new PrismaClient()

// Validation schema
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, "You must agree to the terms and conditions")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    validateAuthEnvironment()
    
    const body = await request.json()
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email
      }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }
    
    // Hash password using bcrypt
    const hashedPassword = await hashPassword(validatedData.password)
    
    // Create new user in database with transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: "STUDENT"
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true
        }
      })
      
      // Automatically enroll the new user in the default course (js-fundamentals-1)
      const DEFAULT_COURSE_ID = 'js-fundamentals-1'
      
      try {
        // Check if the default course exists
        const defaultCourse = await tx.course.findUnique({
          where: { id: DEFAULT_COURSE_ID },
          select: { id: true, title: true, status: true }
        })
        
        if (defaultCourse && defaultCourse.status === 'PUBLISHED') {
          // Create enrollment for the default course
          await tx.enrollment.create({
            data: {
              studentId: newUser.id,
              courseId: DEFAULT_COURSE_ID,
              status: 'ACTIVE',
              progress: 0,
              enrolledAt: new Date()
            }
          })
          
          // Create activity log for the automatic enrollment
          await tx.activityLog.create({
            data: {
              userId: newUser.id,
              action: 'COURSE_ENROLLED',
              details: `Automatically enrolled in default course: ${defaultCourse.title}`,
              metadata: {
                courseId: DEFAULT_COURSE_ID,
                courseTitle: defaultCourse.title,
                enrollmentType: 'DEFAULT_ON_SIGNUP'
              }
            }
          })
          
          console.log(`✅ New user ${newUser.email} automatically enrolled in ${defaultCourse.title}`)
        } else {
          console.warn(`⚠️ Default course ${DEFAULT_COURSE_ID} not found or not published`)
        }
      } catch (enrollmentError) {
        console.error('Error creating default enrollment:', enrollmentError)
        // Don't fail the signup process if enrollment fails
      }
      
      return newUser
    })
    
    const newUser = result
    
    // Generate JWT tokens
    const { accessToken, refreshToken } = await generateTokens({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    })
    
    // Create response with secure cookies
    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      data: {
        user: newUser,
        accessToken // Also send in response for immediate use
      }
    })
    
    // Set secure HTTP-only cookies
    response.cookies.set('auth-token', accessToken, {
      ...cookieConfig,
      maxAge: 60 * 60 // 1 hour for access token
    })
    
    response.cookies.set('refresh-token', refreshToken, {
      ...cookieConfig,
      maxAge: 60 * 60 * 24 * 7 // 7 days for refresh token
    })
    
    return response
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}