"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Search, 
  Star, 
  Clock, 
  Users, 
  BookOpen, 
  Play,
  Filter,
  Grid,
  List,
  DollarSign,
  TrendingUp,
  Sparkles,
  ShoppingCart,
  CheckCircle,
  Plus
} from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth"

interface Course {
  id: string
  title: string
  description: string
  instructor: string
  instructorAvatar?: string
  rating: number
  students: number
  price: number
  thumbnail?: string
  level: string
  category: string
  enrolled: boolean
  duration?: string
  lectures?: number
}

export default function CoursesPage() {
  const router = useRouter()
  const { addToCart, isInCart, getCartItemCount } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedLevel, setSelectedLevel] = useState("all")
  const [selectedPrice, setSelectedPrice] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [viewMode, setViewMode] = useState("grid")
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const params = new URLSearchParams({
          search: searchQuery,
          category: selectedCategory,
          level: selectedLevel,
          price: selectedPrice,
          sort: sortBy
        })
        
        const response = await fetch(`/api/courses?${params}`)
        const data = await response.json()
        setCourses(data)
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [searchQuery, selectedCategory, selectedLevel, selectedPrice, sortBy])

  const handleAddToCart = (course: Course) => {
    const cartItem = {
      id: course.id,
      title: course.title,
      instructor: course.instructor,
      price: course.price,
      originalPrice: course.price * 1.2, // Assuming 20% discount
      thumbnail: '/api/placeholder/400/240',
      duration: course.duration || '10h 30m',
      lectures: course.lectures || 45,
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

  const categories = [
    "All",
    "Web Development",
    "Data Science", 
    "Design",
    "Marketing",
    "Business",
    "Photography"
  ]

  const levels = ["All", "Beginner", "Intermediate", "Advanced"]

  const priceRanges = [
    { value: "all", label: "All Prices" },
    { value: "free", label: "Free" },
    { value: "0-50", label: "$0 - $50" },
    { value: "50-100", label: "$50 - $100" },
    { value: "100+", label: "$100+" }
  ]

  const sortOptions = [
    { value: "popular", label: "Most Popular" },
    { value: "rating", label: "Highest Rated" },
    { value: "newest", label: "Newest" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading courses...</p>
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
                <Button 
                  variant="ghost" 
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors p-0 h-auto"
                  onClick={() => router.push('/')}
                >
                  Home
                </Button>
                <span className="text-sm font-medium text-blue-600">Browse Courses</span>
                <Button 
                  variant="ghost" 
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors p-0 h-auto"
                  onClick={() => router.push('/categories')}
                >
                  Categories
                </Button>
                {isAuthenticated && user?.role === 'TRAINER' && (
                  <Button 
                    variant="ghost" 
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors p-0 h-auto"
                    onClick={() => router.push('/instructor/create-course')}
                  >
                    Create Course
                  </Button>
                )}
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
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      switch (user?.role) {
                        case 'ADMIN':
                          router.push('/admin')
                          break
                        case 'TRAINER':
                          router.push('/instructor')
                          break
                        case 'STUDENT':
                        default:
                          router.push('/learn')
                          break
                      }
                    }}
                  >
                    Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => router.push('/profile')}
                  >
                    {user?.name || user?.email}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                    onClick={logout}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => router.push('/auth/login')}
                  >
                    Log In
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    onClick={() => router.push('/auth/login')}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            {isAuthenticated ? `Welcome back, ${user?.name?.split(' ')[0]}!` : 'Explore Courses'}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {isAuthenticated 
              ? `Discover new courses to advance your ${user?.role === 'STUDENT' ? 'learning journey' : user?.role === 'TRAINER' ? 'teaching skills' : 'platform management'}.`
              : 'Discover thousands of courses taught by expert instructors. Find the perfect course to advance your skills and career.'
            }
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-8 space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedCategory("all")
                      setSelectedLevel("all")
                      setSelectedPrice("all")
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Clear all
                  </Button>
                </div>

                <Accordion type="multiple" defaultValue={["category", "level", "price"]} className="w-full">
                  <AccordionItem value="category" className="border-0">
                    <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-blue-600">Category</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="space-y-3">
                        {categories.map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={category}
                              checked={selectedCategory === category.toLowerCase()}
                              onCheckedChange={() => setSelectedCategory(category.toLowerCase())}
                              className="border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={category} className="text-sm text-gray-700 cursor-pointer">
                              {category}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="level" className="border-0">
                    <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-blue-600">Level</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="space-y-3">
                        {levels.map((level) => (
                          <div key={level} className="flex items-center space-x-2">
                            <Checkbox
                              id={level}
                              checked={selectedLevel === level.toLowerCase()}
                              onCheckedChange={() => setSelectedLevel(level.toLowerCase())}
                              className="border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={level} className="text-sm text-gray-700 cursor-pointer">
                              {level}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="price" className="border-0">
                    <AccordionTrigger className="text-sm font-medium text-gray-700 hover:text-blue-600">Price</AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="space-y-3">
                        {priceRanges.map((range) => (
                          <div key={range.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={range.value}
                              checked={selectedPrice === range.value}
                              onCheckedChange={() => setSelectedPrice(range.value)}
                              className="border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={range.value} className="text-sm text-gray-700 cursor-pointer">
                              {range.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Controls */}
            <div className="space-y-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search courses, instructors, or topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white sm:w-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{courses.length}</span> {courses.length === 1 ? "course" : "courses"} found
                </p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={viewMode === "grid" ? "bg-blue-600 text-white" : "border-gray-200 text-gray-700"}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "bg-blue-600 text-white" : "border-gray-200 text-gray-700"}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40 border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Courses Grid/List */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="overflow-hidden hover:shadow-2xl transition-all duration-300 group border-0 shadow-lg">
                    <div className="relative">
                      <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <Play className="h-16 w-16 text-blue-600/50 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <Badge className="absolute top-3 left-3 bg-blue-600 text-white border-0">
                        {course.level}
                      </Badge>
                      {course.enrolled && (
                        <Badge className="absolute top-3 right-3 bg-green-600 text-white border-0">
                          Enrolled
                        </Badge>
                      )}
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-0">
                          {course.category}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{course.rating}</span>
                        </div>
                      </div>
                      <CardTitle className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-gray-600">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {course.instructor.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{course.instructor}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>N/A</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{course.students.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <div className="text-2xl font-bold text-blue-600">
                          {course.price === 0 ? "Free" : `$${course.price}`}
                        </div>
                        <div className="text-sm text-gray-500 line-through">
                          {course.price > 0 ? `$${(course.price * 1.2).toFixed(2)}` : ''}
                        </div>
                      </div>
                      <Button 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        onClick={(e) => {
                          e.preventDefault()
                          if (course.enrolled) {
                            router.push(`/learn/courses/${course.id}`)
                          } else if (isInCart(course.id)) {
                            handleGoToCart()
                          } else {
                            handleAddToCart(course)
                          }
                        }}
                      >
                        {course.enrolled ? "Continue Learning" : isInCart(course.id) ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            In Cart
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <Card key={course.id} className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-48 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <Play className="h-12 w-12 text-blue-600/50" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                                <Badge className="bg-blue-600 text-white border-0">{course.level}</Badge>
                                {course.enrolled && (
                                  <Badge className="bg-green-600 text-white border-0">
                                    Enrolled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600 mb-3">{course.description}</p>
                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                      {course.instructor.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium">{course.instructor}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{course.rating} rating</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Users className="h-4 w-4" />
                                  <span>{course.students.toLocaleString()} students</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-4 w-4" />
                                  <span>N/A</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-3">
                              <div className="flex items-center space-x-2">
                                <div className="text-2xl font-bold text-blue-600">
                                  {course.price === 0 ? "Free" : `$${course.price}`}
                                </div>
                                <div className="text-sm text-gray-500 line-through">
                                  {course.price > 0 ? `$${(course.price * 1.2).toFixed(2)}` : ''}
                                </div>
                              </div>
                              <Button 
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                onClick={(e) => {
                                  e.preventDefault()
                                  if (course.enrolled) {
                                    router.push(`/learn/courses/${course.id}`)
                                  } else if (isInCart(course.id)) {
                                    handleGoToCart()
                                  } else {
                                    handleAddToCart(course)
                                  }
                                }}
                              >
                                {course.enrolled ? "Continue Learning" : isInCart(course.id) ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    In Cart
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add to Cart
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {courses.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">No courses found</h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory("all")
                    setSelectedLevel("all")
                    setSelectedPrice("all")
                  }}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}