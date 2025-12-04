import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PrismaClient } from "@prisma/client"
import { 
  generateTokens, 
  comparePassword, 
  cookieConfig,
  validateAuthEnvironment 
} from "@/lib/jwt"

const prisma = new PrismaClient()

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
})

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    validateAuthEnvironment()
    
    const body = await request.json()
    
    // Validate input
    const validatedData = loginSchema.parse(body)
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: {
        email: validatedData.email
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        password: true
      }
    })
    
    // Check if user exists
    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await comparePassword(validatedData.password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user
    
    // Generate JWT tokens
    const { accessToken, refreshToken } = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    })
    
    // Create response with secure cookies
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
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
    
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}