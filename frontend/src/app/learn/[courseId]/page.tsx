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
  Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export default function CourseOverviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null)
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false)

  // Unwrap the params Promise using React.use()
  const { courseId } = use(params)

  useEffect(() => {
    const checkAuthAndEnrollment = async () => {
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
        
        // Check enrollment status
        const enrollmentResponse = await fetch(`/api/student/enrollment?courseId=${courseId}&userId=${userData.id}`)
        
        if (!enrollmentResponse.ok) {
          const errorData = await enrollmentResponse.text()
          console.error('Enrollment check failed:', errorData)
          
          if (enrollmentResponse.status === 401) {
            setAuthError('Authentication required. Please log in again.')
            setTimeout(() => {
              router.push(`/auth/login?redirect=/learn/${courseId}`)
            }, 2000)
            return
          }
          
          if (enrollmentResponse.status === 403) {
            setEnrollmentError('You are not enrolled in this course. Please purchase the course to access it.')
            setTimeout(() => {
              router.push(`/courses/${courseId}`)
            }, 3000)
            return
          }
          
          throw new Error('Failed to verify enrollment')
        }
        
        const enrollmentData = await enrollmentResponse.json()
        
        if (!enrollmentData.data.enrolled) {
          setEnrollmentError('You are not enrolled in this course. Redirecting to course page...')
          setTimeout(() => {
            router.push(`/courses/${courseId}`)
          }, 3000)
          return
        }
        
        setEnrollment(enrollmentData.data.enrollment)
        
      } catch (error) {
        console.error('Auth/Enrollment check error:', error)
        setAuthError('Failed to verify access. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndEnrollment()
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

  // Mock course data - in real app, fetch from API
  const course = {
    id: courseId,
    title: "Complete React Development Course",
    description: "Master React from basics to advanced concepts including hooks, context, and modern patterns. Build real-world projects and learn industry best practices.",
    instructor: {
      name: "John Smith",
      avatar: "/api/placeholder/100/100",
      bio: "Senior React Developer with 8+ years of experience",
      rating: 4.9,
      students: 15420
    },
    thumbnail: "/api/placeholder/800/400",
    price: 99.99,
    rating: 4.8,
    totalStudents: 1542,
    totalLessons: 24,
    totalDuration: "8h 45m",
    level: "Intermediate",
    language: "English",
    lastUpdated: "November 2024",
    completionCertificate: true,
    // Student progress
    enrolledAt: "2024-10-15",
    progress: 65,
    completedLessons: 16,
    timeSpent: "5h 32m",
    nextLesson: {
      id: "react-lesson-17",
      title: "Advanced State Management with Redux",
      chapterId: "react-ch2"
    }
  }

  const curriculum = [
    {
      id: "react-ch1",
      title: "Getting Started with React",
      order: 1,
      lessons: [
        { 
          id: "react-lesson-1", 
          title: "Introduction to React", 
          duration: "20:15", 
          completed: true,
          description: "Learn what React is and why it's popular"
        },
        { 
          id: "react-lesson-2", 
          title: "Setting up Development Environment", 
          duration: "18:30", 
          completed: true,
          description: "Install Node.js, npm, and create your first React app"
        },
        { 
          id: "react-lesson-3", 
          title: "Your First React Component", 
          duration: "25:45", 
          completed: true,
          description: "Create and understand React components"
        }
      ]
    },
    {
      id: "react-ch2",
      title: "Advanced React Concepts",
      order: 2,
      lessons: [
        { 
          id: "react-lesson-17", 
          title: "Advanced State Management with Redux", 
          duration: "40:20", 
          completed: false,
          description: "Learn Redux for complex state management",
          isNext: true
        },
        { 
          id: "react-lesson-18", 
          title: "React Router for Navigation", 
          duration: "35:10", 
          completed: false,
          description: "Implement client-side routing"
        }
      ]
    }
  ]

  const reviews = [
    {
      id: "1",
      user: "Sarah Johnson",
      rating: 5,
      comment: "Excellent course! The instructor explains complex concepts very clearly.",
      date: "2024-10-20"
    },
    {
      id: "2", 
      user: "Mike Chen",
      rating: 4,
      comment: "Great content and practical examples. Helped me land my first React job!",
      date: "2024-10-18"
    }
  ]

  const handleBackToDashboard = () => {
    router.push('/learn')
  }

  const handleStartLesson = (lessonId: string) => {
    router.push(`/learn/${courseId}/${lessonId}`)
  }

  const handleContinueLearning = () => {
    if (course.nextLesson) {
      router.push(`/learn/${courseId}/${course.nextLesson.id}`)
    }
  }

  const handleGenerateCertificate = async () => {
    if (!user || !enrollment) return

    setIsGeneratingCertificate(true)
    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          courseId: enrollment.courseId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate certificate')
      }

      const data = await response.json()
      // Redirect to certificate page
      router.push(`/certificates/${data.data.certificateId}`)
    } catch (error) {
      console.error('Certificate generation error:', error)
      alert('Failed to generate certificate. Please try again.')
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
              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{course.description}</p>
              
              <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{course.rating}</span>
                  <span>({course.totalStudents.toLocaleString()} students)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.totalDuration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.totalLessons} lessons</span>
                </div>
                <Badge variant="secondary">{course.level}</Badge>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={course.instructor.avatar} />
                  <AvatarFallback>{course.instructor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{course.instructor.name}</h3>
                  <p className="text-sm text-muted-foreground">{course.instructor.bio}</p>
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
                    <span>{course.completedLessons} of {course.totalLessons} lessons</span>
                    <span>{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="w-full" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Time Spent</p>
                    <p className="font-medium">{course.timeSpent}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Enrolled</p>
                    <p className="font-medium">{new Date(course.enrolledAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {course.nextLesson && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Next Lesson:</p>
                    <p className="font-medium text-sm mb-3">{course.nextLesson.title}</p>
                    <Button onClick={handleContinueLearning} className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Button>
                  </div>
                )}

                {course.progress === 100 && (
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="curriculum" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  {course.totalLessons} lessons • {course.totalDuration} total length
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
                    <p className="text-muted-foreground">Level</p>
                    <p className="font-medium">{course.level}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{course.totalDuration}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Language</p>
                    <p className="font-medium">{course.language}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-medium">{course.lastUpdated}</p>
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
                  {course.rating} average rating • {course.totalStudents.toLocaleString()} reviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start space-x-4">
                        <Avatar>
                          <AvatarFallback>{review.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{review.user}</h4>
                            <span className="text-sm text-muted-foreground">{review.date}</span>
                          </div>
                          <div className="flex items-center space-x-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}