import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import { db } from '@/lib/db'
import { getFileInfo } from '@/lib/file-upload'
import path from 'path'
import fs from 'fs'

/**
 * GET - Serve uploaded files with proper access controls
 * Route: /api/files/[...path]
 * Supports streaming for large video files and access control for private content
 */
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const filePath = params.path.join('/')
    const { searchParams } = new URL(request.url)
    
    // Validate file path
    if (!filePath || filePath.includes('..') || filePath.includes('\\')) {
      return new NextResponse('Invalid file path', { status: 400 })
    }

    // Determine file type and access level from path
    const pathSegments = filePath.split('/')
    const category = pathSegments[0] // avatars, thumbnails, videos
    
    if (!['avatars', 'thumbnails', 'videos'].includes(category)) {
      return new NextResponse('Invalid file category', { status: 400 })
    }

    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath)
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Get file info
    const fileInfo = await getFileInfo(`uploads/${filePath}`)
    if (!fileInfo.exists) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Apply access control based on file type
    const accessCheck = await checkFileAccess(request, category, filePath)
    if (!accessCheck.allowed) {
      return new NextResponse(accessCheck.reason, { status: accessCheck.status })
    }

    // Get file stats
    const stats = await fs.promises.stat(fullPath)
    const fileSize = stats.size
    const mimeType = fileInfo.mimeType || 'application/octet-stream'

    // Handle range requests for streaming (important for video files)
    const range = request.headers.get('range')
    
    if (range) {
      return handleRangeRequest(fullPath, range, fileSize, mimeType)
    } else {
      return handleFullFileRequest(fullPath, fileSize, mimeType)
    }

  } catch (error) {
    console.error('File serving error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

/**
 * Check access permissions for different file types
 */
async function checkFileAccess(request: NextRequest, category: string, filePath: string): Promise<{
  allowed: boolean
  reason?: string
  status?: number
}> {
  try {
    // Public access for thumbnails (course preview images)
    if (category === 'thumbnails') {
      return { allowed: true }
    }

    // Get authentication token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : request.cookies.get('token')?.value

    if (!token) {
      return { 
        allowed: false, 
        reason: 'Authentication required', 
        status: 401 
      }
    }

    const decoded = verifyAccessToken(token)
    if (!decoded || !decoded.userId) {
      return { 
        allowed: false, 
        reason: 'Invalid token', 
        status: 401 
      }
    }

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true }
    })

    if (!user) {
      return { 
        allowed: false, 
        reason: 'User not found', 
        status: 404 
      }
    }

    // Admins have access to all files
    if (user.role === 'ADMIN') {
      return { allowed: true }
    }

    // Avatar access control
    if (category === 'avatars') {
      // Extract user ID from filename (format: userId_timestamp_random.ext)
      const fileName = path.basename(filePath)
      const fileUserId = fileName.split('_')[0]
      
      // Users can access their own avatars, or any avatar if it's being viewed publicly
      if (fileUserId === user.id) {
        return { allowed: true }
      }
      
      // Check if this is a public profile view (avatar access is generally more permissive)
      return { allowed: true }
    }

    // Video access control
    if (category === 'videos') {
      // Extract lesson ID from filename (format: lesson_lessonId_timestamp_random.ext)
      const fileName = path.basename(filePath)
      const matches = fileName.match(/lesson_([^_]+)_/)
      
      if (!matches) {
        return { 
          allowed: false, 
          reason: 'Invalid video file format', 
          status: 400 
        }
      }
      
      const lessonId = matches[1]
      
      // Check if user has access to this lesson
      const lesson = await db.lesson.findUnique({
        where: { id: lessonId },
        include: {
          course: {
            include: {
              enrollments: {
                where: { studentId: user.id },
                select: { id: true }
              }
            }
          }
        }
      })

      if (!lesson) {
        return { 
          allowed: false, 
          reason: 'Lesson not found', 
          status: 404 
        }
      }

      // Allow access if user is the instructor
      if (lesson.course.trainerId === user.id) {
        return { allowed: true }
      }

      // Allow access if user is enrolled in the course
      if (lesson.course.enrollments.length > 0) {
        return { allowed: true }
      }

      return { 
        allowed: false, 
        reason: 'Access denied: Not enrolled in course', 
        status: 403 
      }
    }

    return { 
      allowed: false, 
      reason: 'Unknown file category', 
      status: 400 
    }

  } catch (error) {
    console.error('Access check error:', error)
    return { 
      allowed: false, 
      reason: 'Access check failed', 
      status: 500 
    }
  }
}

/**
 * Handle HTTP Range requests for streaming large files
 */
async function handleRangeRequest(
  filePath: string, 
  range: string, 
  fileSize: number, 
  mimeType: string
): Promise<NextResponse> {
  const parts = range.replace(/bytes=/, '').split('-')
  const start = parseInt(parts[0], 10)
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
  const chunkSize = (end - start) + 1

  if (start >= fileSize || end >= fileSize || start > end) {
    return new NextResponse('Range not satisfiable', { 
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`
      }
    })
  }

  // Create a readable stream for the requested range
  const stream = fs.createReadStream(filePath, { start, end })
  
  // Convert Node.js readable stream to Web Stream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      
      stream.on('end', () => {
        controller.close()
      })
      
      stream.on('error', (error) => {
        controller.error(error)
      })
    }
  })

  return new NextResponse(webStream, {
    status: 206,
    headers: {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize.toString(),
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

/**
 * Handle full file requests (non-range)
 */
async function handleFullFileRequest(
  filePath: string, 
  fileSize: number, 
  mimeType: string
): Promise<NextResponse> {
  // For small files, read entirely into memory
  if (fileSize < 10 * 1024 * 1024) { // 10MB threshold
    const fileBuffer = await fs.promises.readFile(filePath)
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes'
      }
    })
  }

  // For large files, use streaming
  const stream = fs.createReadStream(filePath)
  
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      
      stream.on('end', () => {
        controller.close()
      })
      
      stream.on('error', (error) => {
        controller.error(error)
      })
    }
  })

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': fileSize.toString(),
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes'
    }
  })
}

/**
 * POST - Get file metadata and access info
 */
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const filePath = params.path.join('/')
    
    if (!filePath || filePath.includes('..') || filePath.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      )
    }

    const pathSegments = filePath.split('/')
    const category = pathSegments[0]
    
    if (!['avatars', 'thumbnails', 'videos'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file category' },
        { status: 400 }
      )
    }

    // Check access
    const accessCheck = await checkFileAccess(request, category, filePath)
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { success: false, error: accessCheck.reason },
        { status: accessCheck.status || 403 }
      )
    }

    // Get file info
    const fileInfo = await getFileInfo(`uploads/${filePath}`)
    if (!fileInfo.exists) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath)
    const stats = await fs.promises.stat(fullPath)

    return NextResponse.json({
      success: true,
      data: {
        path: filePath,
        category,
        size: fileInfo.size,
        mimeType: fileInfo.mimeType,
        lastModified: stats.mtime.toISOString(),
        accessLevel: category === 'thumbnails' ? 'public' : 'private'
      }
    })

  } catch (error) {
    console.error('File metadata error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get file metadata' },
      { status: 500 }
    )
  }
}