'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  FileQuestion,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle,
  Clock,
  Target,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { djangoApi } from '@/lib/django-api-client'
import { Chapter, Quiz } from './types'
import { QuizDialog } from './QuizDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface QuizzesTabProps {
  courseId: string
}

/**
 * QuizzesTab component manages quizzes for a course
 * Lists quizzes organized by chapter with Add Quiz button per chapter
 * 
 * Requirements: 5.1, 5.3
 */
export function QuizzesTab({ courseId }: QuizzesTabProps) {
  // State
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())

  // Dialog state
  const [quizDialogOpen, setQuizDialogOpen] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingQuiz, setDeletingQuiz] = useState<Quiz | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [chaptersData, quizzesData] = await Promise.all([
        djangoApi.get<Chapter[]>('/api/chapters/', { course_id: courseId }),
        djangoApi.get<Quiz[]>('/api/quizzes/', { course_id: courseId }),
      ])

      // Validate that we received arrays
      const validChapters = Array.isArray(chaptersData) ? chaptersData : []
      const validQuizzes = Array.isArray(quizzesData) ? quizzesData : []

      setChapters(validChapters)
      setQuizzes(validQuizzes)
      
      // Expand all chapters by default
      setExpandedChapters(new Set(validChapters.map((c) => c.id)))
    } catch (err: any) {
      console.error('Error fetching quiz data:', err)
      setError(err.message || 'Failed to load quizzes')
      // Set empty arrays on error
      setChapters([])
      setQuizzes([])
      setExpandedChapters(new Set())
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get quizzes for a specific chapter
  const getQuizzesForChapter = (chapterId: number) => {
    // Note: Quiz model has lesson_id, not chapter_id directly
    // We need to filter by lessons in the chapter or by course-level quizzes
    return quizzes.filter((q) => q.chapter_id === chapterId)
  }

  // Get course-level quizzes (not assigned to any chapter)
  const getCourseQuizzes = () => {
    return quizzes.filter((q) => q.chapter_id === null && q.lesson_id === null)
  }

  // Toggle chapter expansion
  const toggleChapter = (chapterId: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(chapterId)) {
        next.delete(chapterId)
      } else {
        next.add(chapterId)
      }
      return next
    })
  }

  // Quiz CRUD operations - Requirements: 5.2
  const handleCreateQuiz = async (data: Partial<Quiz>) => {
    setIsSaving(true)
    try {
      await djangoApi.post('/api/quizzes/', {
        ...data,
        course: parseInt(courseId),
        chapter_id: selectedChapterId,
      })
      await fetchData()
      setQuizDialogOpen(false)
    } catch (err: any) {
      console.error('Error creating quiz:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateQuiz = async (data: Partial<Quiz>) => {
    if (!editingQuiz) return
    
    setIsSaving(true)
    try {
      await djangoApi.patch(`/api/quizzes/${editingQuiz.id}/`, data)
      await fetchData()
      setQuizDialogOpen(false)
      setEditingQuiz(null)
    } catch (err: any) {
      console.error('Error updating quiz:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuiz = async () => {
    if (!deletingQuiz) return
    
    setIsSaving(true)
    try {
      await djangoApi.delete(`/api/quizzes/${deletingQuiz.id}/`)
      await fetchData()
      setDeleteDialogOpen(false)
      setDeletingQuiz(null)
    } catch (err: any) {
      console.error('Error deleting quiz:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Open dialogs
  const openAddQuizDialog = (chapterId: number | null = null) => {
    setEditingQuiz(null)
    setSelectedChapterId(chapterId)
    setQuizDialogOpen(true)
  }

  const openEditQuizDialog = (quiz: Quiz) => {
    setEditingQuiz(quiz)
    setSelectedChapterId(quiz.chapter_id)
    setQuizDialogOpen(true)
  }

  const openDeleteQuizDialog = (quiz: Quiz) => {
    setDeletingQuiz(quiz)
    setDeleteDialogOpen(true)
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <Button onClick={fetchData} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const courseQuizzes = getCourseQuizzes()

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{quizzes.length} Quizzes</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {quizzes.filter(q => q.is_active).length} Active
                </span>
              </div>
            </div>
            <Button onClick={() => openAddQuizDialog(null)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Quiz
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Chapters with Quizzes - Requirements: 5.1, 5.3 */}
      {chapters.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No chapters yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create chapters in the Curriculum tab first, then add quizzes to them.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {chapters.map((chapter) => {
            const chapterQuizzes = getQuizzesForChapter(chapter.id)
            const isExpanded = expandedChapters.has(chapter.id)

            return (
              <Card key={chapter.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleChapter(chapter.id)}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {/* Expand/Collapse Toggle */}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      {/* Chapter Title */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{chapter.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {chapterQuizzes.length} {chapterQuizzes.length === 1 ? 'quiz' : 'quizzes'}
                        </p>
                      </div>

                      {/* Add Quiz Button - Requirements: 5.1 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openAddQuizDialog(chapter.id)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Quiz
                      </Button>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-3 px-4">
                      {chapterQuizzes.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2 pl-8">
                          No quizzes in this chapter yet.
                        </p>
                      ) : (
                        <div className="space-y-2 pl-8">
                          {chapterQuizzes.map((quiz) => (
                            <QuizItem
                              key={quiz.id}
                              quiz={quiz}
                              courseId={courseId}
                              onEdit={() => openEditQuizDialog(quiz)}
                              onDelete={() => openDeleteQuizDialog(quiz)}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      )}

      {/* Course-level Quizzes (not assigned to chapters) */}
      {courseQuizzes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course-Level Quizzes</CardTitle>
            <CardDescription>Quizzes not assigned to any chapter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {courseQuizzes.map((quiz) => (
                <QuizItem
                  key={quiz.id}
                  quiz={quiz}
                  courseId={courseId}
                  onEdit={() => openEditQuizDialog(quiz)}
                  onDelete={() => openDeleteQuizDialog(quiz)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Dialog - Requirements: 5.2 */}
      <QuizDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        quiz={editingQuiz}
        courseId={parseInt(courseId)}
        chapterId={selectedChapterId}
        onSave={editingQuiz ? handleUpdateQuiz : handleCreateQuiz}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Quiz"
        description={`Are you sure you want to delete "${deletingQuiz?.title}"? This will also delete all questions and student attempts. This action cannot be undone.`}
        onConfirm={handleDeleteQuiz}
        isLoading={isSaving}
      />
    </div>
  )
}

/**
 * QuizItem component displays a single quiz with actions
 * Requirements: 5.3, 5.4
 */
interface QuizItemProps {
  quiz: Quiz
  courseId: string
  onEdit: () => void
  onDelete: () => void
}

function QuizItem({ quiz, courseId, onEdit, onDelete }: QuizItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {/* Quiz Icon - Requirements: 5.3 */}
      <div className="flex-shrink-0">
        <FileQuestion className="h-5 w-5 text-primary" />
      </div>

      {/* Quiz Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{quiz.title}</span>
          <Badge variant={quiz.is_active ? 'default' : 'secondary'} className="text-xs">
            {quiz.is_active ? 'Active' : 'Draft'}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {quiz.passing_score}% to pass
          </span>
          {quiz.time_limit && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {quiz.time_limit} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            {quiz.max_attempts} attempts
          </span>
          {quiz.question_count !== undefined && (
            <span>{quiz.question_count} questions</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Edit Questions Link - Requirements: 5.4 */}
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <a href={`/instructor/courses/${courseId}/quizzes/${quiz.id}`}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Questions
          </a>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Quiz
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Quiz
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default QuizzesTab
