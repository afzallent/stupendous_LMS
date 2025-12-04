import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// File-based storage for payment gateways (same as main route)
const STORAGE_FILE = path.join(process.cwd(), 'data', 'payment-gateways.json')

// Load payment gateways from file
async function loadPaymentGateways(): Promise<any[]> {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    // File doesn't exist or is invalid, return empty array
    return []
  }
}

// Mock function to test Stripe connection
async function testStripeConnection(gateway: any) {
  try {
    // In production, you would use the Stripe SDK to test the connection
    // const stripe = require('stripe')(gateway.secretKey)
    // await stripe.balance.retrieve()
    
    // For demo purposes, we'll just check if the required fields are present
    if (!gateway.publishableKey || !gateway.secretKey) {
      throw new Error('Missing required Stripe credentials')
    }
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return { success: true, message: 'Stripe connection successful' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// Mock function to test Razorpay connection
async function testRazorpayConnection(gateway: any) {
  try {
    // In production, you would use the Razorpay SDK to test the connection
    // const Razorpay = require('razorpay')
    // const rzp = new Razorpay({ key_id: gateway.keyId, key_secret: gateway.keySecret })
    // await rzp.orders.all()
    
    // For demo purposes, we'll just check if the required fields are present
    if (!gateway.keyId || !gateway.keySecret) {
      throw new Error('Missing required Razorpay credentials')
    }
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return { success: true, message: 'Razorpay connection successful' }
  } catch (error) {
    return { success: false, error: error.message }
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

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Gateway ID is required' },
        { status: 400 }
      )
    }

    // Load gateways from file
    const paymentGateways = await loadPaymentGateways()
    
    // Find the gateway
    const gateway = paymentGateways.find(g => g.id === id)
    if (!gateway) {
      return NextResponse.json(
        { error: 'Payment gateway not found' },
        { status: 404 }
      )
    }

    // Test connection based on gateway type
    let result
    switch (gateway.type || gateway.name) {
      case 'stripe':
        result = await testStripeConnection(gateway)
        break
      case 'razorpay':
        result = await testRazorpayConnection(gateway)
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported gateway type' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      })
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error 
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error testing payment gateway connection:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test payment gateway connection' 
      },
      { status: 500 }
    )
  }
}