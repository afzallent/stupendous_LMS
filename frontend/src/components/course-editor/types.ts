/**
 * Type definitions for Course Editor components
 * Based on design.md data models
 */

export interface Chapter {
  id: number
  course_id: number
  title: string
  description: string
  order: number
  is_locked: boolean
  prerequisite_chapter_id: number | null
  prerequisite_chapter_title?: string | null
  prerequisite_chapter?: Chapter | null
  created_at: string
  updated_at: string
  // Computed fields
  lesson_count?: number
  total_duration?: string
  has_quiz?: boolean
  is_unlocked?: boolean
}

export interface Lesson {
  id: number
  course: number
  chapter: number | null  // This matches the API field name
  chapter_title?: string
  title: string
  content_type?: 'video' | 'markdown' | 'h5p' | 'html_embed' | 'scorm'
  order: number
  // Video fields
  video_url: string | null
  video_file?: string | null
  thumbnail_url: string | null
  duration: string | null
  is_embeddable: boolean
  // Content field (for markdown, html)
  content: string
  created_at?: string
  updated_at?: string
  
  // Computed/legacy fields for backward compatibility
  course_id?: number
  chapter_id?: number | null
}

export interface Quiz {
  id: number
  course_id: number
  chapter_id: number | null
  lesson_id: number | null
  title: string
  description: string
  passing_score: number
  time_limit: number | null
  max_attempts: number
  is_active: boolean
  question_count?: number
}

export interface ChapterInput {
  course: number
  title: string
  description?: string
  order?: number
  is_locked?: boolean
  prerequisite_chapter?: number | null
}

export interface LessonInput {
  course: number
  chapter?: number | null
  title: string
  content_type: 'video' | 'markdown' | 'h5p' | 'html_embed' | 'scorm'
  order?: number
  video_url?: string | null
  content?: string
}

export interface CurriculumSummary {
  chapterCount: number
  lessonCount: number
  totalDuration: string
  unassignedCount: number
}

/**
 * Get content type icon name for a lesson
 */
export function getContentTypeIcon(contentType: Lesson['content_type']): string {
  switch (contentType) {
    case 'video':
      return 'video'
    case 'markdown':
      return 'file-text'
    case 'h5p':
      return 'gamepad-2'
    case 'html_embed':
      return 'globe'
    case 'scorm':
      return 'package'
    default:
      return 'file'
  }
}

/**
 * Get content type display label
 */
export function getContentTypeLabel(contentType: Lesson['content_type']): string {
  switch (contentType) {
    case 'video':
      return 'Video'
    case 'markdown':
      return 'Markdown'
    case 'h5p':
      return 'H5P Interactive'
    case 'html_embed':
      return 'HTML Embed'
    case 'scorm':
      return 'SCORM'
    default:
      return 'Unknown'
  }
}
