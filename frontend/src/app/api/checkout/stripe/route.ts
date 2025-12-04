import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const { items, userEmail, userId } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      )
    }

    // Calculate total and create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          description: `Course by ${item.instructor}`,
          images: item.thumbnail ? [item.thumbnail] : [],
          metadata: {
            courseId: item.id,
            instructor: item.instructor,
            level: item.level,
            duration: item.duration,
            lectures: item.lectures.toString()
          }
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: 1,
    }))

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      payment_method_options: {
        card: {
          // Enable additional payment methods for Indian users
          setup_future_usage: 'off_session',
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/cart`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
        courseIds: items.map((item: any) => item.id).join(','),
        orderType: 'course_purchase'
      },
      // Additional payment methods for international users
      payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIG,
      // Shipping is not applicable for digital courses
      shipping_address_collection: {
        allowed_countries: ['US', 'IN', 'CA', 'GB', 'AU', 'DE', 'FR'],
      },
      billing_address_collection: 'required',
      // Tax calculation (if applicable)
      automatic_tax: {
        enabled: false, // Set to true if you have tax calculation enabled
      },
      // Discounts and promotions
      allow_promotion_codes: true,
      // Custom fields for additional information
      custom_fields: [
        {
          key: 'learning_goals',
          label: {
            type: 'custom',
            custom: 'What are your learning goals?'
          },
          type: 'text',
          optional: true
        }
      ],
      // Consent collection for terms and privacy policy
      consent_collection: {
        terms_of_service: 'required',
        privacy_policy: 'required'
      }
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}