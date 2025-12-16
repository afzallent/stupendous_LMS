'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { ImageUpload } from '@/components/ui/image-upload'
import {
  BookOpen,
  Clock,
  Users,
  Layers,
  DollarSign,
  Tag,
  BarChart,
  Globe,
  Lock,
  Edit,
  Save,
  X
} from 'lucide-react'

export interface CourseData {
  id: number
  title: string
  description: string
  markdown_description?: string
  status: 'draft' | 'published' | 'archived'
  thumbnail?: string
  // NOTE: When updating we may pass a File, but the persisted value from the API is a URL string.
  hero_image?: string | File
  enrolled_count: number
  lesson_count: number
  chapter_count: number
  total_duration: string
  price: number
  is_free: boolean
  category?: {
    id: number
    name: string
  }
  level?: string
  created_at?: string
  updated_at?: string
  published_at?: string | null
}

interface OverviewTabProps {
  course: CourseData
  onPublish: () => void
  onUnpublish: () => Promise<void>
  onUpdateCourse: (data: Partial<CourseData>) => Promise<void>
  isPublishing?: boolean
}

/**
 * OverviewTab component displays course summary information including:
 * - Hero image upload and editing
 * - Markdown description editor with preview
 * - Quick stats (chapters, lessons, duration)
 * - Course details (title, description, status)
 * - Publish/unpublish actions
 * 
 * Requirements: 2.1, 2.2
 */
export function OverviewTab({ course, onPublish, onUnpublish, onUpdateCourse, isPublishing = false }: OverviewTabProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingHero, setIsEditingHero] = useState(false)
  const [markdownDescription, setMarkdownDescription] = useState(course.markdown_description || '')
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'default'
      case 'draft':
        return 'secondary'
      case 'archived':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleSaveDescription = async () => {
    setIsSaving(true)
    try {
      await onUpdateCourse({ markdown_description: markdownDescription })
      setIsEditingDescription(false)
    } catch (error) {
      console.error('Failed to save description:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveHeroImage = async () => {
    if (!heroImageFile) return
    
    setIsSaving(true)
    try {
      // Pass the File to the parent. The parent already detects File values and
      // switches to multipart/form-data upload.
      await onUpdateCourse({ hero_image: heroImageFile })
      setIsEditingHero(false)
      setHeroImageFile(null)
    } catch (error) {
      console.error('Failed to save hero image:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveHeroImage = async () => {
    setIsSaving(true)
    try {
      await onUpdateCourse({ hero_image: '' })
      setHeroImageFile(null)
    } catch (error) {
      console.error('Failed to remove hero image:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Image Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Hero Image</CardTitle>
              <CardDescription>
                Upload a banner image that will be displayed at the top of your course overview
              </CardDescription>
            </div>
            {!isEditingHero && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingHero(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingHero ? (
            <div className="space-y-4">
              <ImageUpload
                value={
                  heroImageFile
                    ? URL.createObjectURL(heroImageFile)
                    : typeof course.hero_image === 'string'
                      ? course.hero_image
                      : undefined
                }
                onChange={setHeroImageFile}
                onRemove={handleRemoveHeroImage}
                placeholder="Upload hero image (recommended: 1200x400px)"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveHeroImage}
                  disabled={isSaving || !heroImageFile}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingHero(false)
                    setHeroImageFile(null)
                  }}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {typeof course.hero_image === 'string' && course.hero_image ? (
                <img
                  src={course.hero_image}
                  alt="Course hero"
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No hero image uploaded</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Description Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Course Description</CardTitle>
              <CardDescription>
                Write a detailed description of your course using Markdown formatting
              </CardDescription>
            </div>
            {!isEditingDescription && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingDescription(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingDescription ? (
            <div className="space-y-4">
              <MarkdownEditor
                value={markdownDescription}
                onChange={setMarkdownDescription}
                placeholder="Write your course description in Markdown..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveDescription}
                  disabled={isSaving}
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingDescription(false)
                    setMarkdownDescription(course.markdown_description || '')
                  }}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {course.markdown_description ? (
                <div className="prose prose-sm max-w-none">
                  {/* Simple markdown rendering - in production you'd use a proper markdown parser */}
                  <div dangerouslySetInnerHTML={{ 
                    __html: course.markdown_description
                      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/`(.*?)`/g, '<code>$1</code>')
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/\n/g, '<br>')
                      .replace(/^(.+)$/gm, '<p>$1</p>')
                      .replace(/<p><\/p>/g, '')
                      .replace(/<p><h([1-6])>/g, '<h$1>')
                      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
                  }} />
                </div>
              ) : (
                <p className="text-muted-foreground italic">No detailed description provided</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Chapters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{course.chapter_count}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{course.lesson_count}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{course.total_duration || '0h'}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Enrolled Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{course.enrolled_count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Status and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Course Status
                <Badge variant={getStatusColor(course.status)}>
                  {course.status === 'published' && <Globe className="h-3 w-3 mr-1" />}
                  {course.status === 'draft' && <Lock className="h-3 w-3 mr-1" />}
                  {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                </Badge>
              </CardTitle>
              <CardDescription>
                {course.status === 'published' 
                  ? 'Your course is live and visible to students'
                  : course.status === 'draft'
                  ? 'Your course is not visible to students yet'
                  : 'Your course has been archived'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {course.status === 'published' ? (
                <Button 
                  variant="outline" 
                  onClick={onUnpublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Updating...' : 'Unpublish'}
                </Button>
              ) : (
                <Button 
                  onClick={onPublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Publishing...' : 'Publish Course'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(course.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">{formatDate(course.updated_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Published</p>
              <p className="font-medium">{formatDate(course.published_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Visibility</p>
              <p className="font-medium">
                {course.status === 'published' ? 'Public' : 'Private'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Details */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Basic information about your course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <p className="mt-1 text-lg font-medium">{course.title}</p>
          </div>
          
          <Separator />
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {course.description || 'No description provided'}
            </p>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Category
              </label>
              <p className="mt-1">{course.category?.name || 'Uncategorized'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <BarChart className="h-3 w-3" />
                Level
              </label>
              <p className="mt-1">{course.level || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Price
              </label>
              <p className="mt-1">
                {course.is_free ? (
                  <Badge variant="secondary">Free</Badge>
                ) : (
                  `$${course.price.toFixed(2)}`
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                Enrollments
              </label>
              <p className="mt-1">{course.enrolled_count} students</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OverviewTab
