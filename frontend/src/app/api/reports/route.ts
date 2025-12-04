import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAccessToken } from '@/lib/jwt'
import { z } from 'zod'

const reportSchema = z.object({
  contentType: z.enum(['COURSE', 'REVIEW', 'USER', 'LESSON']),
  contentId: z.string(),
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM')
})

// POST - Create a content report
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = verifyAccessToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = reportSchema.parse(body)

    // Check if the content exists based on type
    let contentExists = false
    let contentTitle = 'Unknown Content'
    
    try {
      switch (validatedData.contentType) {
        case 'COURSE':
          const course = await db.course.findUnique({
            where: { id: validatedData.contentId },
            select: { title: true }
          })
          contentExists = !!course
          contentTitle = course?.title || contentTitle
          break
        case 'REVIEW':
          const review = await db.review.findUnique({
            where: { id: validatedData.contentId }
          })
          contentExists = !!review
          contentTitle = 'Course Review'
          break
        case 'USER':
          const reportedUser = await db.user.findUnique({
            where: { id: validatedData.contentId },
            select: { name: true }
          })
          contentExists = !!reportedUser
          contentTitle = reportedUser?.name || contentTitle
          break
        case 'LESSON':
          const lesson = await db.lesson.findUnique({
            where: { id: validatedData.contentId },
            select: { title: true }
          })
          contentExists = !!lesson
          contentTitle = lesson?.title || contentTitle
          break
      }
    } catch (error) {
      console.error('Error checking content existence:', error)
    }

    if (!contentExists) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    // Check if user has already reported this content
    const existingReport = await db.contentReport.findFirst({
      where: {
        contentType: validatedData.contentType,
        contentId: validatedData.contentId,
        reporterId: user.id,
        status: {
          in: ['PENDING', 'UNDER_REVIEW']
        }
      }
    })

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this content' },
        { status: 400 }
      )
    }

    // Create the report
    const report = await db.contentReport.create({
      data: {
        contentType: validatedData.contentType,
        contentId: validatedData.contentId,
        reporterId: user.id,
        reason: validatedData.reason,
        description: validatedData.description,
        severity: validatedData.severity
      },
      include: {
        reporter: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Log the report creation
    await db.activityLog.create({
      data: {
        userId: user.id,
        activityType: 'CONTENT_REPORTED',
        description: `Reported ${validatedData.contentType.toLowerCase()}: ${contentTitle}`,
        metadata: {
          reportId: report.id,
          contentType: validatedData.contentType,
          contentId: validatedData.contentId,
          reason: validatedData.reason,
          severity: validatedData.severity
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        message: 'Content reported successfully. Our moderation team will review it shortly.'
      }
    })

  } catch (error) {
    console.error('Content report error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create report' },
      { status: 500 }
    )
  }
}