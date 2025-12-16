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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Video, FileText, Gamepad2, Globe, Package } from 'lucide-react'
import { Lesson, LessonInput, getContentTypeLabel } from './types'
import { VideoEditor, VideoContent } from './VideoEditor'
import { MarkdownEditor } from './MarkdownEditor'
import { H5PEditor, H5PContent, H5PPackage } from './H5PEditor'
import { HTMLEmbedEditor, HTMLEmbedContent } from './HTMLEmbedEditor'
import { ValidatedInput, ValidatedTextarea } from './ValidatedInput'
import { validateLesson, getFieldError, ValidationError } from '@/lib/course-validation'

interface LessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson?: Lesson | null
  courseId: number
  chapterId: number | null
  onSave: (data: LessonInput) => Promise<void>
  isLoading?: boolean
  existingH5PPackages?: H5PPackage[]
  useAdvancedEditors?: boolean
}

const CONTENT_TYPES = [
  { value: 'video', label: 'Video', icon: Video, description: 'YouTube or uploaded video' },
  { value: 'markdown', label: 'Markdown', icon: FileText, description: 'Rich text content' },
  { value: 'h5p', label: 'H5P Interactive', icon: Gamepad2, description: 'Interactive content' },
  { value: 'html_embed', label: 'HTML Embed', icon: Globe, description: 'Custom HTML/CSS/JS' },
  { value: 'scorm', label: 'SCORM', icon: Package, description: 'SCORM package' },
] as const

type ContentType = typeof CONTENT_TYPES[number]['value']

/**
 * LessonDialog component for creating and editing lessons
 * Supports multiple content types with type-specific fields
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function LessonDialog({
  open,
  onOpenChange,
  lesson,
  courseId,
  chapterId,
  onSave,
  isLoading = false,
  existingH5PPackages = [],
  useAdvancedEditors = true,
}: LessonDialogProps) {
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<ContentType>('video')
  const [videoUrl, setVideoUrl] = useState('')
  const [content, setContent] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  
  // Advanced editor states
  const [videoContent, setVideoContent] = useState<VideoContent>({
    url: '',
    thumbnail_url: null,
    duration: null,
    is_embeddable: true,
  })
  const [h5pContent, setH5pContent] = useState<H5PContent>({
    package_id: null,
    package_file: null,
  })
  const [htmlEmbedContent, setHtmlEmbedContent] = useState<HTMLEmbedContent>({
    html: '',
    css: '',
    js: '',
  })

  const isEditing = !!lesson

  // Reset form when dialog opens/closes or lesson changes
  useEffect(() => {
    if (open) {
      if (lesson) {
        setTitle(lesson.title)
        setContentType(lesson.content_type)
        setVideoUrl(lesson.video_url || '')
        setContent(lesson.content || '')
        setDuration(lesson.duration || '')
        
        // Set advanced editor states
        setVideoContent({
          url: lesson.video_url || '',
          thumbnail_url: lesson.thumbnail_url,
          duration: lesson.duration,
          is_embeddable: lesson.is_embeddable,
        })
        
        // Parse HTML embed content if stored as JSON
        if (lesson.content_type === 'html_embed' && lesson.content) {
          try {
            const parsed = JSON.parse(lesson.content)
            setHtmlEmbedContent({
              html: parsed.html || '',
              css: parsed.css || '',
              js: parsed.js || '',
            })
          } catch {
            setHtmlEmbedContent({ html: lesson.content, css: '', js: '' })
          }
        }
      } else {
        setTitle('')
        setContentType('video')
        setVideoUrl('')
        setContent('')
        setDuration('')
        setVideoContent({ url: '', thumbnail_url: null, duration: null, is_embeddable: true })
        setH5pContent({ package_id: null, package_file: null })
        setHtmlEmbedContent({ html: '', css: '', js: '' })
      }
      setError(null)
      setValidationErrors([])
    }
  }, [open, lesson])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors([])

    // Get the video URL based on editor mode
    const effectiveVideoUrl = useAdvancedEditors ? videoContent.url : videoUrl
    const effectiveContent = contentType === 'html_embed' && useAdvancedEditors 
      ? JSON.stringify(htmlEmbedContent) 
      : content

    // Validate fields - Requirements: 11.4
    const validation = validateLesson({
      title,
      content_type: contentType,
      video_url: effectiveVideoUrl,
      content: effectiveContent,
    })
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    try {
      let finalContent = content.trim()
      let finalVideoUrl = videoUrl.trim()
      
      // Use advanced editor values if enabled
      if (useAdvancedEditors) {
        if (contentType === 'video') {
          finalVideoUrl = videoContent.url
        } else if (contentType === 'html_embed') {
          // Store HTML embed as JSON
          finalContent = JSON.stringify(htmlEmbedContent)
        }
      }
      
      const data: LessonInput = {
        course: courseId,
        chapter: chapterId,
        title: title.trim(),
        content_type: contentType,
        video_url: contentType === 'video' ? finalVideoUrl : null,
        content: finalContent || undefined,
      }

      await onSave(data)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save lesson')
    }
  }

  const selectedContentType = CONTENT_TYPES.find(ct => ct.value === contentType)

  // Determine dialog size based on content type
  const dialogSize = useAdvancedEditors && (contentType === 'markdown' || contentType === 'html_embed')
    ? 'sm:max-w-[800px]'
    : 'sm:max-w-[600px]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogSize}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Lesson' : 'Add Lesson'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the lesson details below.'
                : 'Create a new lesson with the content type of your choice.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4 py-4 pr-4">
              {/* Title - Requirements: 11.4 */}
              <ValidatedInput
                id="title"
                label="Title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to React"
                disabled={isLoading}
                error={getFieldError(validationErrors, 'title')}
              />

              {/* Content Type Selection - Requirements: 4.1 */}
              <div className="grid gap-2">
                <Label htmlFor="content-type">Content Type *</Label>
                <Select
                  value={contentType}
                  onValueChange={(value) => setContentType(value as ContentType)}
                  disabled={isLoading || isEditing}
                >
                  <SelectTrigger id="content-type">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {selectedContentType && (
                  <p className="text-xs text-muted-foreground">
                    {selectedContentType.description}
                  </p>
                )}
              </div>

              {/* Content Type Specific Editors */}
              {useAdvancedEditors ? (
                <>
                  {/* Video Editor - Requirements: 4.2, 9.1-9.5 */}
                  {contentType === 'video' && (
                    <VideoEditor
                      value={videoContent}
                      onChange={setVideoContent}
                      disabled={isLoading}
                    />
                  )}

                  {/* Markdown Editor - Requirements: 4.3 */}
                  {contentType === 'markdown' && (
                    <MarkdownEditor
                      value={content}
                      onChange={setContent}
                      disabled={isLoading}
                    />
                  )}

                  {/* H5P Editor - Requirements: 4.4 */}
                  {contentType === 'h5p' && (
                    <H5PEditor
                      value={h5pContent}
                      onChange={setH5pContent}
                      lessonId={lesson?.id}
                      existingPackages={existingH5PPackages}
                      disabled={isLoading}
                    />
                  )}

                  {/* HTML Embed Editor - Requirements: 4.5 */}
                  {contentType === 'html_embed' && (
                    <HTMLEmbedEditor
                      value={htmlEmbedContent}
                      onChange={setHtmlEmbedContent}
                      disabled={isLoading}
                    />
                  )}

                  {/* SCORM - Basic info only */}
                  {contentType === 'scorm' && (
                    <div className="grid gap-2">
                      <Label htmlFor="content">Description (optional)</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="SCORM package description..."
                        rows={3}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">
                        SCORM packages are managed separately. Add a description for this lesson.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Fallback: Simple editors */}
                  {/* Video URL - Requirements: 4.2 */}
                  {contentType === 'video' && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="video-url">Video URL *</Label>
                        <Input
                          id="video-url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a YouTube URL or direct video link
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="duration">Duration (optional)</Label>
                        <Input
                          id="duration"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="e.g., 5:30 or 1:30:00"
                          disabled={isLoading}
                        />
                      </div>
                    </>
                  )}

                  {/* Content/Description - Requirements: 4.3, 4.5 */}
                  <div className="grid gap-2">
                    <Label htmlFor="content">
                      {contentType === 'markdown' ? 'Markdown Content' : 
                       contentType === 'html_embed' ? 'HTML Content' : 
                       'Description (optional)'}
                    </Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        contentType === 'markdown' 
                          ? '# Heading\n\nYour markdown content here...'
                          : contentType === 'html_embed'
                          ? '<div>Your HTML content here...</div>'
                          : 'Additional notes or description...'
                      }
                      rows={contentType === 'markdown' || contentType === 'html_embed' ? 8 : 3}
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default LessonDialog
