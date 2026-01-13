"use client"

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Star, 
  Clock, 
  Users, 
  BookOpen, 
  Play,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Award,
  MessageCircle,
  Sparkles,
  ShoppingCart,
  Plus,
  Gift
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { addToCart, isInCart, getCartItemCount } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [expandedChapters, setExpandedChapters] = useState<string[]>([])
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Unwrap the params Promise using React.use()
  const { id } = use(params)
  
  // Fetch course data from Django API
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${API_BASE_URL}/api/courses/${id}/`)
        
        if (response.ok) {
          const data = await response.json()
          
          // Parse price values safely
          const price = parseFloat(data.price) || 0
          const originalPrice = parseFloat(data.original_price) || price * 1.2 || 0
          
          // Map Django response to frontend format
          const mappedCourse = {
            id: data.id,
            title: data.title,
            description: data.description,
            instructor: {
              name: data.instructor?.username || 'Unknown',
              bio: data.instructor?.bio || '',
              avatar: data.instructor?.avatar || null,
              rating: 4.8, // Default rating
              students: data.enrolled_count || 0,
              courses: 1 // Would need separate API call
            },
            price: price,
            originalPrice: originalPrice,
            isFree: data.is_free || price === 0,
            rating: data.rating || 4.5,
            reviewCount: data.review_count || 0,
            students: data.enrolled_count || 0,
            duration: data.duration || '0h 0m',
            lectures: data.lesson_count || 0,
            level: data.level || 'Beginner',
            category: data.category?.name || 'General',
            language: data.language || 'English',
            lastUpdated: data.updated_at ? new Date(data.updated_at).toLocaleDateString() : 'N/A',
            thumbnail: data.thumbnail || null,
            enrolled: data.is_enrolled || false,
            progress: data.progress_percentage || 0,
            learningOutcomes: data.learning_outcomes || [],
            requirements: data.requirements || [],
            chapters: data.chapters || [],
            reviews: data.reviews || []
          }
          
          setCourse(mappedCourse)
        } else {
          console.error('Failed to fetch course:', response.status)
          setCourse(null)
        }
      } catch (error) {
        console.error('Error fetching course data:', error)
        setCourse(null)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCourseData()
  }, [id])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course details...</p>
        </div>
      </div>
    )
  }
  
  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <Card className="max-w-md border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Course Not Found</h2>
            <p className="text-gray-600 mb-4">The course you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/courses')}>
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    )
  }

  const handleAddToCart = () => {
    const cartItem = {
      id: course.id,
      title: course.title,
      instructor: course.instructor.name,
      price: course.price,
      originalPrice: course.originalPrice,
      thumbnail: course.thumbnail,
      duration: calculateTotalDuration(),
      lectures: course.lectures,
      level: course.level,
      rating: course.rating,
      addedAt: new Date()
    }
    
    addToCart(cartItem)
    
    toast({
      title: "Added to Cart",
      description: `${course.title} has been added to your cart.`,
    })
  }

  const handleGoToCart = () => {
    router.push('/cart')
  }

  const calculateTotalDuration = () => {
    let totalMinutes = 0
    course.chapters.forEach(chapter => {
      chapter.lessons.forEach(lesson => {
        const [mins, seconds] = lesson.duration.split(':').map(Number)
        totalMinutes += mins + seconds / 60
      })
    })
    const hours = Math.floor(totalMinutes / 60)
    const remainingMinutes = Math.floor(totalMinutes % 60)
    return `${hours}h ${remainingMinutes}m`
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
                  className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                  onClick={handleGoToCart}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Cart ({getCartItemCount()})
                </Button>
              </div>
              <Button variant="ghost" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50">Log In</Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-blue-600 text-white border-0">{course.level}</Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0">{course.category}</Badge>
                {course.enrolled && (
                  <Badge className="bg-green-600 text-white border-0">Enrolled</Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4 text-gray-900">{course.title}</h1>
              <p className="text-xl text-gray-600 mb-6">{course.description}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-6">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-gray-900">{course.rating}</span>
                  <span className="text-gray-500">({course.reviewCount.toLocaleString()} reviews)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{course.students.toLocaleString()} students</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{calculateTotalDuration()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.lectures} lectures</span>
                </div>
              </div>

              {/* Course Preview */}
              <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden mb-6">
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-20 w-20 text-blue-600/50" />
                </div>
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 gap-2">
                    <Play className="h-5 w-5" />
                    Preview this course
                  </Button>
                </div>
              </div>
            </div>

            {/* Simple Course Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Course Information</h2>
              <p className="text-gray-600 mb-4">{course.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">What you'll learn:</h3>
                  <ul className="space-y-1">
                    {course.learningOutcomes.slice(0, 3).map((outcome, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Requirements:</h3>
                  <ul className="space-y-1">
                    {course.requirements.map((req, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <Circle className="h-2 w-2 fill-gray-400 mr-2" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail.startsWith('http') ? course.thumbnail : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${course.thumbnail}`}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center')
                      }}
                    />
                  ) : (
                    <Play className="h-16 w-16 text-blue-600/50" />
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-blue-600">
                        {course.isFree ? 'Free' : `$${course.price.toFixed(2)}`}
                      </div>
                      {!course.isFree && course.originalPrice > course.price && (
                        <div className="text-sm text-gray-500 line-through">${course.originalPrice.toFixed(2)}</div>
                      )}
                    </div>
                    
                    {!course.isFree && course.originalPrice > course.price && (
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center justify-between mb-1">
                          <span>Discount</span>
                          <span className="font-medium text-green-600">
                            {Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)}% OFF
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Time left</span>
                          <span className="font-medium text-red-600">1 day</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {course.enrolled ? (
                        <>
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
                            size="lg"
                            onClick={() => router.push(`/learn/courses/${course.id}`)}
                          >
                            Continue Learning
                          </Button>
                          <div className="text-center">
                            <div className="text-sm text-gray-600 mb-2">Your progress</div>
                            <Progress value={course.progress} className="w-full" />
                            <div className="text-xs text-gray-500 mt-1">{course.progress}% complete</div>
                          </div>
                        </>
                      ) : isInCart(course.id) ? (
                        <>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700 text-white" 
                            size="lg"
                            onClick={handleGoToCart}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Go to Cart
                          </Button>
                          <div className="text-center text-sm text-green-600">
                            ✓ Course added to cart
                          </div>
                        </>
                      ) : (
                        <>
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" 
                            size="lg"
                            onClick={handleAddToCart}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => router.push(`/checkout/coupon?courseId=${course.id}`)}
                          >
                            <Gift className="h-4 w-4 mr-2" />
                            Enroll with Coupon
                          </Button>
                        </>
                      )}
                      
                      {/* Only show Message Instructor for enrolled students */}
                      {isAuthenticated && course.enrolled && (
                        <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Message Instructor
                        </Button>
                      )}
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>30-day money-back guarantee</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Certificate of completion</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Lifetime access</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}