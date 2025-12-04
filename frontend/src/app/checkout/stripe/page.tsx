"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CreditCard,
  Shield,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"

export default function StripeCheckoutPage() {
  const router = useRouter()
  const { state: cartState, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout/stripe')
      return
    }

    // Redirect if cart is empty
    if (cartState.itemCount === 0) {
      router.push('/cart')
      return
    }
  }, [isAuthenticated, cartState.itemCount, router])

  const handlePayment = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with payment.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartState.items,
          userEmail: user.email,
          userId: user.id
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }

    } catch (error) {
      console.error('Payment error:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = () => {
    router.push('/cart')
  }

  if (!isAuthenticated || cartState.itemCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={handleGoBack}
            className="hover:bg-blue-50"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Checkout</h1>
            <p className="text-gray-600">Complete your purchase securely with Stripe</p>
          </div>

          {/* Order Summary */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-green-600" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartState.items.map((item, index) => (
                <div key={item.id} className={`flex justify-between items-center ${index !== cartState.items.length - 1 ? 'pb-4 border-b' : ''}`}>
                  <div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">by {item.instructor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">${item.price}</p>
                    <p className="text-sm text-gray-500 line-through">${item.originalPrice}</p>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">${cartState.total.toFixed(2)}</span>
                </div>
                <p className="text-sm text-green-600 text-right">
                  You save ${(cartState.items.reduce((sum, item) => sum + item.originalPrice, 0) - cartState.total).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your payment is secured by Stripe. We support all major credit cards and digital wallets.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>SSL encrypted checkout</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>30-day money-back guarantee</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Instant course access</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Lifetime course updates</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Button */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <Button 
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay ${cartState.total.toFixed(2)} with Stripe
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                By completing your purchase, you agree to our Terms of Service and Privacy Policy.
                You will be redirected to Stripe's secure payment page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}