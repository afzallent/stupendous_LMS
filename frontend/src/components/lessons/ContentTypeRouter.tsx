'use client'

import { ScormPlayer } from './ScormPlayer'
import { MarkdownViewer } from './MarkdownViewer'
import { MarkdownEditor } from './MarkdownEditor'
import { H5PPlayer } from './H5PPlayer'
import { HTMLEmbedViewer } from './HTMLEmbedViewer'
import { VideoPlayer } from './VideoPlayer'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface ContentTypeRouterProps {
  contentType: 'video' | 'markdown' | 'scorm' | 'h5p' | 'html_embed'
  lessonId: string
  courseId: string
  videoUrl?: string
  title?: string
  scormPackageId?: string
  h5pPackageId?: string
  isEditor?: boolean
  initialContent?: string
  onCompletion?: (data: any) => void
}

/**
 * Content Type Router Component
 * 
 * Routes to the appropriate content viewer/editor based on lesson content type.
 * Handles all supported content types: Video, Markdown, SCORM, H5P, HTML Embed.
 * 
 * Requirements: 15.2, 15.3
 */
export function ContentTypeRouter({
  contentType,
  lessonId,
  courseId,
  videoUrl,
  title,
  scormPackageId,
  h5pPackageId,
  isEditor = false,
  initialContent,
  onCompletion
}: ContentTypeRouterProps) {
  switch (contentType) {
    case 'video':
      if (!videoUrl || !title) {
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Video URL and title are required for video content
            </AlertDescription>
          </Alert>
        )
      }
      return (
        <VideoPlayer
          videoUrl={videoUrl}
          title={title}
          lessonId={lessonId}
          courseId={courseId}
          onCompletion={onCompletion}
        />
      )

    case 'markdown':
      if (isEditor) {
        return (
          <MarkdownEditor
            lessonId={lessonId}
            courseId={courseId}
            initialContent={initialContent}
            onSave={onCompletion}
          />
        )
      }
      return (
        <MarkdownViewer
          lessonId={lessonId}
          courseId={courseId}
          onCompletion={onCompletion}
        />
      )

    case 'scorm':
      if (!scormPackageId) {
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              SCORM package ID is required for SCORM content
            </AlertDescription>
          </Alert>
        )
      }
      return (
        <ScormPlayer
          scormPackageId={scormPackageId}
          lessonId={lessonId}
          courseId={courseId}
          onCompletion={onCompletion}
        />
      )

    case 'h5p':
      if (!h5pPackageId) {
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              H5P package ID is required for H5P content
            </AlertDescription>
          </Alert>
        )
      }
      return (
        <H5PPlayer
          h5pPackageId={h5pPackageId}
          lessonId={lessonId}
          courseId={courseId}
          onCompletion={onCompletion}
        />
      )

    case 'html_embed':
      return (
        <HTMLEmbedViewer
          lessonId={lessonId}
          courseId={courseId}
          onCompletion={onCompletion}
        />
      )

    default:
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unknown content type: {contentType}
          </AlertDescription>
        </Alert>
      )
  }
}
