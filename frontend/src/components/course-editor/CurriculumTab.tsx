/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, BookOpen, Clock, Layers, AlertCircle } from 'lucide-react'
import { djangoApi } from '@/lib/django-api-client'
import { Chapter, Lesson, Quiz, ChapterInput, LessonInput, CurriculumSummary } from './types'
import { ChapterCard } from './ChapterCard'
import { ChapterDialog } from './ChapterDialog'
import { LessonDialog } from './LessonDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { UnassignedLessons } from './UnassignedLessons'

interface CurriculumTabProps {
  courseId: string
}

/**
 * CurriculumTab component manages the course curriculum structure
 * Displays chapters with lessons, supports drag-and-drop reordering
 * 
 * Requirements: 8.1, 8.3, 8.4, 8.5
 */
export function CurriculumTab({ courseId }: CurriculumTabProps) {
  // State
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())
  
  // Dialog state
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Lesson dialog state - Requirements: 4.1, 4.6
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [lessonChapterId, setLessonChapterId] = useState<number | null>(null)
  const [deleteLessonDialogOpen, setDeleteLessonDialogOpen] = useState(false)
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [chaptersData, lessonsData, quizzesData] = await Promise.all([
        djangoApi.get<Chapter[]>('/api/chapters/', { course_id: courseId }),
        djangoApi.get<Lesson[]>('/api/lessons/', { course_id: courseId }),
        djangoApi.get<Quiz[]>('/api/quizzes/', { course_id: courseId }),
      ])

      // Validate that we received arrays
      const validChapters = Array.isArray(chaptersData) ? chaptersData : []
      const validLessons = Array.isArray(lessonsData) ? lessonsData : []
      const validQuizzes = Array.isArray(quizzesData) ? quizzesData : []

      setChapters(validChapters)
      setLessons(validLessons)
      setQuizzes(validQuizzes)
      
      // Expand all chapters by default
      setExpandedChapters(new Set(validChapters.map((c) => c.id)))
    } catch (err: any) {
      console.error('Error fetching curriculum data:', err)
      setError(err.message || 'Failed to load curriculum')
      // Set empty arrays on error
      setChapters([])
      setLessons([])
      setQuizzes([])
      setExpandedChapters(new Set())
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Normalize lesson.chapter across API versions.
   * Backend returns `chapter` (number | null). Some older UI code used `chapter_id`.
   */
  const getLessonChapterId = useCallback((lesson: Lesson): number | null => {
    return lesson.chapter ?? lesson.chapter_id ?? null
  }, [])

  // Calculate summary - Requirements: 8.3
  const summary: CurriculumSummary = {
    chapterCount: chapters.length,
    lessonCount: lessons.length,
    totalDuration: calculateTotalDuration(lessons),
    unassignedCount: lessons.filter((l) => getLessonChapterId(l) === null).length,
  }

  // Get lessons for a specific chapter
  const getLessonsForChapter = (chapterId: number) => {
    return lessons
      .filter((l) => getLessonChapterId(l) === chapterId)
      .sort((a, b) => a.order - b.order)
  }

  // Get unassigned lessons
  const unassignedLessons = lessons
    .filter((l) => getLessonChapterId(l) === null)
    .sort((a, b) => a.order - b.order)

  // Get quizzes for a specific chapter - Requirements: 5.3
  const getQuizzesForChapter = (chapterId: number) => {
    return quizzes.filter((q) => q.chapter_id === chapterId)
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

  // Handle drag end - Requirements: 3.2, 4.6
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Check if dragging a lesson
    if (activeId.startsWith('lesson-')) {
      const lessonId = parseInt(activeId.replace('lesson-', ''))
      const lesson = lessons.find(l => l.id === lessonId)
      if (!lesson) return

      const lessonChapterId = getLessonChapterId(lesson)

      // Check if dropping on a chapter drop zone
      if (overId.startsWith('chapter-drop-')) {
        const targetChapterId = parseInt(overId.replace('chapter-drop-', ''))
        if (lessonChapterId !== targetChapterId) {
          // Move lesson to new chapter
          await handleMoveToChapter(lessonId, targetChapterId)
        }
        return
      }

      // Check if dropping on another lesson
      if (overId.startsWith('lesson-')) {
        const overLessonId = parseInt(overId.replace('lesson-', ''))
        const overLesson = lessons.find(l => l.id === overLessonId)
        if (!overLesson) return

        const overLessonChapterId = getLessonChapterId(overLesson)

        // If same chapter, reorder within chapter
        if (lessonChapterId === overLessonChapterId) {
          const chapterLessons = lessons
            .filter(l => getLessonChapterId(l) === lessonChapterId)
            .sort((a, b) => a.order - b.order)
          
          const oldIndex = chapterLessons.findIndex(l => l.id === lessonId)
          const newIndex = chapterLessons.findIndex(l => l.id === overLessonId)
          
          if (oldIndex !== newIndex) {
            const reorderedLessons = arrayMove(chapterLessons, oldIndex, newIndex)
            
            // Update local state
            const updatedLessons = lessons.map(l => {
              const reorderedIndex = reorderedLessons.findIndex(rl => rl.id === l.id)
              if (reorderedIndex !== -1) {
                return { ...l, order: reorderedIndex }
              }
              return l
            })
            setLessons(updatedLessons)

            // Persist to backend
            try {
              await djangoApi.post('/api/lessons/reorder/', {
                course_id: parseInt(courseId),
                chapter_id: lessonChapterId,
                lessons: reorderedLessons.map((l, index) => ({
                  id: l.id,
                  order: index,
                })),
              })
            } catch (err: any) {
              console.error('Error reordering lessons:', err)
              fetchData()
            }
          }
        } else {
          // Move to different chapter at specific position
          if (overLessonChapterId !== null) {
            await handleMoveToChapter(lessonId, overLessonChapterId)
          }
        }
        return
      }
    }

    // Handle chapter reordering
    if (activeId !== overId && !activeId.startsWith('lesson-')) {
      const oldIndex = chapters.findIndex((c) => c.id === active.id)
      const newIndex = chapters.findIndex((c) => c.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newChapters = arrayMove(chapters, oldIndex, newIndex)
        
        // Update local state immediately for responsiveness
        setChapters(newChapters)

        // Persist to backend
        try {
          await djangoApi.post('/api/chapters/reorder/', {
            course_id: parseInt(courseId),
            chapters: newChapters.map((c, index) => ({
              id: c.id,
              order: index,
            })),
          })
        } catch (err: any) {
          console.error('Error reordering chapters:', err)
          // Revert on error
          fetchData()
        }
      }
    }
  }

  // Chapter CRUD operations - Requirements: 3.1, 3.3, 3.4
  const handleCreateChapter = async (data: ChapterInput) => {
    setIsSaving(true)
    try {
      // Set order to be at the end
      const newOrder = chapters.length
      await djangoApi.post('/api/chapters/', {
        ...data,
        order: newOrder,
      })
      await fetchData()
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateChapter = async (data: ChapterInput) => {
    if (!editingChapter) return
    
    setIsSaving(true)
    try {
      await djangoApi.patch(`/api/chapters/${editingChapter.id}/`, data)
      await fetchData()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteChapter = async () => {
    if (!deletingChapter) return
    
    setIsSaving(true)
    try {
      await djangoApi.delete(`/api/chapters/${deletingChapter.id}/`)
      await fetchData()
      setDeleteDialogOpen(false)
      setDeletingChapter(null)
    } catch (err: any) {
      console.error('Error deleting chapter:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Move lesson to chapter - Requirements: 7.3
  const handleMoveToChapter = async (lessonId: number, chapterId: number) => {
    try {
      await djangoApi.patch(`/api/lessons/${lessonId}/`, {
        chapter: chapterId,
      })
      await fetchData()
    } catch (err: any) {
      console.error('Error moving lesson:', err)
    }
  }

  // Lesson CRUD operations - Requirements: 4.1, 4.6
  const handleCreateLesson = async (data: LessonInput) => {
    setIsSaving(true)
    try {
      // Set order to be at the end of the chapter
      const targetChapterId = data.chapter ?? null
      const chapterLessons = lessons.filter(l => getLessonChapterId(l) === targetChapterId)
      const newOrder = chapterLessons.length
      await djangoApi.post('/api/lessons/', {
        ...data,
        order: newOrder,
      })
      await fetchData()
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateLesson = async (data: LessonInput) => {
    if (!editingLesson) return
    
    setIsSaving(true)
    try {
      await djangoApi.patch(`/api/lessons/${editingLesson.id}/`, data)
      await fetchData()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!deletingLesson) return
    
    setIsSaving(true)
    try {
      await djangoApi.delete(`/api/lessons/${deletingLesson.id}/`)
      await fetchData()
      setDeleteLessonDialogOpen(false)
      setDeletingLesson(null)
    } catch (err: any) {
      console.error('Error deleting lesson:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Open dialogs
  const openAddChapterDialog = () => {
    setEditingChapter(null)
    setChapterDialogOpen(true)
  }

  const openEditChapterDialog = (chapter: Chapter) => {
    setEditingChapter(chapter)
    setChapterDialogOpen(true)
  }

  const openDeleteChapterDialog = (chapter: Chapter) => {
    setDeletingChapter(chapter)
    setDeleteDialogOpen(true)
  }

  // Lesson dialog handlers - Requirements: 4.1
  const openAddLessonDialog = (chapterId: number | null) => {
    setEditingLesson(null)
    setLessonChapterId(chapterId)
    setLessonDialogOpen(true)
  }

  const openEditLessonDialog = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setLessonChapterId(getLessonChapterId(lesson))
    setLessonDialogOpen(true)
  }

  const openDeleteLessonDialog = (lesson: Lesson) => {
    setDeletingLesson(lesson)
    setDeleteLessonDialogOpen(true)
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

  return (
    <div className="space-y-4">
      {/* Summary Bar - Requirements: 8.3 */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{summary.chapterCount} Chapters</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{summary.lessonCount} Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{summary.totalDuration}</span>
              </div>
              {summary.unassignedCount > 0 && (
                <Badge variant="secondary" className="text-amber-600">
                  {summary.unassignedCount} Unassigned
                </Badge>
              )}
            </div>
            <Button onClick={openAddChapterDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Chapter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chapters List with Drag and Drop - Requirements: 8.1 */}
      {chapters.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No chapters yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first chapter to start organizing your course content.
              </p>
              <Button onClick={openAddChapterDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Chapter
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  lessons={getLessonsForChapter(chapter.id)}
                  quizzes={getQuizzesForChapter(chapter.id)}
                  courseId={courseId}
                  isExpanded={expandedChapters.has(chapter.id)}
                  onToggle={() => toggleChapter(chapter.id)}
                  onEdit={() => openEditChapterDialog(chapter)}
                  onDelete={() => openDeleteChapterDialog(chapter)}
                  onAddLesson={() => openAddLessonDialog(chapter.id)}
                  onEditLesson={openEditLessonDialog}
                  onDeleteLesson={openDeleteLessonDialog}
                  enableLessonDrag={true}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Chapter Button (when chapters exist) */}
      {chapters.length > 0 && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={openAddChapterDialog}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Chapter
        </Button>
      )}

      {/* Unassigned Lessons Section - Requirements: 7.1, 7.5 */}
      <UnassignedLessons
        lessons={unassignedLessons}
        chapters={chapters}
        onMoveToChapter={handleMoveToChapter}
        onEditLesson={openEditLessonDialog}
        onDeleteLesson={openDeleteLessonDialog}
      />

      {/* Chapter Dialog */}
      <ChapterDialog
        open={chapterDialogOpen}
        onOpenChange={setChapterDialogOpen}
        chapter={editingChapter}
        chapters={chapters}
        courseId={parseInt(courseId)}
        onSave={editingChapter ? handleUpdateChapter : handleCreateChapter}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Dialog - Requirements: 3.4 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${deletingChapter?.title}"? Lessons in this chapter will be moved to "Unassigned".`}
        onConfirm={handleDeleteChapter}
        isLoading={isSaving}
      />

      {/* Lesson Dialog - Requirements: 4.1 */}
      <LessonDialog
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        lesson={editingLesson}
        courseId={parseInt(courseId)}
        chapterId={lessonChapterId}
        onSave={editingLesson ? handleUpdateLesson : handleCreateLesson}
        isLoading={isSaving}
      />

      {/* Delete Lesson Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteLessonDialogOpen}
        onOpenChange={setDeleteLessonDialogOpen}
        title="Delete Lesson"
        description={`Are you sure you want to delete "${deletingLesson?.title}"? This action cannot be undone.`}
        onConfirm={handleDeleteLesson}
        isLoading={isSaving}
      />
    </div>
  )
}

/**
 * Calculate total duration from all lessons
 */
function calculateTotalDuration(lessons: Lesson[]): string {
  // Validate input is an array
  if (!Array.isArray(lessons)) {
    return '0 min'
  }

  let totalMinutes = 0

  for (const lesson of lessons) {
    if (lesson.duration) {
      const parts = lesson.duration.split(':')
      try {
        if (parts.length === 2) {
          totalMinutes += parseInt(parts[0]) + parseInt(parts[1]) / 60
        } else if (parts.length === 3) {
          totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  if (totalMinutes === 0) return '0m'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

export default CurriculumTab
