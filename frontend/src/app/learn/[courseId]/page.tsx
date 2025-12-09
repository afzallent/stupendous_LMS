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
  FileQuestion
} from "lucide-react"
import Link from "next/link"
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

  // Unwrap the params Promise using React.use()
  const { courseId } = use(params)

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        // Get user from localStorage
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
        
        // Fetch course data with progress
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const accessToken = localStorage.getItem('access_token')
        
        const courseResponse = await fetch(`${API_BASE_URL}/api/courses/${courseId}/with-progress/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
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
        
        // Set enrollment data
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying course access...</p>
        </div>
      </div>
    )
  }

  // Show authentication error
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

  // Show enrollment error
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

  // Return early if no course data loaded yet
  if (!courseData) {
    return null
  }

  const handleBackToDashboard = () => {
    router.push('/learn')
  }

  const handleStartLesson = (lessonId: string) => {
    router.push(`/learn/${courseId}/${lessonId}`)
  }

  const handleContinueLearning = () => {
    if (courseData.next_lesson) {
      router.push(`/learn/${courseId}/${courseData.next_lesson.id}`)
    }
  }

  // Group lessons into a single chapter for display
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
      // Certificate feature not implemented in Django yet
      toast({
        title: "Coming Soon",
        description: "Certificate generation feature is not yet implemented. Stay tuned!",
        variant: "default"
      })
    } catch (error) {
      console.error('Certificate generation error:', error)
      toast({
        title: "Error",
        description: "Failed to generate certificate. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingCertificate(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/learn" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">CourseCompass</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToDashboard}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-4">{courseData.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{courseData.description}</p>
              
              <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{courseData.total_lessons} lessons</span>
                </div>
                <Badge variant="secondary">{courseData.status}</Badge>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{courseData.instructor.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{courseData.instructor.name}</h3>
                  <p className="text-sm text-muted-foreground">Course Instructor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{courseData.completed_lessons} of {courseData.total_lessons} lessons</span>
                    <span>{courseData.progress_percentage}%</span>
                  </div>
                  <Progress value={courseData.progress_percentage} className="w-full" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Enrolled</p>
                    <p className="font-medium">{courseData.enrolled_at ? new Date(courseData.enrolled_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{courseData.progress_percentage === 100 ? 'Completed' : 'In Progress'}</p>
                  </div>
                </div>

                {courseData.next_lesson && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Next Lesson:</p>
                    <p className="font-medium text-sm mb-3">{courseData.next_lesson.title}</p>
                    <Button onClick={handleContinueLearning} className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Button>
                  </div>
                )}

                {courseData.progress_percentage === 100 && (
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleGenerateCertificate}
                      disabled={isGeneratingCertificate}
                    >
                      {isGeneratingCertificate ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Certificate...
                        </>
                      ) : (
                        <>
                          <Award className="h-4 w-4 mr-2" />
                          Get Certificate
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Content */}
        <Tabs defaultValue="curriculum" className="space-y-6">
          <TabsList>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="curriculum" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  {courseData.total_lessons} lessons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {curriculum.map((chapter) => (
                    <div key={chapter.id} className="border rounded-lg">
                      <div className="p-4 bg-muted/30">
                        <h3 className="font-semibold">
                          Chapter {chapter.order}: {chapter.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {chapter.lessons.length} lessons
                        </p>
                      </div>
                      <div className="divide-y">
                        {chapter.lessons.map((lesson) => (
                          <div key={lesson.id} className="p-4 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {lesson.completed ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : lesson.isNext ? (
                                  <Play className="h-5 w-5 text-primary" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                  <h4 className="font-medium">{lesson.title}</h4>
                                  <p className="text-sm text-muted-foreground">{lesson.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-muted-foreground">{lesson.duration}</span>
                                <Button 
                                  variant={lesson.isNext ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => handleStartLesson(lesson.id)}
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-6">
            <QuizzesTab courseId={courseId} />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>What you'll learn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Build modern React applications from scratch</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Master React hooks and state management</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Implement routing with React Router</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Work with APIs and external data</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{courseData.status}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Lessons</p>
                    <p className="font-medium">{courseData.total_lessons}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price</p>
                    <p className="font-medium">${courseData.price}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-medium">{new Date(courseData.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Reviews</CardTitle>
                <CardDescription>
                  Reviews feature coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
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