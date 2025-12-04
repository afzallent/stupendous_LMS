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
  getFileInfo,
  ensureUploadDir 
} from '@/lib/file-upload'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'

// Validation schema for video upload
const videoUploadSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  replaceExisting: z.boolean().default(true),
  // Chunked upload parameters
  chunkIndex: z.number().min(0).optional(),
  totalChunks: z.number().min(1).optional(),
  fileName: z.string().min(1).optional(),
  uploadId: z.string().optional() // For tracking multi-chunk uploads
})

/**
 * POST - Upload lesson video (supports chunked uploads for large files)
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
    const requestData = videoUploadSchema.parse({
      lessonId: fields.get('lessonId'),
      courseId: fields.get('courseId'),
      replaceExisting: fields.get('replaceExisting') === 'true',
      chunkIndex: fields.get('chunkIndex') ? parseInt(fields.get('chunkIndex')!) : undefined,
      totalChunks: fields.get('totalChunks') ? parseInt(fields.get('totalChunks')!) : undefined,
      fileName: fields.get('fileName') || undefined,
      uploadId: fields.get('uploadId') || undefined
    })

    // Verify course and lesson ownership
    const lesson = await db.lesson.findUnique({
      where: { id: requestData.lessonId },
      include: {
        course: {
          select: { 
            id: true, 
            trainerId: true, 
            title: true 
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      )
    }

    if (lesson.course.id !== requestData.courseId) {
      return NextResponse.json(
        { success: false, error: 'Lesson does not belong to specified course' },
        { status: 400 }
      )
    }

    if (instructor.role !== 'ADMIN' && lesson.course.trainerId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only upload videos for your own courses' },
        { status: 403 }
      )
    }

    const isChunkedUpload = requestData.chunkIndex !== undefined && requestData.totalChunks !== undefined

    if (isChunkedUpload) {
      return await handleChunkedUpload(request, requestData, lesson, instructor, files)
    } else {
      return await handleDirectUpload(request, requestData, lesson, instructor, files)
    }

  } catch (error) {
    console.error('Video upload error:', error)
    
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
      { success: false, error: 'Video upload failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle direct video upload (single file, smaller videos)
 */
async function handleDirectUpload(
  request: NextRequest,
  requestData: any,
  lesson: any,
  instructor: any,
  files: Map<string, any>
) {
  // Check if video file is provided
  const videoFile = files.get('video')
  if (!videoFile) {
    return NextResponse.json(
      { success: false, error: 'No video file provided' },
      { status: 400 }
    )
  }

  // Validate the uploaded file
  const validation = await validateUploadFile(
    videoFile.buffer,
    videoFile.name,
    videoFile.type,
    FILE_TYPES.VIDEO
  )

  if (!validation.isValid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    )
  }

  // Generate secure filename
  const secureFileName = generateSecureFileName(validation.sanitizedName!, `lesson_${requestData.lessonId}`)
  
  // Save file to disk
  const saveResult = await saveFileToDisk(
    videoFile.buffer,
    secureFileName,
    'uploads/videos'
  )

  if (!saveResult.success) {
    return NextResponse.json(
      { success: false, error: saveResult.error },
      { status: 500 }
    )
  }

  // Delete old video if replacing and exists
  if (requestData.replaceExisting && lesson.videoUrl) {
    if (lesson.videoUrl.startsWith('/uploads/videos/')) {
      await deleteFile(lesson.videoUrl.substring(1))
    }
  }

  // Update lesson record in database
  const updatedLesson = await db.lesson.update({
    where: { id: requestData.lessonId },
    data: { 
      videoUrl: saveResult.filePath,
      updatedAt: new Date()
    },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      duration: true,
      course: {
        select: {
          id: true,
          title: true
        }
      }
    }
  })

  // Log the activity
  await db.activityLog.create({
    data: {
      userId: instructor.id,
      action: 'LESSON_VIDEO_UPLOADED',
      details: `Video uploaded for lesson: ${lesson.title} in course: ${lesson.course.title}`,
      metadata: {
        courseId: requestData.courseId,
        lessonId: requestData.lessonId,
        fileName: secureFileName,
        fileSize: saveResult.size,
        originalName: videoFile.name,
        uploadType: 'direct'
      }
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Video uploaded successfully',
    data: {
      lesson: updatedLesson,
      video: {
        url: saveResult.filePath,
        fileName: secureFileName,
        size: saveResult.size
      }
    }
  })
}

/**
 * Handle chunked video upload (for large files)
 */
async function handleChunkedUpload(
  request: NextRequest,
  requestData: any,
  lesson: any,
  instructor: any,
  files: Map<string, any>
) {
  const { chunkIndex, totalChunks, fileName, uploadId, lessonId } = requestData

  // Generate upload ID if not provided
  const actualUploadId = uploadId || `${lessonId}_${Date.now()}`
  
  // Ensure temp directory exists
  if (!ensureUploadDir('uploads/temp')) {
    return NextResponse.json(
      { success: false, error: 'Failed to create temporary directory' },
      { status: 500 }
    )
  }

  const chunkFile = files.get('chunk') || files.get('video')
  if (!chunkFile) {
    return NextResponse.json(
      { success: false, error: 'No chunk file provided' },
      { status: 400 }
    )
  }

  // Save chunk to temporary file
  const chunkFileName = `${actualUploadId}_chunk_${chunkIndex}`
  const tempChunkPath = path.join(process.cwd(), 'public', 'uploads', 'temp', chunkFileName)
  
  try {
    await fs.promises.writeFile(tempChunkPath, chunkFile.buffer)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save chunk' },
      { status: 500 }
    )
  }

  // If this is the last chunk, assemble the complete file
  if (chunkIndex === totalChunks - 1) {
    return await assembleChunkedFile(actualUploadId, totalChunks, fileName || 'video.mp4', requestData, lesson, instructor)
  } else {
    // Return progress for intermediate chunks
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded`,
      data: {
        uploadId: actualUploadId,
        chunkIndex,
        totalChunks,
        progress: Math.round(((chunkIndex + 1) / totalChunks) * 100)
      }
    })
  }
}

/**
 * Assemble chunked file into final video file
 */
async function assembleChunkedFile(
  uploadId: string,
  totalChunks: number,
  fileName: string,
  requestData: any,
  lesson: any,
  instructor: any
) {
  try {
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
    const chunks = []

    // Read all chunks in order
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${uploadId}_chunk_${i}`)
      
      if (!fs.existsSync(chunkPath)) {
        throw new Error(`Missing chunk ${i}`)
      }
      
      const chunkBuffer = await fs.promises.readFile(chunkPath)
      chunks.push(chunkBuffer)
    }

    // Combine all chunks
    const completeBuffer = Buffer.concat(chunks)

    // Validate the complete file (basic validation for chunked files)
    if (completeBuffer.length === 0) {
      throw new Error('Empty file after assembly')
    }

    // Generate secure filename
    const secureFileName = generateSecureFileName(fileName, `lesson_${requestData.lessonId}`)
    
    // Save complete file
    const saveResult = await saveFileToDisk(
      completeBuffer,
      secureFileName,
      'uploads/videos'
    )

    if (!saveResult.success) {
      throw new Error(saveResult.error)
    }

    // Clean up chunk files
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${uploadId}_chunk_${i}`)
      try {
        await fs.promises.unlink(chunkPath)
      } catch (error) {
        console.warn(`Failed to delete chunk ${i}:`, error)
      }
    }

    // Delete old video if replacing
    if (requestData.replaceExisting && lesson.videoUrl) {
      if (lesson.videoUrl.startsWith('/uploads/videos/')) {
        await deleteFile(lesson.videoUrl.substring(1))
      }
    }

    // Update lesson record
    const updatedLesson = await db.lesson.update({
      where: { id: requestData.lessonId },
      data: { 
        videoUrl: saveResult.filePath,
        updatedAt: new Date()
      },
      select: {
        id: true,
        title: true,
        videoUrl: true,
        duration: true,
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: instructor.id,
        action: 'LESSON_VIDEO_UPLOADED',
        details: `Chunked video uploaded for lesson: ${lesson.title} in course: ${lesson.course.title}`,
        metadata: {
          courseId: requestData.courseId,
          lessonId: requestData.lessonId,
          fileName: secureFileName,
          fileSize: saveResult.size,
          originalName: fileName,
          uploadType: 'chunked',
          totalChunks
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Video uploaded successfully (chunked)',
      data: {
        lesson: updatedLesson,
        video: {
          url: saveResult.filePath,
          fileName: secureFileName,
          size: saveResult.size
        },
        uploadStats: {
          totalChunks,
          assembledSize: completeBuffer.length
        }
      }
    })

  } catch (error) {
    console.error('Chunk assembly error:', error)
    
    // Clean up failed chunks
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp')
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `${uploadId}_chunk_${i}`)
      try {
        await fs.promises.unlink(chunkPath)
      } catch (cleanupError) {
        console.warn(`Failed to cleanup chunk ${i}:`, cleanupError)
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to assemble video chunks' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove lesson video
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify instructor access
    const instructor = await verifyInstructorAccess(request)

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: 'Lesson ID required' },
        { status: 400 }
      )
    }

    // Verify lesson ownership
    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: { 
            id: true, 
            trainerId: true, 
            title: true 
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      )
    }

    if (instructor.role !== 'ADMIN' && lesson.course.trainerId !== instructor.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Can only delete videos from your own courses' },
        { status: 403 }
      )
    }

    if (!lesson.videoUrl) {
      return NextResponse.json(
        { success: false, error: 'No video to delete' },
        { status: 404 }
      )
    }

    // Delete file if it's in our uploads directory
    let fileDeleted = false
    if (lesson.videoUrl.startsWith('/uploads/videos/')) {
      fileDeleted = await deleteFile(lesson.videoUrl.substring(1))
    }

    // Update lesson record to remove video reference
    await db.lesson.update({
      where: { id: lessonId },
      data: { 
        videoUrl: null,
        updatedAt: new Date()
      }
    })

    // Log the activity
    await db.activityLog.create({
      data: {
        userId: instructor.id,
        action: 'LESSON_VIDEO_DELETED',
        details: `Video deleted for lesson: ${lesson.title} in course: ${lesson.course.title}`,
        metadata: {
          courseId: lesson.course.id,
          lessonId,
          fileDeleted,
          videoPath: lesson.videoUrl
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      data: {
        fileDeleted
      }
    })

  } catch (error) {
    console.error('Video deletion error:', error)
    
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
      { success: false, error: 'Video deletion failed' },
      { status: 500 }
    )
  }
}