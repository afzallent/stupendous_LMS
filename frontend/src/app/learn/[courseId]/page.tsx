"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BookOpen, 
  Clock, 
  Users, 
  Star, 
  Play, 
  CheckCircle, 
  Circle,
  ArrowLeft,
  Award,
  Calendar,
  Target,
  TrendingUp,
  Lock,
  AlertTriangle,
  Loader2,
  FileQuestion,
  GraduationCap,
  BarChart3,
  PlayCircle
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"

// Quizzes Tab Component
function QuizzesTab({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await djangoApi.get<any>('/api/quizzes/', { course: courseId })
        setQuizzes(data.results || data || [])
      } catch (error) {
        console.error('Error fetching quizzes:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchQuizzes()
  }, [courseId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quizzes...</p>
        </CardContent>
      </Card>
    )
  }

  if (quizzes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Quizzes</CardTitle>
          <CardDescription>Test your knowledge</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No quizzes available yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your instructor hasn't added any quizzes to this course
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Quizzes</CardTitle>
        <CardDescription>Test your knowledge and track your progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{quiz.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{quiz.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {quiz.question_count} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {quiz.passing_score}% to pass
                    </span>
                    {quiz.time_limit && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {quiz.time_limit} minutes
                      </span>
                    )}
                  </div>
                </div>
                <Button onClick={() => router.push(`/learn/${courseId}/quiz/${quiz.id}`)}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Quiz
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Enrollment {
  id: string
  courseId: string
  progress: number
  enrolledAt: string
  completedLessons: number
}

interface Lesson {
  id: string
  title: string
  order: number
  duration: string
  completed: boolean
  completed_at: string | null
  video_url: string | null
  video_file: string | null
  content: string
}

interface CourseData {
  id: string
  title: string
  description: string
  instructor: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  thumbnail: string | null
  price: number
  total_lessons: number
  enrolled_at: string
  progress_percentage: number
  completed_lessons: number
  next_lesson: {
    id: string
    title: string
  } | null
  lessons: Lesson[]
  status: string
  created_at: string
  updated_at: string
}

export default function CourseOverviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null)
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false)

  const { courseId } = use(params)

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
          setAuthError('Please log in to access this course.')
          setTimeout(() => {
            router.push(`/auth/login?redirect=/learn/${courseId}`)
          }, 2000)
          return
        }

        const userData = JSON.parse(storedUser)
        setUser(userData)
        
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const accessToken = localStorage.getItem('access_token')
        
        const courseResponse = await fetch(`${API_BASE_URL}/api/courses/${courseId}/with-progress/?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        })
        
        if (!courseResponse.ok) {
          const errorData = await courseResponse.json().catch(() => ({}))
          console.error('Course fetch failed:', errorData)
          
          if (courseResponse.status === 401) {
            setAuthError('Authentication required. Please log in again.')
            setTimeout(() => {
              router.push(`/auth/login?redirect=/learn/${courseId}`)
            }, 2000)
            return
          }
          
          if (courseResponse.status === 403) {
            setEnrollmentError('You are not enrolled in this course. Please purchase the course to access it.')
            setTimeout(() => {
              router.push(`/courses/${courseId}`)
            }, 3000)
            return
          }
          
          throw new Error('Failed to fetch course data')
        }
        
        const data = await courseResponse.json()
        setCourseData(data)
        
        setEnrollment({
          id: 'enrollment-' + courseId,
          courseId: courseId,
          progress: data.progress_percentage,
          enrolledAt: data.enrolled_at,
          completedLessons: data.completed_lessons
        })
        
      } catch (error) {
        console.error('Course data fetch error:', error)
        setAuthError('Failed to load course data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourseData()
  }, [courseId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push(`/auth/login?redirect=/learn/${courseId}`)}>Go to Login</Button>
        </div>
      </div>
    )
  }

  if (enrollmentError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Course Access Restricted</h2>
          <Alert className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertDescription>{enrollmentError}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={() => router.push(`/courses/${courseId}`)}>View Course Details</Button>
            <Button variant="outline" onClick={() => router.push('/learn')}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!courseData) return null

  const handleBackToDashboard = () => router.push('/learn')
  const handleStartLesson = (lessonId: string) => router.push(`/learn/${courseId}/${lessonId}`)
  const handleContinueLearning = () => {
    if (courseData.next_lesson) {
      router.push(`/learn/${courseId}/${courseData.next_lesson.id}`)
    }
  }

  const curriculum = [
    {
      id: "chapter-1",
      title: "Course Content",
      order: 1,
      lessons: courseData.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration,
        completed: lesson.completed,
        description: lesson.content || "Lesson content",
        isNext: courseData.next_lesson?.id === lesson.id
      }))
    }
  ]

  const handleGenerateCertificate = async () => {
    if (!user || !enrollment) return
    setIsGeneratingCertificate(true)
    try {
      const certificateResponse = await djangoApi.post<any>('/api/certificates/', { course_id: courseId })
      toast({
        title: "🎉 Certificate Generated!",
        description: `Your completion certificate for "${courseData.title}" is ready!`,
        duration: 5000
      })
      setTimeout(() => router.push('/profile/certificates'), 2000)
    } catch (error: any) {
      console.error('Certificate generation error:', error)
      if (error.response?.status === 400) {
        toast({ title: "Cannot Generate Certificate", description: error.response.data?.detail || 'Course not completed yet', variant: "destructive" })
      } else {
        toast({ title: "Error", description: "Failed to generate certificate. Please try again.", variant: "destructive" })
      }
    } finally {
      setIsGeneratingCertificate(false)
    }
  }

  // Get thumbnail URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const thumbnailUrl = courseData.thumbnail 
    ? (courseData.thumbnail.startsWith('http') ? courseData.thumbnail : `${API_BASE_URL}${courseData.thumbnail}`)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/learn" className="flex items-center space-x-2">
              <BookOpen className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold">CourseCompass</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Course Thumbnail */}
      <div className="relative">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-primary/70 dark:from-primary/80 dark:via-primary/70 dark:to-primary/60" />
        
        {/* Thumbnail as background */}
        {thumbnailUrl && (
          <div className="absolute inset-0">
            <Image
              src={thumbnailUrl}
              alt={courseData.title}
              fill
              className="object-cover opacity-20"
              priority
            />
          </div>
        )}

        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Course Info */}
            <div className="lg:col-span-2 text-white">
              <Badge className="mb-4 bg-white/20 text-white border-white/30 hover:bg-white/30">
                {courseData.status}
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {courseData.title}
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl">
                {courseData.description}
              </p>
              
              {/* Course Stats */}
              <div className="flex flex-wrap items-center gap-6 mb-8 text-white/90">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span>{courseData.total_lessons} lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>{courseData.progress_percentage}% complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>Enrolled {courseData.enrolled_at ? new Date(courseData.enrolled_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white/30">
                  <AvatarImage src={courseData.instructor.avatar_url} />
                  <AvatarFallback className="bg-white/20 text-white">
                    {courseData.instructor.name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{courseData.instructor.name}</p>
                  <p className="text-sm text-white/70">Course Instructor</p>
                </div>
              </div>
            </div>

            {/* Course Thumbnail Card */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden shadow-2xl border-0">
                {thumbnailUrl ? (
                  <div className="relative aspect-video">
                    <Image
                      src={thumbnailUrl}
                      alt={courseData.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={handleContinueLearning}>
                      <PlayCircle className="h-16 w-16 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-primary/40" />
                  </div>
                )}
                <CardContent className="p-5">
                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">{courseData.completed_lessons} of {courseData.total_lessons} lessons</span>
                      <span className="font-semibold text-primary">{courseData.progress_percentage}%</span>
                    </div>
                    <Progress value={courseData.progress_percentage} className="h-2" />
                  </div>

                  {/* CTA Button */}
                  {courseData.next_lesson ? (
                    <Button onClick={handleContinueLearning} className="w-full" size="lg">
                      <Play className="h-5 w-5 mr-2" />
                      Continue Learning
                    </Button>
                  ) : courseData.progress_percentage === 100 ? (
                    <Button 
                      onClick={handleGenerateCertificate} 
                      className="w-full" 
                      size="lg"
                      disabled={isGeneratingCertificate}
                    >
                      {isGeneratingCertificate ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Award className="h-5 w-5 mr-2" />Get Certificate</>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={() => handleStartLesson(courseData.lessons[0]?.id)} className="w-full" size="lg">
                      <Play className="h-5 w-5 mr-2" />
                      Start Course
                    </Button>
                  )}

                  {/* Next Lesson Info */}
                  {courseData.next_lesson && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Next up:</p>
                      <p className="text-sm font-medium truncate">{courseData.next_lesson.title}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="curriculum" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 border shadow-sm p-1">
            <TabsTrigger value="curriculum" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Curriculum
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="curriculum" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Content</CardTitle>
                    <CardDescription>{courseData.total_lessons} lessons • {courseData.completed_lessons} completed</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {courseData.progress_percentage}% Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {curriculum.map((chapter) => (
                  <div key={chapter.id}>
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-800/30 border-b">
                      <h3 className="font-semibold text-sm text-muted-foreground">
                        Chapter {chapter.order}: {chapter.title}
                      </h3>
                    </div>
                    <div className="divide-y">
                      {chapter.lessons.map((lesson, index) => (
                        <div 
                          key={lesson.id} 
                          className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${lesson.isNext ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                          onClick={() => handleStartLesson(lesson.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              lesson.completed 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : lesson.isNext 
                                  ? 'bg-primary/10' 
                                  : 'bg-slate-100 dark:bg-slate-800'
                            }`}>
                              {lesson.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : lesson.isNext ? (
                                <Play className="h-5 w-5 text-primary" />
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium ${lesson.isNext ? 'text-primary' : ''}`}>{lesson.title}</h4>
                              <p className="text-sm text-muted-foreground truncate">{lesson.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">{lesson.duration || '0:00'}</span>
                              <Button 
                                variant={lesson.isNext ? "default" : "ghost"} 
                                size="sm"
                                className={lesson.isNext ? '' : 'opacity-0 group-hover:opacity-100'}
                              >
                                {lesson.completed ? "Review" : lesson.isNext ? "Continue" : "Start"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes">
            <QuizzesTab courseId={courseId} />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    What you'll learn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Build modern applications from scratch', 'Master core concepts and best practices', 'Implement real-world projects', 'Work with APIs and external data'].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Course Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold">{courseData.status}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Lessons</p>
                      <p className="font-semibold">{courseData.total_lessons}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="font-semibold">{courseData.price > 0 ? `$${courseData.price}` : 'Free'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Updated</p>
                      <p className="font-semibold">{new Date(courseData.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Student Reviews</CardTitle>
                <CardDescription>Reviews feature coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Course reviews will be available soon.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
