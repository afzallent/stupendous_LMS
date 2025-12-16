'use client'

import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
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
import { Chapter, Lesson, Quiz } from './types'
import { LessonItem } from './LessonItem'

interface ChapterCardProps {
  chapter: Chapter
  lessons: Lesson[]
  quizzes?: Quiz[]
  courseId?: string
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onAddLesson: () => void
  onAddQuiz?: () => void
  onEditLesson?: (lesson: Lesson) => void
  onDeleteLesson?: (lesson: Lesson) => void
  isDragging?: boolean
  enableLessonDrag?: boolean
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
  quizzes = [],
  courseId,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  onAddQuiz,
  onEditLesson,
  onDeleteLesson,
  isDragging = false,
  enableLessonDrag = false,
}: ChapterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: chapter.id })

  // Make chapter a droppable area for lessons - Requirements: 4.6
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `chapter-drop-${chapter.id}`,
    data: {
      type: 'chapter',
      chapterId: chapter.id,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const lessonCount = lessons.length
  const totalDuration = calculateTotalDuration(lessons)
  
  // Generate lesson IDs for sortable context
  const lessonIds = lessons.map(l => `lesson-${l.id}`)

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
                  {/* Prerequisite Info - Requirements: 6.4 */}
                  {chapter.is_locked && chapter.prerequisite_chapter_title && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Lock className="h-3 w-3" />
                      Requires: {chapter.prerequisite_chapter_title}
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
            
            {/* Prerequisite Info - Requirements: 6.4 */}
            {chapter.is_locked && chapter.prerequisite_chapter_title && (
              <div className="flex items-center gap-2 text-sm text-amber-600 mb-3 pl-10 py-2 bg-amber-50 rounded-md">
                <Lock className="h-4 w-4" />
                <span>
                  Locked until <strong>{chapter.prerequisite_chapter_title}</strong> is completed
                </span>
              </div>
            )}

            {/* Lessons List with Drag-and-Drop - Requirements: 4.6 */}
            <div 
              ref={setDroppableRef}
              className={`space-y-1 pl-10 min-h-[40px] rounded-md transition-colors ${
                isOver ? 'bg-primary/10 border-2 border-dashed border-primary/30' : ''
              }`}
            >
              {lessons.length === 0 && quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {isOver ? 'Drop lesson here' : 'No lessons in this chapter yet.'}
                </p>
              ) : (
                <>
                  <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                    {lessons.map((lesson) => (
                      <LessonItem
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={() => onEditLesson?.(lesson)}
                        onDelete={() => onDeleteLesson?.(lesson)}
                        isDraggable={enableLessonDrag}
                      />
                    ))}
                  </SortableContext>
                  
                  {/* Quizzes displayed at end of chapter - Requirements: 5.3 */}
                  {quizzes.map((quiz) => (
                    <QuizItem key={quiz.id} quiz={quiz} courseId={courseId} />
                  ))}
                </>
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

/**
 * QuizItem component displays a quiz as a special item at the end of a chapter
 * Requirements: 5.3
 */
interface QuizItemProps {
  quiz: Quiz
  courseId?: string
}

function QuizItem({ quiz, courseId }: QuizItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors border-l-2 border-primary/50 ml-2">
      {/* Quiz Icon - Requirements: 5.3 */}
      <div className="flex-shrink-0">
        <FileQuestion className="h-4 w-4 text-primary" />
      </div>

      {/* Quiz Info */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{quiz.title}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{quiz.question_count || 0} questions</span>
          <span>•</span>
          <span>{quiz.passing_score}% to pass</span>
        </div>
      </div>

      {/* Link to quiz editor - Requirements: 5.4 */}
      {courseId && (
        <Button variant="ghost" size="sm" asChild>
          <a href={`/instructor/courses/${courseId}/quizzes/${quiz.id}`}>
            Edit
          </a>
        </Button>
      )}
    </div>
  )
}

export default ChapterCard
