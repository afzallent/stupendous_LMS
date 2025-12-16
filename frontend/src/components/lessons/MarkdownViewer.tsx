'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface MarkdownViewerProps {
  lessonId: string
  courseId: string
  onCompletion?: (data: any) => void
}

interface MarkdownContent {
  id: string
  content: string
  rendered_html: string
  word_count: number
  estimated_reading_time: number
  highlight_theme: string
}

/**
 * Markdown Viewer Component
 * 
 * Displays Markdown content with syntax highlighting and reading progress tracking.
 * Tracks scroll progress and generates xAPI statements on completion.
 * 
 * Requirements: 11.2, 11.3, 11.4, 11.5
 */
export function MarkdownViewer({
  lessonId,
  courseId,
  onCompletion
}: MarkdownViewerProps) {
  const [content, setContent] = useState<MarkdownContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)
  const [tableOfContents, setTableOfContents] = useState<any[]>([])

  // Fetch markdown content
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/lessons/${lessonId}/markdown/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load markdown content')
        }

        const data = await response.json()
        setContent(data)

        // Extract table of contents from headings
        const headings = data.rendered_html.match(/<h[2-3][^>]*>([^<]+)<\/h[2-3]>/g) || []
        const toc = headings.map((heading: string, index: number) => {
          const level = heading.includes('<h2') ? 2 : 3
          const text = heading.replace(/<[^>]+>/g, '')
          return {
            id: `heading-${index}`,
            level,
            text
          }
        })
        setTableOfContents(toc)

        toast({
          title: 'Content Loaded',
          description: `Estimated reading time: ${data.estimated_reading_time} minutes`
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load content'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [lessonId])

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setScrollProgress(Math.min(scrollPercent, 100))

      // Track scroll progress to backend
      if (scrollPercent > 0 && scrollPercent % 10 === 0) {
        trackScrollProgress(Math.floor(scrollPercent))
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lessonId])

  // Track time spent
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Track scroll progress to backend
  const trackScrollProgress = async (percentage: number) => {
    try {
      await fetch(`/api/lessons/${lessonId}/markdown/track/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          scroll_percentage: percentage,
          time_spent: timeSpent
        })
      })
    } catch (err) {
      console.error('Error tracking scroll progress:', err)
    }
  }

  // Mark lesson as complete
  const handleMarkComplete = async () => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}/markdown/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          time_spent: timeSpent,
          scroll_percentage: scrollProgress
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark lesson as complete')
      }

      const data = await response.json()
      setIsCompleted(true)

      toast({
        title: 'Lesson Completed!',
        description: 'Great job! Your progress has been saved.'
      })

      if (onCompletion) {
        onCompletion(data)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark complete'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  // Navigate to heading
  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Error:</strong> {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!content) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No content available</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {/* Reading Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Reading Progress</CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{formatTime(timeSpent)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={scrollProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">{Math.round(scrollProgress)}% complete</p>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="pt-6">
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: content.rendered_html }}
            />
          </CardContent>
        </Card>

        {/* Completion Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleMarkComplete}
            disabled={isCompleted}
            className="flex-1"
            size="lg"
          >
            {isCompleted ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed
              </>
            ) : (
              'Mark as Complete'
            )}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Reading Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Reading Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Word Count</p>
              <p className="font-semibold">{content.word_count.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. Reading Time</p>
              <p className="font-semibold">{content.estimated_reading_time} min</p>
            </div>
            <div>
              <p className="text-muted-foreground">Time Spent</p>
              <p className="font-semibold">{formatTime(timeSpent)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Table of Contents */}
        {tableOfContents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                {tableOfContents.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={`block text-sm text-left hover:text-primary transition-colors ${
                      item.level === 3 ? 'ml-4 text-muted-foreground' : 'font-medium'
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isCompleted ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-600">
                <Badge variant="secondary">In Progress</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
