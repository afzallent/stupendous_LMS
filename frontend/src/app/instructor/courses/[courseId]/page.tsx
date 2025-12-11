'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { djangoApi } from '@/lib/django-api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Users,
  FileQuestion,
  ArrowLeft,
  Play,
  Clock,
  CheckCircle
} from 'lucide-react'

interface Lesson {
  id: number
  title: string
  description: string
  order: number
  video_url?: string
  duration?: number
}

interface Quiz {
  id: number
  title: string
  description: string
  passing_score: number
  time_limit?: number
  max_attempts: number
  is_active: boolean
  question_count: number
  created_at: string
}

interface Course {
  id: number
  title: string
  description: string
  status: string
  thumbnail?: string
  enrolled_count: number
  lesson_count: number
}

export default function InstructorCoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      setLoading(true)

      // Fetch course details
      const courseData = await djangoApi.get<Course>(`/api/courses/${courseId}/`)
      setCourse(courseData)

      // Fetch lessons
      const lessonsData = await djangoApi.get<any>(`/api/lessons/?course_id=${courseId}`)
      setLessons(lessonsData.results || lessonsData || [])

      // Fetch quizzes
      const quizzesData = await djangoApi.get<any>(`/api/quizzes/`, { course: courseId })
      setQuizzes(quizzesData.results || quizzesData || [])
    } catch (error: any) {
      console.error('Error fetching course data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return

    try {
      await djangoApi.delete(`/api/quizzes/${quizId}/`)
      setQuizzes(quizzes.filter(q => q.id !== quizId))
    } catch (error: any) {
      alert(error?.message || 'Failed to delete quiz')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Course not found</p>
          <Button onClick={() => router.push('/instructor')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/instructor')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4">{course.description}</p>
              <div className="flex items-center gap-4">
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.enrolled_count} students
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {lessons.length} lessons
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileQuestion className="h-4 w-4" />
                  {quizzes.length} quizzes
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/instructor/create-course?edit=${courseId}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Course
              </Button>
              <Button
                onClick={() => router.push(`/instructor/courses/${courseId}/students`)}
              >
                <Users className="h-4 w-4 mr-2" />
                View Students
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Course Lessons</h2>
              <Button onClick={() => router.push(`/instructor/lessons/create?courseId=${courseId}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </div>

            {lessons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No lessons yet</p>
                  <Button onClick={() => router.push(`/instructor/create-course?edit=${courseId}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Lesson
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <Card key={lesson.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{lesson.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {lesson.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {lesson.video_url && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Play className="h-3 w-3" />
                                  Video
                                </span>
                              )}
                              {lesson.duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/instructor/quiz/create?courseId=${courseId}&lessonId=${lesson.id}`)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Quiz
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Course Quizzes</h2>
              <Button onClick={() => router.push(`/instructor/quiz/create?courseId=${courseId}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Quiz
              </Button>
            </div>

            {quizzes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No quizzes yet</p>
                  <Button onClick={() => router.push(`/instructor/quiz/create?courseId=${courseId}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Quiz
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{quiz.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {quiz.description}
                          </CardDescription>
                        </div>
                        <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                          {quiz.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <FileQuestion className="h-4 w-4 text-muted-foreground" />
                            <span>{quiz.question_count} questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span>{quiz.passing_score}% to pass</span>
                          </div>
                          {quiz.time_limit && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{quiz.time_limit} min</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Max {quiz.max_attempts} attempts</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => router.push(`/instructor/quiz/${quiz.id}`)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => router.push(`/instructor/quiz/${quiz.id}/results`)}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Results
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
