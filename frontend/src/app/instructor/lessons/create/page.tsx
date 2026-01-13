'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { djangoApi } from '@/lib/django-api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface Course {
  id: number
  title: string
}

interface LessonData {
  title: string
  description: string
  content_type: 'video' | 'text' | 'url'
  video_url?: string
  content?: string
  order: number
}

function CreateLessonContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId')
  const { toast } = useToast()

  const [course, setCourse] = useState<Course | null>(null)
  const [lessonData, setLessonData] = useState<LessonData>({
    title: '',
    description: '',
    content_type: 'video',
    video_url: '',
    content: '',
    order: 1
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      const courseData = await djangoApi.get<Course>(`/api/courses/${courseId}/`)
      setCourse(courseData)
      
      // Get the next order number for the lesson
      const lessonsData = await djangoApi.get<any>(`/api/lessons/?course_id=${courseId}`)
      const lessons = lessonsData.results || lessonsData || []
      const nextOrder = lessons.length + 1
      
      setLessonData(prev => ({ ...prev, order: nextOrder }))
    } catch (error: any) {
      console.error('Error fetching course data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load course data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!lessonData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a lesson title',
        variant: 'destructive'
      })
      return
    }

    if (lessonData.content_type === 'video' && !lessonData.video_url?.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a video URL',
        variant: 'destructive'
      })
      return
    }

    if (lessonData.content_type === 'text' && !lessonData.content?.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter lesson content',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        course: parseInt(courseId!),
        title: lessonData.title,
        description: lessonData.description,
        content_type: lessonData.content_type,
        video_url: lessonData.content_type === 'video' ? lessonData.video_url : null,
        content: lessonData.content_type === 'text' ? lessonData.content : null,
        order: lessonData.order
      }

      await djangoApi.post('/api/lessons/', payload)

      toast({
        title: 'Success!',
        description: `Lesson "${lessonData.title}" created successfully`,
      })

      // Redirect back to course
      router.push(`/instructor/courses/${courseId}`)
    } catch (error: any) {
      console.error('Lesson creation error:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create lesson',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center">Course not found</div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Lesson</h1>
            <p className="text-muted-foreground">to {course.title}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Lesson Title</Label>
            <Input
              id="title"
              value={lessonData.title}
              onChange={(e) => setLessonData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter lesson title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={lessonData.description}
              onChange={(e) => setLessonData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this lesson covers"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="contentType">Content Type</Label>
            <Select 
              value={lessonData.content_type} 
              onValueChange={(value: 'video' | 'text' | 'url') => 
                setLessonData(prev => ({ ...prev, content_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="text">Text Content</SelectItem>
                <SelectItem value="url">External URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {lessonData.content_type === 'video' && (
            <div>
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                value={lessonData.video_url}
                onChange={(e) => setLessonData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supports YouTube, Vimeo, and direct video URLs
              </p>
            </div>
          )}

          {lessonData.content_type === 'text' && (
            <div>
              <Label htmlFor="content">Lesson Content</Label>
              <Textarea
                id="content"
                value={lessonData.content}
                onChange={(e) => setLessonData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the lesson content..."
                rows={8}
              />
            </div>
          )}

          {lessonData.content_type === 'url' && (
            <div>
              <Label htmlFor="videoUrl">External URL</Label>
              <Input
                id="videoUrl"
                value={lessonData.video_url}
                onChange={(e) => setLessonData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://example.com/resource"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Link to external resources, documents, or websites
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="order">Lesson Order</Label>
            <Input
              id="order"
              type="number"
              value={lessonData.order}
              onChange={(e) => setLessonData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
              min={1}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Order in which this lesson appears in the course
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CreateLessonPage() {
  return (
    <Suspense fallback={<div className="container max-w-4xl py-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CreateLessonContent />
    </Suspense>
  )
}