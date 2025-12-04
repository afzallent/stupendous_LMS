"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BookOpen, Clock, Play, Star, TrendingUp, Award, Users, Search, LogOut, User, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { XLVILoader } from "@/components/ui/xlvi-loader"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface EnrolledCourse {
  id: string
  title: string
  instructor: string
  progress: number
  totalLessons: number
  completedLessons: number
  thumbnail?: string
  nextLesson?: {
    id: string
    title: string
  }
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedAt: string
}

interface Stats {
  totalEnrolled: number
  totalCompleted: number
  totalHours: number
  currentStreak: number
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState<Stats>({ totalEnrolled: 0, totalCompleted: 0, totalHours: 0, currentStreak: 0 })
  const [loading, setLoading] = useState(true)

  const handleLogout = async () => {
    console.log('Student logout clicked')
    try {
      // Clear local storage immediately
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      
      // Call logout API (optional, for server-side cleanup)
      fetch('/api/auth/logout', {
        method: 'POST',
      }).catch(err => console.log('Logout API error:', err))
      
      // Redirect to home page immediately
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, still redirect
      window.location.href = '/'
    }
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication first
        const storedUser = localStorage.getItem('user')
        console.log('🔍 Learn page - storedUser from localStorage:', storedUser)
        
        if (!storedUser) {
          console.warn('⚠️ No user found in localStorage, redirecting to login')
          const currentPath = window.location.pathname
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`
          return
        }

        const userData = JSON.parse(storedUser)
        
        // Verify user has appropriate role for learning
        if (!['STUDENT', 'TRAINER', 'ADMIN'].includes(userData.role)) {
          console.error('❌ User role not authorized for learning dashboard:', userData.role)
          window.location.href = '/'
          return
        }
        
        setUser(userData)
        console.log('👤 User loaded for dashboard:', { id: userData.id, email: userData.email, name: userData.name, role: userData.role })

        // Fetch dashboard data from Django API
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const accessToken = localStorage.getItem('access_token')
        
        if (!accessToken) {
          console.error('❌ No access token found, redirecting to login')
          const currentPath = window.location.pathname
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`
          return
        }
        
        const apiUrl = `${API_BASE_URL}/api/student/dashboard/`
        console.log('📊 Calling Django dashboard API:', apiUrl)
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        console.log('📊 Dashboard API response status:', response.status)
        
        if (response.status === 401) {
          console.error('❌ Authentication failed, redirecting to login')
          localStorage.removeItem('user')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          const currentPath = window.location.pathname
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          console.log('📚 Dashboard data received from Django:', data)
          
          // Map Django response to frontend format
          const mappedCourses = data.enrolled_courses?.map((course: any) => ({
            id: course.id,
            title: course.title,
            instructor: course.instructor || 'Unknown',
            progress: course.progress_percentage || 0,
            totalLessons: course.total_lessons || 0,
            completedLessons: course.completed_lessons || 0,
            thumbnail: course.thumbnail,
            nextLesson: course.next_lesson ? {
              id: course.next_lesson.id,
              title: course.next_lesson.title
            } : undefined
          })) || []
          
          const mappedStats = {
            totalEnrolled: data.total_courses || 0,
            totalCompleted: data.completed_courses || 0,
            totalHours: data.total_lessons_completed || 0,
            currentStreak: 0 // Django doesn't track this yet
          }
          
          // Mock achievements for now
          const mockAchievements = [
            { id: '1', title: 'First Course', description: 'Enrolled in your first course', icon: '🎓', earnedAt: new Date().toISOString() },
            { id: '2', title: 'Quick Learner', description: 'Completed 5 lessons in one day', icon: '⚡', earnedAt: new Date().toISOString() }
          ]
          
          setEnrolledCourses(mappedCourses)
          setStats(mappedStats)
          setAchievements(mockAchievements)
        } else {
          const errorText = await response.text()
          console.error('❌ Failed to fetch dashboard data:', { status: response.status, error: errorText })
        }
      } catch (error) {
        console.error('❌ Error fetching dashboard data:', error)
        // If there's a network error, still check if user is authenticated
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
          const currentPath = window.location.pathname
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`
          return
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <XLVILoader 
            size="96px" 
            boxColors={['#3b82f6', '#8b5cf6', '#06b6d4']} 
            className="mx-auto mb-6" 
          />
          <p className="text-gray-600 text-lg font-medium">Loading your dashboard...</p>
          <p className="text-gray-400 text-sm mt-2">Preparing your learning experience</p>
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
              <Link href="/" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CourseCompass
                </span>
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/learn" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600">My Learning</Link>
                <Link href="/courses" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Browse Courses</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search your courses..." 
                  className="pl-10 w-64 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      router.push('/profile')
                    }}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault()
                      handleLogout()
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'Student'}! 👋</h1>
          <p className="text-gray-600">Continue your learning journey and achieve your goals.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Enrolled Courses</p>
                  <p className="text-2xl font-bold">{stats.totalEnrolled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hours Learned</p>
                  <p className="text-2xl font-bold">{stats.totalHours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Streak</p>
                  <p className="text-2xl font-bold">{stats.currentStreak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Continue Learning */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Continue Learning</h2>
              <Link href="/courses">
                <Button variant="outline">Browse More Courses</Button>
              </Link>
            </div>
            
            <div className="space-y-6">
              {enrolledCourses.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No courses enrolled yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start your learning journey by enrolling in a course!
                    </p>
                    <Link href="/courses">
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                        Browse Courses
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                enrolledCourses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                          <Play className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                              <p className="text-sm text-gray-600">by {course.instructor}</p>
                            </div>
                            <Badge variant="secondary">
                              {course.completedLessons}/{course.totalLessons} lessons
                            </Badge>
                          </div>
                          
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">Progress</span>
                              <span className="text-sm font-medium">{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              {course.nextLesson ? (
                                <div>
                                  <p className="text-sm text-gray-600">Next lesson:</p>
                                  <p className="text-sm font-medium">{course.nextLesson.title}</p>
                                </div>
                              ) : course.progress === 0 ? (
                                <div>
                                  <p className="text-sm text-gray-600">Ready to start</p>
                                  <p className="text-sm font-medium">Begin your learning journey</p>
                                </div>
                              ) : course.progress === 100 ? (
                                <div>
                                  <p className="text-sm text-gray-600">Course completed!</p>
                                  <p className="text-sm font-medium">🎉 Well done!</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-gray-600">Continue where you left off</p>
                                  <p className="text-sm font-medium">{course.progress}% completed</p>
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Link href={`/learn/${course.id}`}>
                                <Button variant="outline" size="sm" className="flex items-center space-x-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span>View Course</span>
                                </Button>
                              </Link>
                              {course.nextLesson ? (
                                <Link href={`/learn/${course.id}/${course.nextLesson.id}`}>
                                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center space-x-1">
                                    <Play className="h-4 w-4" />
                                    <span>Continue</span>
                                  </Button>
                                </Link>
                              ) : course.progress === 0 ? (
                                <Link href={`/learn/${course.id}`}>
                                  <Button size="sm" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white flex items-center space-x-1">
                                    <Play className="h-4 w-4" />
                                    <span>Start Learning</span>
                                  </Button>
                                </Link>
                              ) : course.progress === 100 ? (
                                <Link href={`/learn/${course.id}`}>
                                  <Button size="sm" variant="outline" className="flex items-center space-x-1">
                                    <Award className="h-4 w-4" />
                                    <span>Review</span>
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/learn/${course.id}`}>
                                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex items-center space-x-1">
                                    <Play className="h-4 w-4" />
                                    <span>Continue</span>
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Recent Achievements</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center space-x-3">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div>
                        <p className="font-medium text-sm">{achievement.title}</p>
                        <p className="text-xs text-gray-600">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Learning Goals */}
            <Card>
              <CardHeader>
                <CardTitle>This Week's Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">5/7</div>
                  <p className="text-sm text-gray-600 mb-4">Days learned this week</p>
                  <Progress value={71} className="h-2 mb-4" />
                  <p className="text-xs text-gray-500">Keep it up! 2 more days to reach your goal.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}