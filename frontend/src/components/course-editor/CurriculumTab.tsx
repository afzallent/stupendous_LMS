'use client'

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, BookOpen, Clock, Layers, AlertCircle } from 'lucide-react'
import { djangoApi } from '@/lib/django-api-client'
import { Chapter, Lesson, ChapterInput, CurriculumSummary } from './types'
import { ChapterCard } from './ChapterCard'
import { ChapterDialog } from './ChapterDialog'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())
  
  // Dialog state
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingChapter, setDeletingChapter] = useState<Chapter | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

      const [chaptersData, lessonsData] = await Promise.all([
        djangoApi.get<Chapter[]>('/api/chapters/', { course_id: courseId }),
        djangoApi.get<Lesson[]>('/api/lessons/', { course_id: courseId }),
      ])

      setChapters(chaptersData)
      setLessons(lessonsData)
      
      // Expand all chapters by default
      setExpandedChapters(new Set(chaptersData.map((c) => c.id)))
    } catch (err: any) {
      console.error('Error fetching curriculum data:', err)
      setError(err.message || 'Failed to load curriculum')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate summary - Requirements: 8.3
  const summary: CurriculumSummary = {
    chapterCount: chapters.length,
    lessonCount: lessons.length,
    totalDuration: calculateTotalDuration(lessons),
    unassignedCount: lessons.filter((l) => l.chapter_id === null).length,
  }

  // Get lessons for a specific chapter
  const getLessonsForChapter = (chapterId: number) => {
    return lessons
      .filter((l) => l.chapter_id === chapterId)
      .sort((a, b) => a.order - b.order)
  }

  // Get unassigned lessons
  const unassignedLessons = lessons
    .filter((l) => l.chapter_id === null)
    .sort((a, b) => a.order - b.order)

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

  // Handle chapter drag end - Requirements: 3.2
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = chapters.findIndex((c) => c.id === active.id)
      const newIndex = chapters.findIndex((c) => c.id === over.id)

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
                  isExpanded={expandedChapters.has(chapter.id)}
                  onToggle={() => toggleChapter(chapter.id)}
                  onEdit={() => openEditChapterDialog(chapter)}
                  onDelete={() => openDeleteChapterDialog(chapter)}
                  onAddLesson={() => {
                    // TODO: Implement add lesson dialog
                    console.log('Add lesson to chapter:', chapter.id)
                  }}
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
    </div>
  )
}

/**
 * Calculate total duration from all lessons
 */
function calculateTotalDuration(lessons: Lesson[]): string {
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
