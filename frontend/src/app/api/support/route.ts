import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAccessToken } from '@/lib/jwt'
import { z } from 'zod'

const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['GENERAL', 'TECHNICAL', 'BILLING', 'CONTENT', 'ACCOUNT']).default('GENERAL'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
})

const addMessageSchema = z.object({
  ticketId: z.string(),
  message: z.string().min(1, 'Message cannot be empty')
})

// Helper function to verify user authentication
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value
  
  if (!token) {
    throw new Error('Authentication required')
  }

  const decoded = verifyAccessToken(token)
  if (!decoded || !decoded.userId) {
    throw new Error('Invalid token')
  }

  const user = await db.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, name: true, email: true, role: true }
  })

  if (!user) {
    throw new Error('User not found')
  }

  return user
}

// GET - Fetch user's support tickets
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'all'
    
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = { userId: user.id }
    
    if (status !== 'all') {
      whereClause.status = status.toUpperCase()
    }

    // Fetch user's tickets
    const [tickets, totalTickets] = await Promise.all([
      db.supportTicket.findMany({
        where: whereClause,
        include: {
          assignee: {
            select: {
              id: true,
              name: true
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

    return NextResponse.json({
      success: true,
      data: {
        tickets: tickets.map(ticket => ({
          ...ticket,
          latestMessage: ticket.messages[0] || null,
          messageCount: ticket._count.messages,
          messages: undefined,
          _count: undefined
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTickets / limit),
          totalTickets,
          limit
        }
      }
    })

  } catch (error) {
    console.error('User tickets fetch error:', error)
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST - Create new support ticket or add message to existing ticket
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    const body = await request.json()
    
    // Check if this is creating a new ticket or adding a message
    if (body.ticketId) {
      // Adding message to existing ticket
      const validatedData = addMessageSchema.parse(body)
      
      // Verify user owns the ticket
      const ticket = await db.supportTicket.findFirst({
        where: { 
          id: validatedData.ticketId,
          userId: user.id 
        },
        select: { id: true, status: true }
      })
      
      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Ticket not found or access denied' },
          { status: 404 }
        )
      }

      // Create the message
      const message = await db.ticketMessage.create({
        data: {
          ticketId: validatedData.ticketId,
          senderId: user.id,
          message: validatedData.message,
          isInternal: false
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

      // Update ticket status if it was resolved/closed
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        await db.supportTicket.update({
          where: { id: validatedData.ticketId },
          data: { status: 'OPEN' }
        })
      }

      return NextResponse.json({
        success: true,
        data: message,
        message: 'Message added successfully'
      })
      
    } else {
      // Creating new ticket
      const validatedData = createTicketSchema.parse(body)
      
      // Create the ticket
      const ticket = await db.supportTicket.create({
        data: {
          userId: user.id,
          subject: validatedData.subject,
          description: validatedData.description,
          category: validatedData.category,
          priority: validatedData.priority
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Create initial message with the description
      await db.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: user.id,
          message: validatedData.description,
          isInternal: false
        }
      })

      // Log the activity
      await db.activityLog.create({
        data: {
          userId: user.id,
          activityType: 'SUPPORT_TICKET_CREATED',
          description: `Created support ticket: ${validatedData.subject}`,
          metadata: {
            ticketId: ticket.id,
            category: validatedData.category,
            priority: validatedData.priority
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: ticket,
        message: 'Support ticket created successfully'
      })
    }

  } catch (error) {
    console.error('Support ticket error:', error)
    
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }
    
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
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}