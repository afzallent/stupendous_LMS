'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { djangoApi } from '@/lib/django-api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewTab, CurriculumTab, CourseData } from '@/components/course-editor'
import {
  BookOpen,
  ArrowLeft,
  Settings,
  BarChart3,
  FileQuestion,
  LayoutDashboard,
  Eye,
  Clock
} from 'lucide-react'

interface Course extends CourseData {
  created_at: string
  updated_at: string
  published_at: string | null
}

export default function CourseEditorPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  /**
   * Fetch course data from the API
   * Handles loading and error states
   * Requirements: 2.1
   */
  const fetchCourseData = async () => {
    try {
      setLoading(true)
      setError(null)
      const courseData = await djangoApi.get<Course>(`/api/courses/${courseId}/`)
      // Ensure default values for computed fields
      setCourse({
        ...courseData,
        chapter_count: courseData.chapter_count ?? 0,
        total_duration: courseData.total_duration ?? '0m',
        enrolled_count: courseData.enrolled_count ?? 0,
        lesson_count: courseData.lesson_count ?? 0,
      })
    } catch (err: any) {
      console.error('Error fetching course data:', err)
      if (err.status === 404) {
        setError('Course not found')
      } else if (err.status === 403) {
        setError('You don\'t have permission to edit this course')
      } else if (err.status === 401) {
        setError('Please log in to access this course')
        router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
        return
      } else {
        setError(err.message || 'Failed to load course data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!course) return
    
    try {
      setSaveStatus('saving')
      await djangoApi.post(`/api/courses/${courseId}/publish/`)
      await fetchCourseData()
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch (error: any) {
      console.error('Error publishing course:', error)
      setSaveStatus('unsaved')
    }
  }

  const handleUnpublish = async () => {
    if (!course) return
    
    try {
      setSaveStatus('saving')
      await djangoApi.post(`/api/courses/${courseId}/unpublish/`)
      await fetchCourseData()
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch (error: any) {
      console.error('Error unpublishing course:', error)
      setSaveStatus('unsaved')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course editor...</p>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2 font-medium">
            {error || 'Course not found'}
          </p>
          <p className="text-muted-foreground mb-4 text-sm">
            {error === 'Course not found' 
              ? 'The course you\'re looking for doesn\'t exist or has been deleted.'
              : error === 'You don\'t have permission to edit this course'
              ? 'Only the course instructor can edit this course.'
              : 'Please try again or contact support if the problem persists.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => fetchCourseData()}>
              Try Again
            </Button>
            <Button onClick={() => router.push('/instructor')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/instructor')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-semibold">{course.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                    {course.status}
                  </Badge>
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'saved' && lastSaved && (
                    <span className="text-xs text-muted-foreground">
                      All changes saved
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button 
                size="sm"
                onClick={course.status === 'published' ? handleUnpublish : handlePublish}
              >
                {course.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Curriculum</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4" />
              <span className="hidden sm:inline">Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab
              course={course}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              isPublishing={saveStatus === 'saving'}
            />
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-6">
            <CurriculumTab courseId={courseId} />
          </TabsContent>

          {/* Quizzes Tab - Placeholder */}
          <TabsContent value="quizzes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quizzes</CardTitle>
                <CardDescription>Manage quizzes for your course</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Quiz management coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This tab will allow you to create and manage chapter quizzes
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab - Placeholder */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Settings</CardTitle>
                <CardDescription>Configure course-level settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Settings coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This tab will allow you to configure progression, certificates, and more
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab - Placeholder */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Track course performance and student engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Analytics coming soon</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This tab will show enrollment stats, completion rates, and quiz scores
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
