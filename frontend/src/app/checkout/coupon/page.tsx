"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Gift, 
  ArrowLeft,
  Zap
} from "lucide-react"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

function CouponEnrollmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId')
  
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [enrollmentData, setEnrollmentData] = useState<any>(null)

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!courseId) {
      setError("Course ID is required")
      return
    }

    if (!couponCode.trim()) {
      setError("Please enter a coupon code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const accessToken = localStorage.getItem('access_token')

      if (!accessToken) {
        toast({
          title: "Error",
          description: "You must be logged in to enroll",
          variant: "destructive"
        })
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/enrollments/enroll_with_coupon/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course_id: courseId,
          coupon_code: couponCode.toUpperCase()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Failed to enroll with coupon')
        return
      }

      setSuccess(true)
      setEnrollmentData(data)
      
      toast({
        title: "Success!",
        description: `You've been enrolled with ${couponCode.toUpperCase()} coupon (${data.discount_percentage}% discount)!`
      })

      // Redirect to course after 2 seconds
      setTimeout(() => {
        router.push(`/learn/${courseId}`)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      toast({
        title: "Error",
        description: err.message || 'Failed to process coupon',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <Link href={`/courses/${courseId}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </Link>

        {/* Main Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-6 w-6" />
              <CardTitle className="text-2xl">Enroll with Coupon</CardTitle>
            </div>
            <CardDescription className="text-blue-100">
              Use a coupon code to get instant access to this course
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {success ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Enrollment Successful!</h3>
                  <p className="text-gray-600 mb-4">
                    You've been enrolled with <span className="font-semibold">{couponCode.toUpperCase()}</span> coupon
                  </p>
                  
                  {enrollmentData && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Discount Applied:</span> {enrollmentData.discount_percentage}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Redirecting to course...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleEnroll} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Coupon Code Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Coupon Code
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                  <p className="text-xs text-gray-500">
                    Enter the coupon code provided to you
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Try PRERELEASE</p>
                      <p className="text-blue-800">Get 100% discount and instant access to all course content</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !couponCode.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-11"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Enroll Now
                    </>
                  )}
                </Button>

                {/* Alternative */}
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    Don't have a coupon code?
                  </p>
                  <Link href={`/courses/${courseId}`}>
                    <Button variant="outline" className="w-full">
                      View Other Options
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Instant Access</p>
                <p className="text-sm text-gray-600">Start learning immediately after enrollment</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Lifetime Access</p>
                <p className="text-sm text-gray-600">Access course materials forever</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Certificate</p>
                <p className="text-sm text-gray-600">Earn a certificate upon completion</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CouponEnrollmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CouponEnrollmentContent />
    </Suspense>
  )
}
