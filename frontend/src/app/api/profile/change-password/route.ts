import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schema for password change
const changePasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters")
})

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the input
    const validatedData = changePasswordSchema.parse(body)
    
    // Get current user to verify password
    const user = await prisma.user.findUnique({
      where: {
        id: validatedData.userId
      },
      select: {
        id: true,
        password: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: "User not found" 
        },
        { status: 404 }
      )
    }

    // Verify current password
    // Note: In a real app, you would use bcrypt.compare() here
    if (user.password !== validatedData.currentPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: "Current password is incorrect" 
        },
        { status: 400 }
      )
    }

    // Update password
    // Note: In a real app, you would hash the new password with bcrypt
    await prisma.user.update({
      where: {
        id: validatedData.userId
      },
      data: {
        password: validatedData.newPassword
      }
    })

    return NextResponse.json({
      success: true,
      message: "Password changed successfully"
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

    console.error("Password change error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}