import { NextRequest, NextResponse } from "next/server"
import { extractTokenFromRequest, verifyAccessToken } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  try {
    // Extract token to verify it exists (optional validation)
    const token = extractTokenFromRequest(request)
    
    if (token) {
      // Verify token to ensure it's valid before logout
      const payload = await verifyAccessToken(token)
      
      if (payload) {
        // In a production environment, you might want to:
        // 1. Add the token to a blacklist/blocklist in Redis or database
        // 2. Log the logout event for security auditing
        console.log(`User ${payload.userId} logged out at ${new Date().toISOString()}`)
      }
    }
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully"
    })
    
    // Clear authentication cookies
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Immediately expire
      path: '/'
    })
    
    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Immediately expire
      path: '/'
    })
    
    return response
    
  } catch (error) {
    console.error("Logout error:", error)
    
    // Even if there's an error, we should still clear cookies
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully"
    })
    
    // Clear cookies
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })
    
    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })
    
    return response
  }
}