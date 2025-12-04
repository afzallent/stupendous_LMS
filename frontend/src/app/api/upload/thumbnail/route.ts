import { NextRequest, NextResponse } from 'next/server'
import { verifyInstructorAccess } from '@/lib/instructor-auth'
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

// Validation schema for thumbnail upload
const thumbnailUploadSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  replaceExisting: z.boolean().default(true)
})

/**
 * POST - Upload course thumbnail
 * Only instructors can upload thumbnails for their own courses
 */
export async function POST(request: NextRequest) {
  try {
    // Verify instructor access
    const instructor = await verifyInstructorAccess(request)

    // Parse multipart form data
    const { files, fields, error: parseError } = await parseMultipartFormData(request)
    
    if (parseError) {
      return NextResponse.json(
        { success: false, error: parseError },
        { status: 400 }
      )
    }

    // Validate request data
    const requestData = thumbnailUploadSchema.parse({
      courseId: fields.get('courseId'),
      replaceExisting: fields.get('replaceExisting') === 'true'
    })

    // Verify course ownership (instructors can only upload for their own courses unless admin)
    const course = await db.course.findUnique({
      where: { id: requestData.courseId },
      select: { 
        id: true, 
        trainerId: true, 
        thumbnail: true,
        title: true,
        status: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    if (instructor.role !== 'ADMIN' && course.trainerId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only upload thumbnails for your own courses' },
        { status: 403 }
      )
    }

    // Check if thumbnail file is provided
    const thumbnailFile = files.get('thumbnail')
    if (!thumbnailFile) {
      return NextResponse.json(
        { success: false, error: 'No thumbnail file provided' },
        { status: 400 }
      )
    }

    // Validate the uploaded file
    const validation = await validateUploadFile(
      thumbnailFile.buffer,
      thumbnailFile.name,
      thumbnailFile.type,
      FILE_TYPES.IMAGE
    )

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Generate secure filename with course ID prefix
    const secureFileName = generateSecureFileName(validation.sanitizedName!, `course_${requestData.courseId}`)
    
    // Save file to disk
    const saveResult = await saveFileToDisk(
      thumbnailFile.buffer,
      secureFileName,
      'uploads/thumbnails'
    )

    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: 500 }
      )
    }

    // Delete old thumbnail if replacing and exists
    if (requestData.replaceExisting && course.thumbnail) {
      // Only delete if it's a file in our uploads directory
      if (course.thumbnail.startsWith('/uploads/thumbnails/')) {
        await deleteFile(course.thumbnail.substring(1)) // Remove leading slash
      }
    }

    // Update course record in database
    const updatedCourse = await db.course.update({
      where: { id: requestData.courseId },
      data: { 
        thumbnail: saveResult.filePath,
        updatedAt: new Date()
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        status: true,
        updatedAt: true
      }
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: instructor.id,
        action: 'COURSE_THUMBNAIL_UPDATED',
        details: `Thumbnail updated for course: ${course.title}`,
        metadata: {
          courseId: requestData.courseId,
          fileName: secureFileName,
          fileSize: saveResult.size,
          originalName: thumbnailFile.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Course thumbnail uploaded successfully',
      data: {
        course: updatedCourse,
        thumbnail: {
          url: saveResult.filePath,
          fileName: secureFileName,
          size: saveResult.size
        }
      }
    })

  } catch (error) {
    console.error('Thumbnail upload error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.errors.map(e => e.message)
        },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && (
      error.message.includes('Authentication required') ||
      error.message.includes('Instructor access required') ||
      error.message.includes('Authorization failed')
    )) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Thumbnail upload failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove course thumbnail
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify instructor access
    const instructor = await verifyInstructorAccess(request)

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID required' },
        { status: 400 }
      )
    }

    // Verify course ownership
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { 
        id: true, 
        trainerId: true, 
        thumbnail: true,
        title: true 
      }
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    if (instructor.role !== 'ADMIN' && course.trainerId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only delete thumbnails from your own courses' },
        { status: 403 }
      )
    }

    if (!course.thumbnail) {
      return NextResponse.json(
        { success: false, error: 'No thumbnail to delete' },
        { status: 404 }
      )
    }

    // Delete file if it's in our uploads directory
    let fileDeleted = false
    if (course.thumbnail.startsWith('/uploads/thumbnails/')) {
      fileDeleted = await deleteFile(course.thumbnail.substring(1))
    }

    // Update course record to remove thumbnail reference
    await db.course.update({
      where: { id: courseId },
      data: { 
        thumbnail: null,
        updatedAt: new Date()
      }
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: instructor.id,
        action: 'COURSE_THUMBNAIL_DELETED',
        details: `Thumbnail deleted for course: ${course.title}`,
        metadata: {
          courseId,
          fileDeleted,
          thumbnailPath: course.thumbnail
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Course thumbnail deleted successfully',
      data: {
        fileDeleted
      }
    })

  } catch (error) {
    console.error('Thumbnail deletion error:', error)
    
    if (error instanceof Error && (
      error.message.includes('Authentication required') ||
      error.message.includes('Instructor access required') ||
      error.message.includes('Authorization failed')
    )) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Thumbnail deletion failed' },
      { status: 500 }
    )
  }
}

/**
 * GET - Get course thumbnail info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID required' },
        { status: 400 }
      )
    }

    // Get course thumbnail info (public endpoint, no auth required for viewing)
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { 
        id: true, 
        title: true,
        thumbnail: true,
        status: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      )
    }

    let fileInfo = null
    if (course.thumbnail && course.thumbnail.startsWith('/uploads/thumbnails/')) {
      fileInfo = await getFileInfo(course.thumbnail.substring(1))
    }

    return NextResponse.json({
      success: true,
      data: {
        courseId: course.id,
        courseTitle: course.title,
        courseStatus: course.status,
        thumbnail: course.thumbnail,
        fileInfo: fileInfo || null
      }
    })

  } catch (error) {
    console.error('Thumbnail info error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get thumbnail info' },
      { status: 500 }
    )
  }
}