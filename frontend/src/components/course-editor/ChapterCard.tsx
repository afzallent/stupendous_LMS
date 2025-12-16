'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  Lock,
  Clock,
  BookOpen,
  FileQuestion,
} from 'lucide-react'
import { Chapter, Lesson } from './types'
import { LessonItem } from './LessonItem'

interface ChapterCardProps {
  chapter: Chapter
  lessons: Lesson[]
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddLesson: () => void
  onAddQuiz?: () => void
  onEditLesson?: (lesson: Lesson) => void
  onDeleteLesson?: (lesson: Lesson) => void
  isDragging?: boolean
}

/**
 * ChapterCard component displays a chapter with its lessons
 * Supports drag-and-drop reordering and expand/collapse
 * 
 * Requirements: 3.5, 6.3, 8.1, 8.4, 8.5
 */
export function ChapterCard({
  chapter,
  lessons,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  onAddQuiz,
  onEditLesson,
  onDeleteLesson,
  isDragging = false,
}: ChapterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const lessonCount = lessons.length
  const totalDuration = calculateTotalDuration(lessons)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50 shadow-lg' : ''} transition-all`}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

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

            {/* Lock Icon - Requirements: 6.3 */}
            {chapter.is_locked && (
              <Lock className="h-4 w-4 text-amber-500" />
            )}

            {/* Chapter Title */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{chapter.title}</h3>
              {!isExpanded && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
                  </span>
                  {totalDuration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {totalDuration}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Chapter Metadata - Requirements: 3.5 */}
            {isExpanded && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {lessonCount}
                </Badge>
                {totalDuration && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {totalDuration}
                  </Badge>
                )}
              </div>
            )}

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddLesson}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lesson
                </DropdownMenuItem>
                {onAddQuiz && (
                  <DropdownMenuItem onClick={onAddQuiz}>
                    <FileQuestion className="h-4 w-4 mr-2" />
                    Add Quiz
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Chapter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Chapter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Expanded Content - Requirements: 8.5 */}
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4">
            {chapter.description && (
              <p className="text-sm text-muted-foreground mb-3 pl-10">
                {chapter.description}
              </p>
            )}

            {/* Lessons List */}
            <div className="space-y-1 pl-10">
              {lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No lessons in this chapter yet.
                </p>
              ) : (
                lessons.map((lesson) => (
                  <LessonItem
                    key={lesson.id}
                    lesson={lesson}
                    onEdit={() => onEditLesson?.(lesson)}
                    onDelete={() => onDeleteLesson?.(lesson)}
                  />
                ))
              )}
            </div>

            {/* Add Lesson Button */}
            <div className="pl-10 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddLesson}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Lesson
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

/**
 * Calculate total duration from lessons
 */
function calculateTotalDuration(lessons: Lesson[]): string | null {
  let totalMinutes = 0

  for (const lesson of lessons) {
    if (lesson.duration) {
      const parts = lesson.duration.split(':')
      try {
        if (parts.length === 2) {
          // MM:SS format
          totalMinutes += parseInt(parts[0]) + parseInt(parts[1]) / 60
        } else if (parts.length === 3) {
          // HH:MM:SS format
          totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1]) + parseInt(parts[2]) / 60
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }

  if (totalMinutes === 0) return null

  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.round(totalMinutes % 60)

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

export default ChapterCard
