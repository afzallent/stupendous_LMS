import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const prisma = new PrismaClient()

// Validation schemas
const createProviderSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  clientId: z.string(),
  clientSecret: z.string(),
  enabled: z.boolean().default(false),
  scopes: z.string().optional()
})

const updateProviderSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  enabled: z.boolean().optional(),
  scopes: z.string().optional()
})

// GET - Fetch all SSO providers
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (you can implement this check based on your auth system)
    // For now, we'll assume the middleware handles admin auth
    
    const providers = await prisma.sSOProvider.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      providers
    })
  } catch (error) {
    console.error("Failed to fetch SSO providers:", error)
    return NextResponse.json(
      { error: "Failed to fetch SSO providers" },
      { status: 500 }
    )
  }
}

// POST - Create new SSO provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createProviderSchema.parse(body)
    
    // Check if provider already exists
    const existingProvider = await prisma.sSOProvider.findUnique({
      where: { name: validatedData.name }
    })
    
    if (existingProvider) {
      return NextResponse.json(
        { error: "Provider with this name already exists" },
        { status: 409 }
      )
    }
    
    // Create new provider
    const provider = await prisma.sSOProvider.create({
      data: validatedData
    })
    
    return NextResponse.json({
      success: true,
      message: "SSO provider created successfully",
      provider
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Failed to create SSO provider:", error)
    return NextResponse.json(
      { error: "Failed to create SSO provider" },
      { status: 500 }
    )
  }
}

// PUT - Update existing SSO provider
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = updateProviderSchema.parse(body)
    const { id, ...updateData } = validatedData
    
    // Check if provider exists
    const existingProvider = await prisma.sSOProvider.findUnique({
      where: { id }
    })
    
    if (!existingProvider) {
      return NextResponse.json(
        { error: "SSO provider not found" },
        { status: 404 }
      )
    }
    
    // Update provider
    const provider = await prisma.sSOProvider.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      message: "SSO provider updated successfully",
      provider
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Failed to update SSO provider:", error)
    return NextResponse.json(
      { error: "Failed to update SSO provider" },
      { status: 500 }
    )
  }
}

// DELETE - Delete SSO provider
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      )
    }
    
    // Check if provider exists
    const existingProvider = await prisma.sSOProvider.findUnique({
      where: { id }
    })
    
    if (!existingProvider) {
      return NextResponse.json(
        { error: "SSO provider not found" },
        { status: 404 }
      )
    }
    
    // Delete provider
    await prisma.sSOProvider.delete({
      where: { id }
    })
    
    return NextResponse.json({
      success: true,
      message: "SSO provider deleted successfully"
    })
  } catch (error) {
    console.error("Failed to delete SSO provider:", error)
    return NextResponse.json(
      { error: "Failed to delete SSO provider" },
      { status: 500 }
    )
  }
}