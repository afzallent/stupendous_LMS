import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { verifyAccessToken, extractTokenFromRequest } from '@/lib/jwt'

const prisma = new PrismaClient()

// Validation schema for profile update
const updateProfileSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal(""))
})

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = extractTokenFromRequest(request)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = await verifyAccessToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate the input
    const validatedData = updateProfileSchema.parse(body)
    
    // Ensure user can only update their own profile (unless admin)
    if (decoded.role !== 'ADMIN' && validatedData.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only update your own profile' },
        { status: 403 }
      )
    }
    
    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: {
        id: validatedData.userId
      },
      data: {
        name: validatedData.name,
        bio: validatedData.bio,
        // Note: phone, location, website would need to be added to the User model
        // For now, we'll just update the basic fields that exist
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: "Validation failed", 
          details: error.issues 
        },
        { status: 400 }
      )
    }

    console.error("Profile update error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}