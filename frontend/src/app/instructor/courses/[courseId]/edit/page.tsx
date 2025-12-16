'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { djangoApi } from '@/lib/django-api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OverviewTab, CurriculumTab, QuizzesTab, SettingsTab, AnalyticsTab, CourseData, SaveStatusIndicator, PublishValidationDialog } from '@/components/course-editor'
import { useAutoSave, SaveStatus } from '@/hooks/useAutoSave'
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

/** Editable course fields for auto-save */
interface EditableCourseData {
  title: string
  description: string
}

export default function CourseEditorPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Editable course data for auto-save
  const [editableData, setEditableData] = useState<EditableCourseData>({
    title: '',
    description: '',
  })

  /**
   * Save course data to the backend
   * Requirements: 11.1
   */
  const saveCourseData = useCallback(async (data: EditableCourseData) => {
    await djangoApi.patch(`/api/courses/${courseId}/`, data)
  }, [courseId])

  /**
   * Auto-save hook with 3-second debounce
   * Requirements: 11.1, 11.2, 11.3
   */
  const {
    status: saveStatus,
    lastSaved,
    error: saveError,
    saveNow,
    markChanged,
  } = useAutoSave({
    data: editableData,
    onSave: saveCourseData,
    delay: 3000,
    enabled: !!course && !loading,
    onError: (err) => {
      console.error('Auto-save error:', err)
    },
  })

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
      const normalizedCourse = {
        ...courseData,
        chapter_count: courseData.chapter_count ?? 0,
        total_duration: courseData.total_duration ?? '0m',
        enrolled_count: courseData.enrolled_count ?? 0,
        lesson_count: courseData.lesson_count ?? 0,
      }
      setCourse(normalizedCourse)
      
      // Initialize editable data from course
      setEditableData({
        title: normalizedCourse.title,
        description: normalizedCourse.description,
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

  /**
   * Update editable data (triggers auto-save)
   * Requirements: 11.1
   */
  const updateEditableData = useCallback((updates: Partial<EditableCourseData>) => {
    setEditableData(prev => ({ ...prev, ...updates }))
    // Also update the course state for immediate UI feedback
    setCourse(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  /**
   * Update course data (for fields not in auto-save)
   * Requirements: 11.1
   */
  const updateCourseData = useCallback(async (updates: Partial<CourseData>) => {
    try {
      // Check if we have file uploads
      const hasFiles = Object.values(updates).some(value => value instanceof File)
      
      if (hasFiles) {
        // Use FormData for file uploads
        const formData = new FormData()
        Object.entries(updates).forEach(([key, value]) => {
          if (value instanceof File) {
            formData.append(key, value)
          } else if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        })
        
        // Use fetch directly for FormData uploads
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/courses/${courseId}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      } else {
        // Use regular JSON for non-file updates
        await djangoApi.patch(`/api/courses/${courseId}/`, updates)
      }
      
      // Refresh course data to get updated URLs
      await fetchCourseData()
    } catch (error: any) {
      console.error('Error updating course:', error)
      throw error
    }
  }, [courseId])

  const [isPublishing, setIsPublishing] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  /**
   * Show publish validation dialog
   * Requirements: 11.5
   */
  const handlePublishClick = async () => {
    if (!course) return
    
    // Save any pending changes first
    await saveNow()
    setShowPublishDialog(true)
  }

  /**
   * Perform the actual publish after validation
   * Requirements: 11.5
   */
  const handlePublish = async () => {
    if (!course) return
    
    try {
      setIsPublishing(true)
      await djangoApi.post(`/api/courses/${courseId}/publish/`)
      await fetchCourseData()
    } catch (error: any) {
      console.error('Error publishing course:', error)
      throw error // Re-throw to let dialog handle it
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!course) return
    
    try {
      setIsPublishing(true)
      await djangoApi.post(`/api/courses/${courseId}/unpublish/`)
      await fetchCourseData()
    } catch (error: any) {
      console.error('Error unpublishing course:', error)
    } finally {
      setIsPublishing(false)
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
                  <SaveStatusIndicator
                    status={saveStatus}
                    lastSaved={lastSaved}
                    error={saveError}
                    showTimestamp={false}
                  />
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
                onClick={course.status === 'published' ? handleUnpublish : handlePublishClick}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing...' : course.status === 'published' ? 'Unpublish' : 'Publish'}
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
              onPublish={handlePublishClick}
              onUnpublish={handleUnpublish}
              onUpdateCourse={updateCourseData}
              isPublishing={isPublishing}
            />
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-6">
            <CurriculumTab courseId={courseId} />
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <QuizzesTab courseId={courseId} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <SettingsTab courseId={courseId} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab courseId={courseId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Publish Validation Dialog - Requirements: 11.5 */}
      <PublishValidationDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        courseId={courseId}
        courseTitle={course.title}
        onPublish={handlePublish}
      />
    </div>
  )
}
