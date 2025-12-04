import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { extractTokenFromRequest, verifyAccessToken } from "@/lib/jwt"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Extract token from request
    const token = extractTokenFromRequest(request)
    
    if (!token) {
      return NextResponse.json(
        { error: "No authentication token provided" },
        { status: 401 }
      )
    }
    
    // Verify token
    const payload = await verifyAccessToken(token)
    
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      )
    }
    
    // Get current user data from database
    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user
    })
    
  } catch (error) {
    console.error("Auth verification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}