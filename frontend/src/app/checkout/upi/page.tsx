"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  IndianRupee,
  QrCode,
  Smartphone,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  Clock
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"

interface UpiPaymentData {
  paymentId: string
  amount: number
  currency: string
  items: any[]
  userEmail: string
  userId: string
  paymentMethod: string
  status: string
  createdAt: string
  upiId: string | null
  transactionId: string | null
  paymentGateway: string
}

export default function UpiCheckoutPage() {
  const router = useRouter()
  const { state: cartState, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<UpiPaymentData | null>(null)
  const [upiUrl, setUpiUrl] = useState<string>("")
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [userUpiId, setUserUpiId] = useState("")

  const usdToInr = 83 // Demo conversion rate

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout/upi')
      return
    }

    // Redirect if cart is empty
    if (cartState.itemCount === 0) {
      router.push('/cart')
      return
    }
  }, [isAuthenticated, cartState.itemCount, router])

  const initiateUpiPayment = async () => {
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
      const response = await fetch('/api/checkout/upi', {
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
        throw new Error(data.error || 'Failed to create UPI payment')
      }

      setPaymentData(data.paymentData)
      setUpiUrl(data.upiUrl)
      setQrCodeUrl(data.qrCodeUrl)

      toast({
        title: "UPI Payment Initiated",
        description: "Scan QR code or use UPI ID to complete payment.",
      })

    } catch (error) {
      console.error('UPI payment error:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      
      toast({
        title: "Payment Error",
        description: "Failed to initialize UPI payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const verifyPayment = async () => {
    if (!paymentData) return

    setIsVerifying(true)
    
    try {
      const response = await fetch(`/api/checkout/upi?paymentId=${paymentData.paymentId}`)
      const data = await response.json()

      setPaymentStatus(data.status)

      if (data.status === 'success') {
        toast({
          title: "🎉 Payment Successful!",
          description: "Your courses have been unlocked. Redirecting to your learning dashboard...",
        })
        
        // Clear cart and redirect to success page
        setTimeout(() => {
          clearCart()
          // Redirect to success page which will then redirect to learn dashboard
          router.push(`/checkout/success?payment_id=${paymentData.paymentId}&method=upi`)
        }, 2000)
      } else if (data.status === 'failed') {
        toast({
          title: "Payment Failed",
          description: data.message || "Please try again with a different payment method.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Payment Pending",
          description: "Please complete the payment in your UPI app.",
        })
      }

    } catch (error) {
      console.error('Payment verification error:', error)
      toast({
        title: "Verification Error",
        description: "Could not verify payment status. Please contact support.",
        variant: "destructive"
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const copyUpiUrl = () => {
    navigator.clipboard.writeText(upiUrl)
    toast({
      title: "Copied!",
      description: "UPI payment link copied to clipboard.",
    })
  }

  const handleGoBack = () => {
    router.push('/cart')
  }

  const totalInINR = Math.round(cartState.total * usdToInr)

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
              <div className="bg-orange-100 p-3 rounded-full">
                <IndianRupee className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">UPI Payment</h1>
            <p className="text-gray-600">Pay securely using any UPI app</p>
          </div>

          {/* Order Summary */}
          <Card className="mb-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <IndianRupee className="h-5 w-5 mr-2 text-orange-600" />
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
                    <p className="font-bold text-orange-600">₹{Math.round(item.price * usdToInr)}</p>
                    <p className="text-sm text-gray-500 line-through">₹{Math.round(item.originalPrice * usdToInr)}</p>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total:</span>
                  <span className="text-orange-600">₹{totalInINR}</span>
                </div>
                <p className="text-sm text-green-600 text-right">
                  You save ₹{Math.round((cartState.items.reduce((sum, item) => sum + item.originalPrice, 0) - cartState.total) * usdToInr)}
                </p>
              </div>
            </CardContent>
          </Card>

          {!paymentData ? (
            /* Initial Payment Setup */
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertDescription>
                      Pay securely using any UPI app like Google Pay, PhonePe, Paytm, or BHIM.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Instant payment confirmation</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>Bank-level security</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>No additional charges</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span>24/7 support available</span>
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={initiateUpiPayment}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Setting up UPI Payment...
                      </>
                    ) : (
                      <>
                        <IndianRupee className="h-5 w-5 mr-2" />
                        Pay ₹{totalInINR} with UPI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Payment Interface */
            <div className="space-y-6">
              {/* Payment Status */}
              {paymentStatus && (
                <Alert className={paymentStatus === 'success' ? 'border-green-500 bg-green-50' : paymentStatus === 'failed' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}>
                  {paymentStatus === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : paymentStatus === 'failed' ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-600" />
                  )}
                  <AlertDescription className={paymentStatus === 'success' ? 'text-green-800' : paymentStatus === 'failed' ? 'text-red-800' : 'text-yellow-800'}>
                    {paymentStatus === 'success' && 'Payment successful! Redirecting to your courses...'}
                    {paymentStatus === 'failed' && 'Payment failed. Please try again or use a different payment method.'}
                    {paymentStatus === 'pending' && 'Payment is being processed. Please complete it in your UPI app.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* QR Code Payment */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <QrCode className="h-5 w-5 mr-2" />
                    Scan QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="flex justify-center">
                    <img 
                      src={qrCodeUrl} 
                      alt="UPI QR Code" 
                      className="w-48 h-48 border-2 border-gray-200 rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Open any UPI app and scan this QR code to pay ₹{totalInINR}
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={copyUpiUrl} 
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy UPI Link
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={verifyPayment}
                      disabled={isVerifying}
                      className="flex-1"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Check Status
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Instructions */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Payment Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start">
                      <Badge className="bg-blue-600 text-white mr-3 mt-1">1</Badge>
                      <span>Open your UPI app (Google Pay, PhonePe, Paytm, BHIM, etc.)</span>
                    </div>
                    <div className="flex items-start">
                      <Badge className="bg-blue-600 text-white mr-3 mt-1">2</Badge>
                      <span>Scan the QR code or use the UPI link</span>
                    </div>
                    <div className="flex items-start">
                      <Badge className="bg-blue-600 text-white mr-3 mt-1">3</Badge>
                      <span>Verify the amount: ₹{totalInINR}</span>
                    </div>
                    <div className="flex items-start">
                      <Badge className="bg-blue-600 text-white mr-3 mt-1">4</Badge>
                      <span>Complete the payment using your UPI PIN</span>
                    </div>
                    <div className="flex items-start">
                      <Badge className="bg-blue-600 text-white mr-3 mt-1">5</Badge>
                      <span>Click "Check Status" to verify your payment</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}