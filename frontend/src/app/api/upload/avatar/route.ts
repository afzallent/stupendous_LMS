import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromRequest } from '@/lib/jwt'
import { db } from '@/lib/db'
import { 
  FILE_TYPES, 
  parseMultipartFormData, 
  validateUploadFile, 
  generateSecureFileName, 
  saveFileToDisk,
  deleteFile,
  getFileInfo 
} from '@/lib/file-upload'
import { z } from 'zod'

// Validation schema for avatar upload
const avatarUploadSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  replaceExisting: z.boolean().default(true)
})

/**
 * POST - Upload user avatar
 * Supports replacing existing avatar and comprehensive security validation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using the same pattern as middleware
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

    // Parse multipart form data
    const { files, fields, error: parseError } = await parseMultipartFormData(request)
    
    if (parseError) {
      return NextResponse.json(
        { success: false, error: parseError },
        { status: 400 }
      )
    }

    // Validate request data
    const requestData = avatarUploadSchema.parse({
      userId: fields.get('userId') || decoded.userId,
      replaceExisting: fields.get('replaceExisting') === 'true'
    })

    // Verify user can only upload their own avatar (unless admin)
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, avatar: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'ADMIN' && requestData.userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only upload your own avatar' },
        { status: 403 }
      )
    }

    // Check if avatar file is provided
    const avatarFile = files.get('avatar')
    if (!avatarFile) {
      return NextResponse.json(
        { success: false, error: 'No avatar file provided' },
        { status: 400 }
      )
    }

    // Validate the uploaded file
    const validation = await validateUploadFile(
      avatarFile.buffer,
      avatarFile.name,
      avatarFile.type,
      FILE_TYPES.AVATAR
    )

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Generate secure filename
    const secureFileName = generateSecureFileName(validation.sanitizedName!, requestData.userId)
    
    // Save file to disk
    const saveResult = await saveFileToDisk(
      avatarFile.buffer,
      secureFileName,
      'uploads/avatars'
    )

    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: 500 }
      )
    }

    // Delete old avatar if replacing and exists
    if (requestData.replaceExisting && user.avatar) {
      // Only delete if it's a file in our uploads directory (not external URLs)
      if (user.avatar.startsWith('/uploads/avatars/')) {
        await deleteFile(user.avatar.substring(1)) // Remove leading slash
      }
    }

    // Update user record in database
    const updatedUser = await db.user.update({
      where: { id: requestData.userId },
      data: { 
        avatar: saveResult.filePath,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true
      }
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: requestData.userId,
        action: 'AVATAR_UPDATED',
        details: `Avatar updated: ${secureFileName}`,
        metadata: {
          fileName: secureFileName,
          fileSize: saveResult.size,
          originalName: avatarFile.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: updatedUser,
        avatar: {
          url: saveResult.filePath,
          fileName: secureFileName,
          size: saveResult.size
        }
      }
    })

  } catch (error) {
    console.error('Avatar upload error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.issues.map(e => e.message)
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Avatar upload failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove user avatar
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication using the same pattern as middleware
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || decoded.userId

    // Verify user can only delete their own avatar (unless admin)
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, avatar: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'ADMIN' && userId !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only delete your own avatar' },
        { status: 403 }
      )
    }

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, avatar: true }
    })

    if (!targetUser || !targetUser.avatar) {
      return NextResponse.json(
        { success: false, error: 'No avatar to delete' },
        { status: 404 }
      )
    }

    // Delete file if it's in our uploads directory
    let fileDeleted = false
    if (targetUser.avatar.startsWith('/uploads/avatars/')) {
      fileDeleted = await deleteFile(targetUser.avatar.substring(1))
    }

    // Update user record to remove avatar reference
    await db.user.update({
      where: { id: userId },
      data: { 
        avatar: null,
        updatedAt: new Date()
      }
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: userId,
        action: 'AVATAR_DELETED',
        details: `Avatar deleted: ${targetUser.avatar}`,
        metadata: {
          fileDeleted,
          avatarPath: targetUser.avatar
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully',
      data: {
        fileDeleted
      }
    })

  } catch (error) {
    console.error('Avatar deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Avatar deletion failed' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get avatar info/status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get user avatar info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, avatar: true, name: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    let fileInfo: any = null
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      fileInfo = await getFileInfo(user.avatar.substring(1))
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        avatar: user.avatar,
        fileInfo: fileInfo || null
      }
    })

  } catch (error) {
    console.error('Avatar info error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get avatar info' },
      { status: 500 }
    )
  }
}