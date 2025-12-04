import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAccessToken } from '@/lib/jwt'
import { verifyAdminAccess } from '@/lib/admin-auth'

// GET - Fetch detailed ticket information with all messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id
    
    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID is required' },
        { status: 400 }
      )
    }

    // Try to verify admin access first
    let isAdmin = false
    let user = null
    
    try {
      const admin = await verifyAdminAccess(request)
      isAdmin = true
      user = admin
    } catch {
      // Not an admin, try regular user auth
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

      user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Build where clause based on user type
    const whereClause: any = { id: ticketId }
    
    if (!isAdmin) {
      // Regular users can only see their own tickets
      whereClause.userId = user.id
    }

    // Fetch the ticket with all details
    const ticket = await db.supportTicket.findUnique({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          },
          where: isAdmin ? {} : { isInternal: false } // Hide internal messages from regular users
        }
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found or access denied' },
        { status: 404 }
      )
    }

    // Mark messages as read by admin if this is an admin viewing
    if (isAdmin && user) {
      // This could be extended to track read status
      await db.activityLog.create({
        data: {
          userId: user.id,
          activityType: 'TICKET_VIEWED',
          description: `Viewed support ticket #${ticketId}`,
          metadata: {
            ticketId: ticket.id,
            ticketUserId: ticket.userId
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        isAdmin,
        canModify: isAdmin || ticket.userId === user?.id
      }
    })

  } catch (error) {
    console.error('Ticket details fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket details' },
      { status: 500 }
    )
  }
}