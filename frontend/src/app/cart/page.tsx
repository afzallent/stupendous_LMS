"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ShoppingCart, 
  Trash2, 
  Clock, 
  Users, 
  Star,
  BookOpen,
  Sparkles,
  CreditCard,
  IndianRupee,
  ArrowLeft,
  Shield,
  CheckCircle
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"

export default function CartPage() {
  const router = useRouter()
  const { state: cartState, removeFromCart, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'upi'>('stripe')
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRemoveItem = (itemId: string) => {
    removeFromCart(itemId)
    toast({
      title: "Item Removed",
      description: "Course has been removed from your cart.",
    })
  }

  const handleContinueShopping = () => {
    router.push('/courses')
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push('/auth/login?redirect=/cart')
      return
    }

    setIsCheckingOut(true)
    
    // Redirect to checkout process based on payment method
    if (paymentMethod === 'stripe') {
      router.push('/checkout/stripe')
    } else {
      router.push('/checkout/upi')
    }
  }

  const calculateDiscount = () => {
    const originalTotal = cartState.items.reduce((sum, item) => sum + item.originalPrice, 0)
    const currentTotal = cartState.total
    return originalTotal - currentTotal
  }

  const calculateDiscountPercentage = () => {
    const originalTotal = cartState.items.reduce((sum, item) => sum + item.originalPrice, 0)
    const discount = calculateDiscount()
    return originalTotal > 0 ? Math.round((discount / originalTotal) * 100) : 0
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                  <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CourseCompass
                </span>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Home</a>
                <a href="/courses" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Browse Courses</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Categories</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Teach</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Cart ({cartState.itemCount})
                </Button>
              </div>
              {isAuthenticated ? (
                <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => router.push('/auth/login?redirect=/cart')}
                  >
                    Log In
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    onClick={() => router.push('/auth/signup?redirect=/cart')}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={handleContinueShopping}
            className="hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600">{cartState.itemCount} {cartState.itemCount === 1 ? 'course' : 'courses'} in your cart</p>
          </div>
        </div>

        {cartState.itemCount === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Your cart is empty</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any courses to your cart yet. 
              Browse our extensive course catalog and find something you love!
            </p>
            <Button 
              onClick={handleContinueShopping}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Browse Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartState.items.map((item) => (
                <Card key={item.id} className="overflow-hidden border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-32 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-blue-600/50" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-gray-600 mb-3">by {item.instructor}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            <span>{item.rating}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{item.duration}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span>{item.lectures} lectures</span>
                          </div>
                          <Badge className="bg-blue-600 text-white">{item.level}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-blue-600">${item.price}</span>
                            <span className="text-lg text-gray-500 line-through">${item.originalPrice}</span>
                            <Badge className="bg-green-100 text-green-700">
                              {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Original Total:</span>
                      <span className="line-through text-gray-500">
                        ${cartState.items.reduce((sum, item) => sum + item.originalPrice, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({calculateDiscountPercentage()}%):</span>
                      <span>-${calculateDiscount().toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">${cartState.total.toFixed(2)}</span>
                    </div>

                    {!isAuthenticated && (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Please log in to continue with checkout
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Payment Method</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                          onClick={() => setPaymentMethod('stripe')}
                          className="h-12 flex-col space-y-1"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span className="text-xs">Card</span>
                        </Button>
                        <Button
                          variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                          onClick={() => setPaymentMethod('upi')}
                          className="h-12 flex-col space-y-1"
                        >
                          <IndianRupee className="h-4 w-4" />
                          <span className="text-xs">UPI</span>
                        </Button>
                      </div>
                    </div>

                    <Button 
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      size="lg"
                    >
                      {isCheckingOut ? 'Processing...' : `Checkout $${cartState.total.toFixed(2)}`}
                    </Button>

                    <div className="pt-4 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>30-day money-back guarantee</span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>Lifetime access to courses</span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>Certificate of completion</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {cartState.itemCount > 1 && (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600 mb-3">
                        You're saving ${calculateDiscount().toFixed(2)} on this order!
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={clearCart}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Clear Cart
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}