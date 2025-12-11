"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Star,
  Clock,
  Play,
  Plus,
  BarChart3,
  Eye,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  LogOut,
  User,
  Settings
} from "lucide-react"
import { useAuth } from "@/lib/auth"

export default function InstructorDashboard() {
  const router = useRouter()
  const { logout: authLogout } = useAuth()
  const [timeRange, setTimeRange] = useState("30d")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [user, setUser] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([])
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [progressDistribution, setProgressDistribution] = useState<any>({
    '0-25': 0,
    '26-50': 0,
    '51-75': 0,
    '76-100': 0
  })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [enrollmentDataFetched, setEnrollmentDataFetched] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  useEffect(() => {
    const fetchInstructorData = async () => {
      if (!user?.id) return

      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const accessToken = localStorage.getItem('access_token')
        
        if (!accessToken) {
          console.error('No access token found')
          router.push('/auth/login')
          return
        }

        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }

        // Fetch instructor's courses from Django
        try {
          const coursesResponse = await fetch(`${API_BASE_URL}/api/courses/?instructorId=${user.id}`, { headers })
          if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json()
            console.log('📚 Courses from Django:', coursesData)
            
            // Map Django response to frontend format
            const mappedCourses = coursesData.results?.map((course: any) => ({
              id: course.id,
              title: course.title,
              status: course.status || 'draft',
              thumbnail: course.thumbnail, // Course thumbnail URL
              students: course.enrolled_count || 0,
              rating: course.rating || 4.5, // Use actual rating or default
              price: parseFloat(course.price) || 0, // Course price
              revenue: (course.enrolled_count || 0) * (parseFloat(course.price) || 0), // Calculate revenue
              completionRate: course.completion_rate || 0, // Use actual completion rate
              lastUpdated: course.updated_at ? new Date(course.updated_at).toLocaleDateString() : 'N/A',
              lessons: course.lesson_count || 0,
              enrollments: course.enrolled_count || 0,
              averageProgress: course.average_progress || 0,
              description: course.description || '',
              category: course.category || 'Uncategorized'
            })) || []
            
            const mappedStats = {
              totalCourses: coursesData.count || mappedCourses.length,
              totalStudents: mappedCourses.reduce((sum: number, c: any) => sum + c.students, 0),
              totalEnrollments: mappedCourses.reduce((sum: number, c: any) => sum + c.enrollments, 0),
              totalLessons: mappedCourses.reduce((sum: number, c: any) => sum + c.lessons, 0),
              totalRevenue: mappedCourses.reduce((sum: number, c: any) => sum + c.revenue, 0),
              averageRating: mappedCourses.length > 0 
                ? mappedCourses.reduce((sum: number, c: any) => sum + c.rating, 0) / mappedCourses.length 
                : 0,
              completionRate: mappedCourses.length > 0 
                ? mappedCourses.reduce((sum: number, c: any) => sum + c.completionRate, 0) / mappedCourses.length 
                : 0
            }
            
            setCourses(mappedCourses)
            setStats(mappedStats)
            setEnrollmentDataFetched(false) // Reset flag when new courses are loaded
          } else if (coursesResponse.status === 401) {
            console.error('Authentication failed')
            router.push('/auth/login')
            return
          } else {
            console.log('Courses endpoint returned error, using defaults')
            setCourses([])
            setStats({
              totalCourses: 0,
              totalStudents: 0,
              totalEnrollments: 0,
              totalLessons: 0,
              totalRevenue: 0,
              averageRating: 0,
              completionRate: 0
            })
          }
        } catch (error) {
          console.log('Error fetching courses:', error)
          setCourses([])
          setStats({
            totalCourses: 0,
            totalStudents: 0,
            totalEnrollments: 0,
            totalLessons: 0,
            totalRevenue: 0,
            averageRating: 0,
            completionRate: 0
          })
        }

        // Fetch recent activity from Django (endpoint not implemented yet)
        try {
          const activityResponse = await fetch(`${API_BASE_URL}/api/instructor/activity/?limit=10`, { headers })
          if (activityResponse.ok) {
            const activityData = await activityResponse.json()
            console.log('📈 Activity data from Django:', activityData)
            
            // Map Django activity to frontend format
            const mappedActivity = activityData.results?.map((activity: any) => ({
              id: activity.id,
              type: activity.action_type,
              description: activity.description || `${activity.action_type} activity`,
              timestamp: activity.timestamp,
              user: activity.user_name || 'Unknown',
              course: activity.course_title || 'N/A'
            })) || []
            
            setRecentActivity(mappedActivity)
          } else {
            console.log('Activity endpoint not available')
            setRecentActivity([])
          }
        } catch (error) {
          console.log('Activity endpoint not available:', error)
          setRecentActivity([])
        }

      } catch (error) {
        console.error('Error fetching instructor data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInstructorData()
  }, [user, router])

  // Separate effect to fetch enrollments and calculate analytics after courses are loaded
  useEffect(() => {
    const fetchEnrollmentAnalytics = async () => {
      if (courses.length === 0 || enrollmentDataFetched) return

      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const accessToken = localStorage.getItem('access_token')
        
        if (!accessToken) return

        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }

        let allEnrollments: any[] = []
        
        // Fetch enrollments for each course
        for (const course of courses) {
            try {
              const enrollmentsResponse = await fetch(`${API_BASE_URL}/api/enrollments/?course=${course.id}`, { headers })
              
              if (enrollmentsResponse.ok) {
                const enrollmentsData = await enrollmentsResponse.json()
                
                const courseEnrollments = (enrollmentsData.results || enrollmentsData || []).map((e: any) => ({
                  ...e,
                  course: course.id,
                  course_title: course.title
                }))
                allEnrollments = [...allEnrollments, ...courseEnrollments]
              }
            } catch (error) {
              console.error(`Error fetching enrollments for course ${course.id}:`, error)
            }
          }
          
          // Update courses with calculated completion rates and average progress
          const updatedCourses = courses.map(course => {
            const courseEnrollments = allEnrollments.filter(e => e.course === course.id || e.course_title === course.title)
            
            console.log(`📈 Course "${course.title}" (ID: ${course.id}):`, {
              totalEnrollments: courseEnrollments.length,
              enrollments: courseEnrollments
            })
            
            if (courseEnrollments.length === 0) {
              console.log(`⚠️ No enrollments found for course ${course.id}`)
              return course
            }
            
            // Calculate average progress for this course
            const totalProgress = courseEnrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0)
            const averageProgress = Math.round(totalProgress / courseEnrollments.length)
            
            // Calculate completion rate (students with 100% progress)
            const completedCount = courseEnrollments.filter(e => (e.progress_percentage || 0) >= 100).length
            const completionRate = Math.round((completedCount / courseEnrollments.length) * 100)
            
            console.log(`✨ Calculated for "${course.title}":`, {
              averageProgress,
              completionRate,
              completedCount,
              totalEnrollments: courseEnrollments.length
            })
            
            return {
              ...course,
              averageProgress,
              completionRate
            }
          })
          
          console.log('🔄 Updating courses state with:', updatedCourses)
          setCourses(updatedCourses)
          
          // Calculate progress distribution
          if (allEnrollments.length > 0) {
            const distribution = {
              '0-25': 0,
              '26-50': 0,
              '51-75': 0,
              '76-100': 0
            }
            
            allEnrollments.forEach((enrollment: any) => {
              const progress = enrollment.progress_percentage || 0
              if (progress <= 25) distribution['0-25']++
              else if (progress <= 50) distribution['26-50']++
              else if (progress <= 75) distribution['51-75']++
              else distribution['76-100']++
            })
            
            // Convert to percentages
            const total = allEnrollments.length
            setProgressDistribution({
              '0-25': Math.round((distribution['0-25'] / total) * 100),
              '26-50': Math.round((distribution['26-50'] / total) * 100),
              '51-75': Math.round((distribution['51-75'] / total) * 100),
              '76-100': Math.round((distribution['76-100'] / total) * 100)
            })
          } else {
            setProgressDistribution({ '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 })
          }
          
          // Identify at-risk students (low progress, inactive)
          const atRisk = allEnrollments
            .filter((e: any) => {
              const progress = e.progress_percentage || 0
              const enrolledDate = new Date(e.enrolled_at)
              const daysSinceEnrollment = Math.floor((Date.now() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24))
              // At risk if: enrolled for more than 7 days but less than 25% progress
              return daysSinceEnrollment > 7 && progress < 25
            })
            .slice(0, 10)
            .map((e: any) => ({
              id: e.id,
              name: e.student?.name || e.student?.email || 'Unknown Student',
              course: e.course_title,
              progress: e.progress_percentage || 0,
              lastActive: e.last_activity || e.enrolled_at
            }))
          
          setAtRiskStudents(atRisk)
          
          // Identify top performers (high progress or completed)
          const topPerf = allEnrollments
            .filter((e: any) => (e.progress_percentage || 0) >= 75)
            .sort((a: any, b: any) => (b.progress_percentage || 0) - (a.progress_percentage || 0))
            .slice(0, 10)
            .map((e: any) => {
              const enrolledDate = new Date(e.enrolled_at)
              const completedDate = e.completed_at ? new Date(e.completed_at) : null
              const completionTime = completedDate 
                ? Math.floor((completedDate.getTime() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24))
                : null
              
              return {
                id: e.id,
                name: e.student?.name || e.student?.email || 'Unknown Student',
                course: e.course_title,
                progress: e.progress_percentage || 0,
                completionTime: completionTime
              }
            })
          
          setTopPerformers(topPerf)
          
          // Mark enrollment data as fetched to prevent re-fetching
          setEnrollmentDataFetched(true)
      } catch (error) {
        console.log('Error calculating student analytics:', error)
        setAtRiskStudents([])
        setTopPerformers([])
        setProgressDistribution({ '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 })
      }
    }

    fetchEnrollmentAnalytics()
  }, [courses.length, enrollmentDataFetched])

  const handleLogout = async () => {
    console.log('Instructor logout clicked')
    try {
      // Use the auth context logout method which uses djangoApi
      await authLogout()
      // The logout method will handle redirect
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, still redirect
      window.location.href = '/'
    }
  }

  // Use real data from API, fallback to defaults for display
  const instructorStats = {
    totalStudents: stats.totalStudents || 0,
    totalCourses: stats.totalCourses || 0,
    totalRevenue: stats.totalRevenue || 0,
    averageRating: stats.averageRating || 0,
    monthlyRevenue: Math.round((stats.totalRevenue || 0) / 12), // Rough monthly estimate
    completionRate: stats.completionRate || 0
  }

  // Consistent number formatting function
  const formatNumber = (num: number) => {
    if (!mounted) return num.toString() // Prevent hydration mismatch
    return new Intl.NumberFormat('en-US').format(num)
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">CourseCompass</span>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <a href="/" className="text-sm font-medium hover:text-primary">Home</a>
                <a href="/courses" className="text-sm font-medium hover:text-primary">Browse Courses</a>
                <a href="/instructor" className="text-sm font-medium text-primary">Instructor Dashboard</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'I'}
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
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Instructor Dashboard</h1>
            <p className="text-muted-foreground">Manage your courses and track your performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => router.push('/instructor/import-export')}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Import/Export
            </Button>
            <Button onClick={() => router.push('/instructor/create-course')}>
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{formatNumber(instructorStats.totalStudents)}</p>
                  <p className="text-xs text-muted-foreground">
                    Across all courses
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${formatNumber(instructorStats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">
                    Based on course prices × enrollments
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">{instructorStats.averageRating}</p>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="text-xs text-muted-foreground">across all courses</span>
                  </div>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{instructorStats.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">above platform average</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                  <CardDescription>Track your course earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">Revenue tracking coming soon</p>
                    <p className="text-sm text-muted-foreground">Monitor your course sales and earnings</p>
                  </div>
                </CardContent>
              </Card>

              {/* Student Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle>Student Engagement</CardTitle>
                  <CardDescription>Track student activity and participation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">Engagement analytics coming soon</p>
                    <p className="text-sm text-muted-foreground">See daily active students and participation rates</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-shrink-0">
                        {(activity.type === "enrollment" || activity.type === "ENROLLMENT_RECEIVED") && <Users className="h-5 w-5 text-blue-600" />}
                        {(activity.type === "review" || activity.type === "REVIEW_RECEIVED") && <Star className="h-5 w-5 text-yellow-600" />}
                        {(activity.type === "completion" || activity.type === "COURSE_COMPLETED") && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {(activity.type === "question" || activity.type === "QUESTION_ASKED") && <MessageSquare className="h-5 w-5 text-purple-600" />}
                        {(activity.type === "course_published" || activity.type === "COURSE_PUBLISHED") && <BookOpen className="h-5 w-5 text-green-600" />}
                        {(activity.type === "course_created" || activity.type === "COURSE_CREATED") && <Plus className="h-5 w-5 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {activity.description || (
                            <>
                              {activity.student && <span className="font-medium">{activity.student}</span>}
                              {activity.type === "enrollment" && " enrolled in "}
                              {activity.type === "review" && " rated "}
                              {activity.type === "completion" && " completed "}
                              {activity.type === "question" && " asked a question in "}
                              {activity.course && <span className="font-medium">{activity.course}</span>}
                              {activity.type === "review" && activity.rating && (
                                <span className="text-yellow-600"> ★{activity.rating}</span>
                              )}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.relativeTime || activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative">
                    {course.thumbnail ? (
                      <Image 
                        src={course.thumbnail} 
                        alt={course.title}
                        fill
                        className="object-cover"
                        unoptimized // Since images come from Django backend
                      />
                    ) : (
                      <Play className="h-12 w-12 text-muted-foreground/50" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold line-clamp-2 mb-1">{course.title}</h3>
                        <Badge variant={course.status === "published" ? "default" : "secondary"}>
                          {course.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{formatNumber(course.students)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-600" />
                          <span>{course.rating}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span>${formatNumber(course.price)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span>{course.completionRate}%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-3">Last updated: {course.lastUpdated}</p>
                        <div className="flex flex-col space-y-2">
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => router.push(`/instructor/create-course?edit=${course.id}`)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => router.push(`/instructor/analytics/${course.id}`)}
                            >
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Analytics
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant="default" 
                              className="w-full"
                              onClick={() => router.push(`/instructor/courses/${course.id}/students`)}
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Students
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full"
                              onClick={() => router.push(`/instructor/quiz/create?courseId=${course.id}`)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Quiz
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                  <CardDescription>Detailed analytics for each course</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-sm">{course.title}</h4>
                          <span className="text-sm text-muted-foreground">{course.completionRate}%</span>
                        </div>
                        <Progress value={course.completionRate} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{course.students} students</span>
                          <span>${course.price} price</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Distribution</CardTitle>
                  <CardDescription>How students are progressing through your courses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">0-25% Complete</span>
                        <span className="text-sm text-muted-foreground">{progressDistribution['0-25']}%</span>
                      </div>
                      <Progress value={progressDistribution['0-25']} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">26-50% Complete</span>
                        <span className="text-sm text-muted-foreground">{progressDistribution['26-50']}%</span>
                      </div>
                      <Progress value={progressDistribution['26-50']} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">51-75% Complete</span>
                        <span className="text-sm text-muted-foreground">{progressDistribution['51-75']}%</span>
                      </div>
                      <Progress value={progressDistribution['51-75']} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">76-100% Complete</span>
                        <span className="text-sm text-muted-foreground">{progressDistribution['76-100']}%</span>
                      </div>
                      <Progress value={progressDistribution['76-100']} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>At-Risk Students</CardTitle>
                  <CardDescription>Students who may need additional support</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {atRiskStudents.map((student) => (
                      <div key={student.id} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-sm">{student.name}</h4>
                            <span className="text-xs text-red-600">{student.progress}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{student.course}</p>
                          <p className="text-xs text-red-600">Last active: {student.lastActive || new Date(student.lastActive).toLocaleDateString()}</p>
                        </div>
                        <Button size="sm" variant="outline">Contact</Button>
                      </div>
                    ))}
                    {atRiskStudents.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No at-risk students found</p>
                        <p className="text-xs">All students are making good progress!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>Students with exceptional progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers.map((student, index) => (
                      <div key={student.id || index} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-sm">{student.name}</h4>
                            <span className="text-xs text-green-600">{student.progress}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{student.course}</p>
                          <p className="text-xs text-green-600">
                            {student.completionTime ? `Completed in: ${student.completionTime} days` : 'In progress'}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">Message</Button>
                      </div>
                    ))}
                    {topPerformers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No top performers yet</p>
                        <p className="text-xs">Students will appear here as they progress!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}