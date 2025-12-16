'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import { djangoApi } from '@/lib/django-api-client'

/**
 * YouTube video info response from the backend API
 */
export interface YouTubeInfo {
  success: boolean
  video_id?: string
  title?: string
  description?: string
  duration?: string
  duration_iso?: string
  thumbnail?: string
  embeddable?: boolean
  channel_title?: string
  error?: string
}

/**
 * Video content data structure
 */
export interface VideoContent {
  url: string
  thumbnail_url: string | null
  duration: string | null
  is_embeddable: boolean
  title?: string
  description?: string
}

interface VideoEditorProps {
  value: VideoContent
  onChange: (content: VideoContent) => void
  disabled?: boolean
}

/**
 * Check if a URL is a valid YouTube URL
 * Supports: youtube.com/watch, youtu.be, youtube.com/embed, youtube.com/v
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/embed\//,
    /youtube\.com\/v\//,
  ]
  return patterns.some(pattern => pattern.test(url))
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * VideoEditor component for editing video lesson content
 * Supports YouTube URL input with automatic info fetching
 * 
 * Requirements: 4.2, 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function VideoEditor({ value, onChange, disabled = false }: VideoEditorProps) {
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchSuccess, setFetchSuccess] = useState(false)

  const showFetchButton = isYouTubeUrl(value.url)

  const handleUrlChange = useCallback((url: string) => {
    setFetchError(null)
    setFetchSuccess(false)
    onChange({
      ...value,
      url,
    })
  }, [value, onChange])

  const handleFetchYouTubeInfo = useCallback(async () => {
    if (!value.url || !isYouTubeUrl(value.url)) {
      setFetchError('Please enter a valid YouTube URL')
      return
    }

    setIsFetching(true)
    setFetchError(null)
    setFetchSuccess(false)

    try {
      const response = await djangoApi.post<YouTubeInfo>(
        '/api/lessons/fetch_youtube_info/',
        { video_url: value.url }
      )

      if (!response.success) {
        setFetchError(response.error || 'Failed to fetch video information')
        return
      }

      // Auto-populate fields with fetched data - Requirements: 9.4
      onChange({
        url: value.url,
        thumbnail_url: response.thumbnail || null,
        duration: response.duration || null,
        is_embeddable: response.embeddable ?? true,
        title: response.title,
        description: response.description,
      })

      setFetchSuccess(true)
    } catch (err: any) {
      // Requirements: 9.5 - Display error message on fetch failure
      setFetchError(err.message || 'Failed to fetch video information')
    } finally {
      setIsFetching(false)
    }
  }, [value.url, onChange])

  const handleDurationChange = useCallback((duration: string) => {
    onChange({
      ...value,
      duration,
    })
  }, [value, onChange])

  return (
    <div className="space-y-4">
      {/* YouTube URL Input - Requirements: 9.1 */}
      <div className="space-y-2">
        <Label htmlFor="video-url">Video URL *</Label>
        <div className="flex gap-2">
          <Input
            id="video-url"
            value={value.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={disabled || isFetching}
            className="flex-1"
          />
          {/* Fetch Info Button - Requirements: 9.1, 9.2 */}
          {showFetchButton && (
            <Button
              type="button"
              variant="outline"
              onClick={handleFetchYouTubeInfo}
              disabled={disabled || isFetching}
              className="shrink-0"
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Fetch Info
                </>
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Enter a YouTube URL or direct video link
        </p>
      </div>

      {/* Fetch Success Message */}
      {fetchSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Video information fetched successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Fetch Error Message - Requirements: 9.5 */}
      {fetchError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {/* Embeddability Warning - Requirements: 9.3 */}
      {value.url && !value.is_embeddable && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            This video cannot be embedded. Students may need to watch it directly on YouTube.
          </AlertDescription>
        </Alert>
      )}

      {/* Thumbnail Preview */}
      {value.thumbnail_url && (
        <div className="space-y-2">
          <Label>Thumbnail Preview</Label>
          <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
            <img
              src={value.thumbnail_url}
              alt="Video thumbnail"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Duration Input */}
      <div className="space-y-2">
        <Label htmlFor="duration">Duration</Label>
        <Input
          id="duration"
          value={value.duration || ''}
          onChange={(e) => handleDurationChange(e.target.value)}
          placeholder="e.g., 5:30 or 1:30:00"
          disabled={disabled}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Format: MM:SS or HH:MM:SS (auto-filled when fetching YouTube info)
        </p>
      </div>

      {/* Video Preview Link */}
      {value.url && (
        <div className="pt-2">
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Preview video in new tab
          </a>
        </div>
      )}
    </div>
  )
}

export default VideoEditor
