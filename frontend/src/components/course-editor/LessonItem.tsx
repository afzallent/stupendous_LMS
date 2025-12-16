'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MoreVertical,
  Pencil,
  Trash2,
  Video,
  FileText,
  Gamepad2,
  Globe,
  Package,
  File,
  Clock,
  GripVertical,
} from 'lucide-react'
import { Lesson, getContentTypeLabel } from './types'

interface LessonItemProps {
  lesson: Lesson
  onEdit?: () => void
  onDelete?: () => void
  isDraggable?: boolean
}

/**
 * Get the appropriate icon component for a content type
 * Requirements: 4.7, 11 (Property 11: Content Type Icon Display)
 */
function getContentTypeIconComponent(contentType: Lesson['content_type']) {
  switch (contentType) {
    case 'video':
      return Video
    case 'markdown':
      return FileText
    case 'h5p':
      return Gamepad2
    case 'html_embed':
      return Globe
    case 'scorm':
      return Package
    default:
      return File
  }
}

/**
 * LessonItem component displays a single lesson within a chapter
 * Shows content type icon, title, duration, and actions
 * Supports drag-and-drop for reordering
 * 
 * Requirements: 4.7, 8.2
 */
export function LessonItem({
  lesson,
  onEdit,
  onDelete,
  isDraggable = false,
}: LessonItemProps) {
  const IconComponent = getContentTypeIconComponent(lesson.content_type)
  const contentTypeLabel = getContentTypeLabel(lesson.content_type)

  // Use sortable hook for drag-and-drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `lesson-${lesson.id}`,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          flex items-center gap-2 py-2 px-2 rounded-md
          hover:bg-muted/50 transition-colors group
          ${isDragging ? 'opacity-50 bg-muted shadow-lg z-50' : ''}
        `}
      >
        {/* Drag Handle */}
        {isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        )}

        {/* Content Type Icon - Requirements: 4.7 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-shrink-0">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{contentTypeLabel}</p>
          </TooltipContent>
        </Tooltip>

        {/* Lesson Title with Tooltip - Requirements: 8.2 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1 text-sm truncate cursor-default">
              {lesson.title}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{lesson.title}</p>
              <p className="text-xs text-muted-foreground">Type: {contentTypeLabel}</p>
              {lesson.duration && (
                <p className="text-xs text-muted-foreground">Duration: {lesson.duration}</p>
              )}
              {lesson.content && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {lesson.content.substring(0, 100)}...
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Duration */}
        {lesson.duration && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lesson.duration}
          </span>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Lesson
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Lesson
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}

export default LessonItem
