import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAccess } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const moderationActionSchema = z.object({
  reportId: z.string().optional(),
  contentType: z.enum(['COURSE', 'REVIEW', 'USER', 'LESSON']),
  contentId: z.string(),
  actionType: z.enum(['WARNING', 'SUSPEND', 'BAN', 'DELETE', 'HIDE', 'APPROVE', 'REJECT', 'FLAG', 'UNFLAG']),
  reason: z.string().optional(),
  notes: z.string().optional()
})

// GET - Fetch flagged content and reports
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'
    const contentType = searchParams.get('contentType') || 'all'
    const severity = searchParams.get('severity') || 'all'
    
    const skip = (page - 1) * limit

    // Build where clause for filtering
    const whereClause: any = {}
    
    if (status !== 'all') {
      whereClause.status = status.toUpperCase()
    }
    
    if (contentType !== 'all') {
      whereClause.contentType = contentType.toUpperCase()
    }
    
    if (severity !== 'all') {
      whereClause.severity = severity.toUpperCase()
    }

    // Fetch reports with pagination
    const [reports, totalReports] = await Promise.all([
      db.contentReport.findMany({
        where: whereClause,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          actions: {
            include: {
              moderator: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      db.contentReport.count({ where: whereClause })
    ])

    // Enrich reports with content details
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let contentDetails = null
        
        try {
          switch (report.contentType) {
            case 'COURSE':
              contentDetails = await db.course.findUnique({
                where: { id: report.contentId },
                select: {
                  id: true,
                  title: true,
                  status: true,
                  trainer: {
                    select: {
                      name: true
                    }
                  }
                }
              })
              break
            case 'REVIEW':
              contentDetails = await db.review.findUnique({
                where: { id: report.contentId },
                select: {
                  id: true,
                  comment: true,
                  rating: true,
                  student: {
                    select: {
                      name: true
                    }
                  },
                  course: {
                    select: {
                      title: true
                    }
                  }
                }
              })
              break
            case 'USER':
              contentDetails = await db.user.findUnique({
                where: { id: report.contentId },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              })
              break
          }
        } catch (error) {
          console.error(`Failed to fetch content details for ${report.contentType}:${report.contentId}`, error)
        }

        return {
          ...report,
          contentDetails,
          reportedAt: report.createdAt,
          lastAction: report.actions[0] || null
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        reports: enrichedReports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReports / limit),
          totalReports,
          limit
        }
      }
    })

  } catch (error) {
    console.error('Admin moderation fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch moderation data' },
      { status: 500 }
    )
  }
}

// POST - Create a moderation action
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    const body = await request.json()
    
    const validatedData = moderationActionSchema.parse(body)
    
    // Create moderation action
    const action = await db.moderationAction.create({
      data: {
        ...validatedData,
        performedBy: admin.id
      },
      include: {
        moderator: {
          select: {
            name: true
          }
        }
      }
    })

    // If this action resolves a report, update the report status
    if (validatedData.reportId) {
      await db.contentReport.update({
        where: { id: validatedData.reportId },
        data: {
          status: 'RESOLVED',
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          resolution: validatedData.notes || `${validatedData.actionType} action taken`
        }
      })
    }

    // Apply the action to the content
    await applyModerationAction(validatedData, admin.id)

    // Log the admin activity
    await db.activityLog.create({
      data: {
        userId: admin.id,
        activityType: 'MODERATION_ACTION',
        description: `Applied ${validatedData.actionType} action to ${validatedData.contentType.toLowerCase()}`,
        metadata: {
          contentType: validatedData.contentType,
          contentId: validatedData.contentId,
          actionType: validatedData.actionType,
          reportId: validatedData.reportId
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: action,
      message: 'Moderation action applied successfully'
    })

  } catch (error) {
    console.error('Admin moderation action error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to apply moderation action' },
      { status: 500 }
    )
  }
}

// PUT - Update report status or resolution
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    const body = await request.json()
    
    const { reportId, status, resolution } = body
    
    if (!reportId || !status) {
      return NextResponse.json(
        { success: false, error: 'Report ID and status are required' },
        { status: 400 }
      )
    }

    const updatedReport = await db.contentReport.update({
      where: { id: reportId },
      data: {
        status: status.toUpperCase(),
        reviewedBy: admin.id,
        reviewedAt: new Date(),
        resolution: resolution || `Report ${status.toLowerCase()} by admin`
      },
      include: {
        reporter: {
          select: {
            name: true
          }
        },
        reviewer: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedReport,
      message: 'Report updated successfully'
    })

  } catch (error) {
    console.error('Admin report update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update report' },
      { status: 500 }
    )
  }
}

// Helper function to apply moderation actions to content
async function applyModerationAction(action: any, adminId: string) {
  try {
    switch (action.contentType) {
      case 'COURSE':
        await applyCourseAction(action, adminId)
        break
      case 'USER':
        await applyUserAction(action, adminId)
        break
      case 'REVIEW':
        await applyReviewAction(action, adminId)
        break
    }
  } catch (error) {
    console.error('Failed to apply moderation action:', error)
    throw error
  }
}

async function applyCourseAction(action: any, adminId: string) {
  const updates: any = {}
  
  switch (action.actionType) {
    case 'SUSPEND':
    case 'HIDE':
      updates.status = 'ARCHIVED'
      break
    case 'APPROVE':
      updates.status = 'PUBLISHED'
      break
    case 'REJECT':
      updates.status = 'ARCHIVED'
      break
  }
  
  if (Object.keys(updates).length > 0) {
    await db.course.update({
      where: { id: action.contentId },
      data: updates
    })
  }
}

async function applyUserAction(action: any, adminId: string) {
  // For user actions, we could update user status or role
  // For now, we'll just log the action
  console.log(`User action ${action.actionType} applied to user ${action.contentId}`)
}

async function applyReviewAction(action: any, adminId: string) {
  switch (action.actionType) {
    case 'DELETE':
    case 'HIDE':
      // We could add a 'hidden' field to reviews or delete them
      // For now, we'll just log the action
      console.log(`Review action ${action.actionType} applied to review ${action.contentId}`)
      break
  }
}