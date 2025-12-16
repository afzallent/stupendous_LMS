'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, FolderInput } from 'lucide-react'
import { Chapter, Lesson } from './types'
import { LessonItem } from './LessonItem'

interface UnassignedLessonsProps {
  lessons: Lesson[]
  chapters: Chapter[]
  onMoveToChapter: (lessonId: number, chapterId: number) => void
  onEditLesson?: (lesson: Lesson) => void
  onDeleteLesson?: (lesson: Lesson) => void
}

/**
 * UnassignedLessons component displays lessons without a chapter assignment
 * Provides dropdown to move lessons to chapters
 * 
 * Requirements: 7.1, 7.2, 7.5
 * Property 3: Unassigned Lessons Visibility - visible iff lessons with chapter_id = null exist
 */
export function UnassignedLessons({
  lessons,
  chapters,
  onMoveToChapter,
  onEditLesson,
  onDeleteLesson,
}: UnassignedLessonsProps) {
  // Requirements: 7.5 - Hide section when no unassigned lessons
  if (lessons.length === 0) {
    return null
  }

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          Unassigned Lessons ({lessons.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-4">
        <p className="text-xs text-muted-foreground mb-3">
          These lessons are not assigned to any chapter. Use the dropdown to move them.
        </p>
        
        <div className="space-y-2">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-2">
              <div className="flex-1">
                <LessonItem
                  lesson={lesson}
                  onEdit={() => onEditLesson?.(lesson)}
                  onDelete={() => onDeleteLesson?.(lesson)}
                />
              </div>
              
              {/* Move to Chapter Dropdown - Requirements: 7.2 */}
              <Select
                onValueChange={(value) => onMoveToChapter(lesson.id, parseInt(value))}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <FolderInput className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Move to..." />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id.toString()}>
                      {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default UnassignedLessons
