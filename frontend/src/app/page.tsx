"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Star, Clock, Users, BookOpen, Play, TrendingUp, Award, CheckCircle, Sparkles } from "lucide-react"
import Link from "next/link"

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
  duration: string
  category: string
  featured: boolean
}

interface Category {
  id: string
  name: string
  icon: string
  courses: number
}

interface Stat {
  icon: string
  label: string
  value: string
  color: string
}

export default function Home() {
  const router = useRouter()
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, categoriesRes, statsRes] = await Promise.all([
          fetch('/api/featured-courses'),
          fetch('/api/categories'),
          fetch('/api/stats')
        ])

        const coursesData = await coursesRes.json()
        const categoriesData = await categoriesRes.json()
        const statsData = await statsRes.json()

        setFeaturedCourses(coursesData)
        setCategories(categoriesData)
        setStats(statsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Web Development': 'from-blue-500 to-cyan-400',
      'Data Science': 'from-purple-500 to-pink-400',
      'Design': 'from-orange-500 to-red-400',
      'Business': 'from-green-500 to-emerald-400',
      'Marketing': 'from-indigo-500 to-blue-400',
      'Photography': 'from-pink-500 to-rose-400'
    }
    return colors[categoryName] || 'from-gray-500 to-gray-400'
  }

  // Consistent number formatting function
  const formatNumber = (num: number) => {
    if (!mounted) return num.toString() // Prevent hydration mismatch
    return new Intl.NumberFormat('en-US').format(num)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CourseCompass...</p>
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
                <a href="/courses" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Browse Courses</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Categories</a>
                <a href="#" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Teach</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search courses..." 
                  className="pl-10 w-64 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <Link href="/auth/login">
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                >
                  Log In
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mb-6">
            <Badge className="bg-white/20 text-white border-white/30 mb-4">
              <Sparkles className="h-4 w-4 mr-2" />
              New: AI-Powered Learning Analytics
            </Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
            Learn from the Best, 
            <span className="block text-yellow-300"> Track Your Progress</span>
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of students learning with data-driven insights. 
            Get personalized learning experiences and real-time progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="What do you want to learn?" 
                className="pl-10 h-12 bg-white/90 backdrop-blur border-0 shadow-lg"
              />
            </div>
            <Button size="lg" className="h-12 bg-white text-blue-600 hover:bg-gray-100 font-semibold">
              Search Courses
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon === 'Users' ? Users : 
                                 stat.icon === 'BookOpen' ? BookOpen : 
                                 stat.icon === 'Award' ? Award : 
                                 stat.icon === 'TrendingUp' ? TrendingUp : Users
              return (
                <div key={index} className="text-center">
                  <IconComponent className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/80">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Popular Categories
            </h2>
            <p className="text-lg text-gray-600">Explore our diverse range of courses</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Card key={category.id} className="text-center hover:shadow-xl transition-all duration-300 group cursor-pointer border-0 shadow-lg overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${getCategoryColor(category.name)}`}></div>
                <CardContent className="pt-6">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{category.icon}</div>
                  <h3 className="font-semibold mb-1 text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.courses} courses</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
                Featured Courses
              </h2>
              <p className="text-gray-600">Handpicked courses by our expert team</p>
            </div>
            <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
              View All Courses
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="block">
                <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group border-0 shadow-lg">
                  <div className="relative">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <Play className="h-16 w-16 text-blue-600/50 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <Badge className="absolute top-3 left-3 bg-blue-600 text-white border-0">
                      {course.level}
                    </Badge>
                    {course.featured && (
                      <Badge className="absolute top-3 right-3 bg-yellow-500 text-white border-0">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
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
                        <span>{course.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{formatNumber(course.students)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-blue-600">${course.price}</div>
                      <div className="text-sm text-gray-500 line-through">${(course.price * 1.2).toFixed(2)}</div>
                    </div>
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/courses/${course.id}`);
                      }}
                    >
                      Enroll Now
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
          </div>
          <h2 className="text-4xl font-bold mb-6 text-white">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join our community of learners and instructors. Get access to thousands of courses 
            with real-time progress tracking and personalized insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
              Browse All Courses
            </Button>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Start Teaching
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  CourseCompass
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Data-driven learning platform for students and instructors.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">For Students</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/courses" className="hover:text-blue-400 transition-colors">Browse Courses</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">My Learning</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Achievements</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">For Instructors</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Teach on CourseCompass</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Analytics Dashboard</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Resources</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2024 CourseCompass. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}