'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
  Edit
} from 'lucide-react'

export interface CourseData {
  id: number
  title: string
  description: string
  status: 'draft' | 'published' | 'archived'
  thumbnail?: string
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
  onPublish: () => Promise<void>
  onUnpublish: () => Promise<void>
  isPublishing?: boolean
}

/**
 * OverviewTab component displays course summary information including:
 * - Quick stats (chapters, lessons, duration)
 * - Course details (title, description, status)
 * - Publish/unpublish actions
 * 
 * Requirements: 2.1, 2.2
 */
export function OverviewTab({ course, onPublish, onUnpublish, isPublishing = false }: OverviewTabProps) {
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

  return (
    <div className="space-y-6">
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
