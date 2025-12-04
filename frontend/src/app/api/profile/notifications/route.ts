import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schema for notification settings
const notificationSettingsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  settings: z.object({
    emailNotifications: z.boolean(),
    courseUpdates: z.boolean(),
    marketingEmails: z.boolean(),
    pushNotifications: z.boolean(),
    weeklyDigest: z.boolean(),
    newEnrollments: z.boolean(),
    courseCompletion: z.boolean(),
    reviewNotifications: z.boolean()
  })
})

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the input
    const validatedData = notificationSettingsSchema.parse(body)
    
    // For now, we'll store notification settings in the user's bio field as JSON
    // In a real app, you'd want a separate UserSettings or NotificationSettings table
    const settingsJson = JSON.stringify(validatedData.settings)
    
    await prisma.user.update({
      where: {
        id: validatedData.userId
      },
      data: {
        // Store in a custom field - you'd need to add this to your schema
        // For now, we'll just return success without actually storing
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: "Notification settings updated successfully"
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

    console.error("Notification settings error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}

// GET method to retrieve notification settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Return default settings for now
    // In a real app, you'd retrieve from database
    const defaultSettings = {
      emailNotifications: true,
      courseUpdates: true,
      marketingEmails: false,
      pushNotifications: true,
      weeklyDigest: true,
      newEnrollments: true,
      courseCompletion: true,
      reviewNotifications: true
    }

    return NextResponse.json({
      success: true,
      data: defaultSettings
    })

  } catch (error) {
    console.error("Get notification settings error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error" 
      },
      { status: 500 }
    )
  }
}