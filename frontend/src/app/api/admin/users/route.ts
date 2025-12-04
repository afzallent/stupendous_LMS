import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyAdminAccess } from "@/lib/admin-auth"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schemas
const updateUserSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  role: z.enum(['STUDENT', 'TRAINER', 'ADMIN']).optional(),
  action: z.enum(['activate', 'suspend', 'ban', 'change_role']).optional()
})

const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['all', 'student', 'trainer', 'admin']).optional(),
  status: z.enum(['all', 'active', 'suspended', 'banned']).optional(),
  page: z.string().optional(),
  limit: z.string().optional()
})

// GET - List users with filters and pagination
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await verifyAdminAccess(request)

    const { searchParams } = new URL(request.url)
    const params = userQuerySchema.parse(Object.fromEntries(searchParams))
    
    const page = parseInt(params.page || '1')
    const limit = parseInt(params.limit || '20')
    const skip = (page - 1) * limit

    // Build where clause
    let whereClause: any = {}

    // Search filter
    if (params.search) {
      whereClause.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } }
      ]
    }

    // Role filter
    if (params.role && params.role !== 'all') {
      whereClause.role = params.role.toUpperCase()
    }

    // Status filter (we'll use a custom field or derive from other data)
    // For now, we'll consider all users as active unless specified otherwise

    // Get users with related data
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              enrollments: true,
              courses: true,
              payments: true,
              reviews: true
            }
          },
          enrollments: {
            take: 1,
            orderBy: { enrolledAt: 'desc' },
            select: { enrolledAt: true }
          },
          payments: {
            where: { status: 'COMPLETED' },
            select: { amount: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ])

    // Transform user data
    const transformedUsers = users.map(user => {
      const totalSpent = user.payments.reduce((sum, payment) => sum + payment.amount, 0)
      const lastActive = user.enrollments[0]?.enrolledAt || user.updatedAt
      const status = 'active' // Default status, you can implement custom logic

      return {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status,
        joinDate: user.createdAt.toISOString().split('T')[0],
        lastActive: lastActive.toISOString().split('T')[0],
        coursesEnrolled: user._count.enrollments,
        coursesCreated: user._count.courses,
        totalSpent,
        totalRevenue: user.role === 'TRAINER' ? totalSpent * 0.7 : 0, // Mock instructor revenue
        totalReviews: user._count.reviews
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        users: transformedUsers,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit)
        }
      }
    })

  } catch (error) {
    console.error("Admin users GET API error:", error)
    
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT - Update user status or role
export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const adminUser = await verifyAdminAccess(request)

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Prevent admin from modifying their own role/status
    if (user.id === adminUser.id) {
      return NextResponse.json(
        { error: "Cannot modify your own account" },
        { status: 400 }
      )
    }

    let updateData: any = {}
    let activityDescription = ''

    // Handle different actions
    switch (validatedData.action) {
      case 'activate':
        // For now, we'll just update the updatedAt timestamp
        updateData.updatedAt = new Date()
        activityDescription = `Activated user: ${user.name || user.email}`
        break
        
      case 'suspend':
        // In a real implementation, you might have a status field
        // For now, we'll log this action
        activityDescription = `Suspended user: ${user.name || user.email}`
        break
        
      case 'ban':
        // Similar to suspend, log the action
        activityDescription = `Banned user: ${user.name || user.email}`
        break
        
      case 'change_role':
        if (validatedData.role) {
          updateData.role = validatedData.role
          activityDescription = `Changed user role to ${validatedData.role}: ${user.name || user.email}`
        }
        break
    }

    // Update user if there's data to update
    let updatedUser = user
    if (Object.keys(updateData).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: validatedData.userId },
        data: updateData,
        select: { id: true, name: true, email: true, role: true }
      })
    }

    // Log admin activity
    if (activityDescription) {
      await prisma.activityLog.create({
        data: {
          userId: adminUser.id,
          activityType: 'USER_MANAGEMENT',
          description: activityDescription,
          metadata: {
            targetUserId: user.id,
            targetUserEmail: user.email,
            action: validatedData.action,
            previousRole: user.role,
            newRole: validatedData.role
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `User ${validatedData.action} successfully`,
      data: {
        user: updatedUser
      }
    })

  } catch (error) {
    console.error("Admin users PUT API error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}