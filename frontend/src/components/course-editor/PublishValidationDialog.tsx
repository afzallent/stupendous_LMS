'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  BookOpen,
  Layers,
  FileQuestion,
} from 'lucide-react'
import { djangoApi } from '@/lib/django-api-client'

export interface ValidationIssue {
  type: 'error' | 'warning'
  category: 'course' | 'chapter' | 'lesson' | 'quiz'
  message: string
  field?: string
  itemId?: number
  itemTitle?: string
}

export interface PublishValidationResult {
  canPublish: boolean
  issues: ValidationIssue[]
  summary: {
    errors: number
    warnings: number
    chapters: number
    lessons: number
    quizzes: number
  }
}

interface PublishValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseTitle: string
  onPublish: () => Promise<void>
}

/**
 * PublishValidationDialog component shows a summary of validation issues
 * before publishing a course
 * 
 * Features:
 * - Validates course has required content
 * - Shows errors that block publishing
 * - Shows warnings that don't block publishing
 * - Allows publishing if no errors exist
 * 
 * Requirements: 11.5
 */
export function PublishValidationDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onPublish,
}: PublishValidationDialogProps) {
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [validation, setValidation] = useState<PublishValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Validate course when dialog opens
  useEffect(() => {
    if (open) {
      validateCourse()
    }
  }, [open, courseId])

  /**
   * Validate course for publishing
   * Requirements: 11.5
   */
  const validateCourse = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch course data with chapters, lessons, and quizzes
      const [course, chapters, lessons, quizzes] = await Promise.all([
        djangoApi.get<any>(`/api/courses/${courseId}/`),
        djangoApi.get<any[]>('/api/chapters/', { course_id: courseId }),
        djangoApi.get<any[]>('/api/lessons/', { course_id: courseId }),
        djangoApi.get<any[]>('/api/quizzes/', { course_id: courseId }),
      ])

      const issues: ValidationIssue[] = []

      // Course-level validation
      if (!course.title || course.title.trim().length < 3) {
        issues.push({
          type: 'error',
          category: 'course',
          message: 'Course title must be at least 3 characters',
          field: 'title',
        })
      }

      if (!course.description || course.description.trim().length < 10) {
        issues.push({
          type: 'error',
          category: 'course',
          message: 'Course description must be at least 10 characters',
          field: 'description',
        })
      }

      // Check for chapters
      if (chapters.length === 0) {
        issues.push({
          type: 'error',
          category: 'chapter',
          message: 'Course must have at least one chapter',
        })
      }

      // Check for lessons
      if (lessons.length === 0) {
        issues.push({
          type: 'error',
          category: 'lesson',
          message: 'Course must have at least one lesson',
        })
      }

      // Check for unassigned lessons
      const unassignedLessons = lessons.filter(l => l.chapter_id === null)
      if (unassignedLessons.length > 0) {
        issues.push({
          type: 'warning',
          category: 'lesson',
          message: `${unassignedLessons.length} lesson(s) are not assigned to any chapter`,
        })
      }

      // Check each chapter
      for (const chapter of chapters) {
        const chapterLessons = lessons.filter(l => l.chapter_id === chapter.id)
        
        if (chapterLessons.length === 0) {
          issues.push({
            type: 'warning',
            category: 'chapter',
            message: `Chapter "${chapter.title}" has no lessons`,
            itemId: chapter.id,
            itemTitle: chapter.title,
          })
        }

        // Check for locked chapters without prerequisites
        if (chapter.is_locked && !chapter.prerequisite_chapter_id) {
          issues.push({
            type: 'warning',
            category: 'chapter',
            message: `Chapter "${chapter.title}" is locked but has no prerequisite set`,
            itemId: chapter.id,
            itemTitle: chapter.title,
          })
        }
      }

      // Check each lesson
      for (const lesson of lessons) {
        if (!lesson.title || lesson.title.trim().length < 2) {
          issues.push({
            type: 'error',
            category: 'lesson',
            message: `Lesson has invalid title`,
            itemId: lesson.id,
            itemTitle: lesson.title || 'Untitled',
          })
        }

        // Video lessons need a URL
        if (lesson.content_type === 'video' && !lesson.video_url) {
          issues.push({
            type: 'error',
            category: 'lesson',
            message: `Video lesson "${lesson.title}" has no video URL`,
            itemId: lesson.id,
            itemTitle: lesson.title,
          })
        }

        // Markdown/HTML lessons need content
        if ((lesson.content_type === 'markdown' || lesson.content_type === 'html_embed') && !lesson.content) {
          issues.push({
            type: 'warning',
            category: 'lesson',
            message: `${lesson.content_type === 'markdown' ? 'Markdown' : 'HTML'} lesson "${lesson.title}" has no content`,
            itemId: lesson.id,
            itemTitle: lesson.title,
          })
        }
      }

      // Check quizzes
      for (const quiz of quizzes) {
        if (!quiz.question_count || quiz.question_count === 0) {
          issues.push({
            type: 'warning',
            category: 'quiz',
            message: `Quiz "${quiz.title}" has no questions`,
            itemId: quiz.id,
            itemTitle: quiz.title,
          })
        }
      }

      const errorCount = issues.filter(i => i.type === 'error').length
      const warningCount = issues.filter(i => i.type === 'warning').length

      setValidation({
        canPublish: errorCount === 0,
        issues,
        summary: {
          errors: errorCount,
          warnings: warningCount,
          chapters: chapters.length,
          lessons: lessons.length,
          quizzes: quizzes.length,
        },
      })
    } catch (err: any) {
      console.error('Error validating course:', err)
      setError(err.message || 'Failed to validate course')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!validation?.canPublish) return

    setPublishing(true)
    try {
      await onPublish()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to publish course')
    } finally {
      setPublishing(false)
    }
  }

  const getCategoryIcon = (category: ValidationIssue['category']) => {
    switch (category) {
      case 'chapter':
        return <Layers className="h-4 w-4" />
      case 'lesson':
        return <BookOpen className="h-4 w-4" />
      case 'quiz':
        return <FileQuestion className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publish Course</DialogTitle>
          <DialogDescription>
            Review the validation results before publishing "{courseTitle}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button onClick={validateCourse} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        ) : validation ? (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 py-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{validation.summary.chapters} chapters</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{validation.summary.lessons} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{validation.summary.quizzes} quizzes</span>
              </div>
            </div>

            <Separator />

            {/* Validation Status */}
            <div className="py-2">
              {validation.canPublish ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Ready to publish</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {validation.summary.errors} error(s) must be fixed before publishing
                  </span>
                </div>
              )}
              {validation.summary.warnings > 0 && (
                <div className="flex items-center gap-2 text-amber-600 mt-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    {validation.summary.warnings} warning(s)
                  </span>
                </div>
              )}
            </div>

            {/* Issues List */}
            {validation.issues.length > 0 && (
              <>
                <Separator />
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2 py-2">
                    {validation.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-2 p-2 rounded-md ${
                          issue.type === 'error'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {issue.type === 'error' ? (
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(issue.category)}
                            <Badge variant="outline" className="text-xs">
                              {issue.category}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {validation.issues.length === 0 && (
              <div className="py-4 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No issues found. Your course is ready to publish!</p>
              </div>
            )}
          </>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={publishing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={loading || !validation?.canPublish || publishing}
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Course'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PublishValidationDialog
