import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAccess } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Validation schemas
const updateTicketSchema = z.object({
  ticketId: z.string(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  resolution: z.string().optional()
})

const addMessageSchema = z.object({
  ticketId: z.string(),
  message: z.string().min(1, 'Message cannot be empty'),
  isInternal: z.boolean().default(false)
})

// GET - Fetch support tickets
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'
    const priority = searchParams.get('priority') || 'all'
    const category = searchParams.get('category') || 'all'
    const assignedTo = searchParams.get('assignedTo') || 'all'
    const search = searchParams.get('search') || ''
    
    const skip = (page - 1) * limit

    // Build where clause for filtering
    const whereClause: any = {}
    
    if (status !== 'all') {
      whereClause.status = status.toUpperCase()
    }
    
    if (priority !== 'all') {
      whereClause.priority = priority.toUpperCase()
    }
    
    if (category !== 'all') {
      whereClause.category = category.toUpperCase()
    }
    
    if (assignedTo !== 'all') {
      if (assignedTo === 'unassigned') {
        whereClause.assignedTo = null
      } else {
        whereClause.assignedTo = assignedTo
      }
    }

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Fetch tickets with pagination
    const [tickets, totalTickets] = await Promise.all([
      db.supportTicket.findMany({
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
                  role: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1 // Get only the latest message for overview
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      db.supportTicket.count({ where: whereClause })
    ])

    // Calculate ticket statistics
    const stats = await db.supportTicket.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const ticketStats = {
      total: totalTickets,
      open: 0,
      inProgress: 0,
      waitingForUser: 0,
      resolved: 0,
      closed: 0
    }

    stats.forEach(stat => {
      switch (stat.status) {
        case 'OPEN':
          ticketStats.open = stat._count.status
          break
        case 'IN_PROGRESS':
          ticketStats.inProgress = stat._count.status
          break
        case 'WAITING_FOR_USER':
          ticketStats.waitingForUser = stat._count.status
          break
        case 'RESOLVED':
          ticketStats.resolved = stat._count.status
          break
        case 'CLOSED':
          ticketStats.closed = stat._count.status
          break
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        tickets: tickets.map(ticket => ({
          ...ticket,
          latestMessage: ticket.messages[0] || null,
          messageCount: ticket._count.messages,
          messages: undefined, // Remove messages array from response
          _count: undefined // Remove count object
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTickets / limit),
          totalTickets,
          limit
        },
        stats: ticketStats
      }
    })

  } catch (error) {
    console.error('Admin support tickets fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

// PUT - Update ticket status, priority, assignment, etc.
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    const body = await request.json()
    
    const validatedData = updateTicketSchema.parse(body)
    
    // Build update data
    const updateData: any = {}
    
    if (validatedData.status) {
      updateData.status = validatedData.status
      if (validatedData.status === 'RESOLVED' || validatedData.status === 'CLOSED') {
        updateData.resolvedAt = new Date()
      }
    }
    
    if (validatedData.priority) {
      updateData.priority = validatedData.priority
    }
    
    if (validatedData.assignedTo !== undefined) {
      updateData.assignedTo = validatedData.assignedTo || null
    }

    // Update the ticket
    const updatedTicket = await db.supportTicket.update({
      where: { id: validatedData.ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Add internal note if resolution is provided
    if (validatedData.resolution) {
      await db.ticketMessage.create({
        data: {
          ticketId: validatedData.ticketId,
          senderId: admin.id,
          message: validatedData.resolution,
          isInternal: true
        }
      })
    }

    // Log the admin activity
    await db.activityLog.create({
      data: {
        userId: admin.id,
        activityType: 'TICKET_UPDATED',
        description: `Updated support ticket #${validatedData.ticketId}`,
        metadata: {
          ticketId: validatedData.ticketId,
          changes: updateData,
          userId: updatedTicket.userId
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: 'Ticket updated successfully'
    })

  } catch (error) {
    console.error('Admin ticket update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}

// POST - Add message to ticket
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    const body = await request.json()
    
    const validatedData = addMessageSchema.parse(body)
    
    // Verify ticket exists
    const ticket = await db.supportTicket.findUnique({
      where: { id: validatedData.ticketId },
      select: { id: true, status: true, userId: true }
    })
    
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Create the message
    const message = await db.ticketMessage.create({
      data: {
        ticketId: validatedData.ticketId,
        senderId: admin.id,
        message: validatedData.message,
        isInternal: validatedData.isInternal
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (ticket.status === 'OPEN') {
      await db.supportTicket.update({
        where: { id: validatedData.ticketId },
        data: { 
          status: 'IN_PROGRESS',
          assignedTo: admin.id
        }
      })
    }

    // Log the admin activity
    await db.activityLog.create({
      data: {
        userId: admin.id,
        activityType: 'TICKET_MESSAGE_ADDED',
        description: `Added ${validatedData.isInternal ? 'internal note' : 'response'} to ticket #${validatedData.ticketId}`,
        metadata: {
          ticketId: validatedData.ticketId,
          messageId: message.id,
          isInternal: validatedData.isInternal,
          userId: ticket.userId
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: message,
      message: 'Message added successfully'
    })

  } catch (error) {
    console.error('Admin ticket message error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add message' },
      { status: 500 }
    )
  }
}