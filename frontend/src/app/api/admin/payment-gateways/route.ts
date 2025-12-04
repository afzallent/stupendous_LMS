import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// File-based storage for payment gateways (persists across server restarts)
const STORAGE_FILE = path.join(process.cwd(), 'data', 'payment-gateways.json')

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(STORAGE_FILE)
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// Load payment gateways from file
async function loadPaymentGateways(): Promise<any[]> {
  try {
    await ensureDataDirectory()
    const data = await fs.readFile(STORAGE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist or is invalid, return empty array
    return []
  }
}

// Save payment gateways to file
async function savePaymentGateways(gateways: any[]): Promise<void> {
  try {
    await ensureDataDirectory()
    await fs.writeFile(STORAGE_FILE, JSON.stringify(gateways, null, 2), 'utf8')
  } catch (error) {
    console.error('Error saving payment gateways:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user has admin role (you can implement proper auth check here)
    const userRole = request.headers.get('x-user-role')
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Load and return existing payment gateways
    const paymentGateways = await loadPaymentGateways()
    return NextResponse.json({
      gateways: paymentGateways
    })

  } catch (error) {
    console.error('Error fetching payment gateways:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment gateways' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user has admin role
    const userRole = request.headers.get('x-user-role')
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const {
      name,
      displayName,
      type,
      secretKey,
      enabled,
      testMode,
      supportedCurrencies,
      configuration
    } = await request.json()

    // Validate required fields
    if (!name || !displayName || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Load existing gateways
    const paymentGateways = await loadPaymentGateways()
    
    // Check if gateway already exists
    const existingGateway = paymentGateways.find(g => g.name === name)
    if (existingGateway) {
      return NextResponse.json(
        { error: 'Payment gateway already exists' },
        { status: 409 }
      )
    }

    // Create new payment gateway
    const newGateway = {
      id: `gateway_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      displayName,
      type,
      secretKey: secretKey || '',
      enabled: enabled || false,
      testMode: testMode !== undefined ? testMode : true,
      supportedCurrencies: supportedCurrencies || [],
      configuration: configuration || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    paymentGateways.push(newGateway)
    
    // Save to file
    await savePaymentGateways(paymentGateways)

    return NextResponse.json({
      success: true,
      gateway: newGateway
    })

  } catch (error) {
    console.error('Error creating payment gateway:', error)
    return NextResponse.json(
      { error: 'Failed to create payment gateway' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user has admin role
    const userRole = request.headers.get('x-user-role')
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const {
      id,
      publishableKey,
      secretKey,
      webhookSecret,
      enabled,
      testMode,
      configuration
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Gateway ID is required' },
        { status: 400 }
      )
    }

    // Load existing gateways
    const paymentGateways = await loadPaymentGateways()
    
    // Find and update the gateway
    const gatewayIndex = paymentGateways.findIndex(g => g.id === id)
    if (gatewayIndex === -1) {
      return NextResponse.json(
        { error: 'Payment gateway not found' },
        { status: 404 }
      )
    }

    // Update the gateway
    paymentGateways[gatewayIndex] = {
      ...paymentGateways[gatewayIndex],
      ...(publishableKey !== undefined && { publishableKey }),
      ...(secretKey !== undefined && { secretKey }),
      ...(webhookSecret !== undefined && { webhookSecret }),
      ...(enabled !== undefined && { enabled }),
      ...(testMode !== undefined && { testMode }),
      ...(configuration !== undefined && { configuration }),
      updatedAt: new Date().toISOString()
    }
    
    // Save to file
    await savePaymentGateways(paymentGateways)

    return NextResponse.json({
      success: true,
      gateway: paymentGateways[gatewayIndex]
    })

  } catch (error) {
    console.error('Error updating payment gateway:', error)
    return NextResponse.json(
      { error: 'Failed to update payment gateway' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user has admin role
    const userRole = request.headers.get('x-user-role')
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Gateway ID is required' },
        { status: 400 }
      )
    }

    // Load existing gateways
    const paymentGateways = await loadPaymentGateways()
    
    // Find and remove the gateway
    const gatewayIndex = paymentGateways.findIndex(g => g.id === id)
    if (gatewayIndex === -1) {
      return NextResponse.json(
        { error: 'Payment gateway not found' },
        { status: 404 }
      )
    }

    const deletedGateway = paymentGateways.splice(gatewayIndex, 1)[0]
    
    // Save to file
    await savePaymentGateways(paymentGateways)

    return NextResponse.json({
      success: true,
      gateway: deletedGateway
    })

  } catch (error) {
    console.error('Error deleting payment gateway:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment gateway' },
      { status: 500 }
    )
  }
}