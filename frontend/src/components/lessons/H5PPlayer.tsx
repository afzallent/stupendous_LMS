'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, CheckCircle, RotateCcw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface H5PPlayerProps {
  h5pPackageId: string
  lessonId: string
  courseId: string
  onCompletion?: (data: any) => void
}

interface H5PState {
  embedUrl: string
  state?: any
  score?: number
  maxScore?: number
  completed: boolean
  loading: boolean
}

/**
 * H5P Player Component
 * 
 * Embeds and manages H5P interactive content with xAPI statement capture.
 * Handles state restoration and completion tracking.
 * 
 * Requirements: 12.2, 12.3, 12.4
 */
export function H5PPlayer({
  h5pPackageId,
  lessonId,
  courseId,
  onCompletion
}: H5PPlayerProps) {
  const [h5pState, setH5pState] = useState<H5PState>({
    embedUrl: '',
    completed: false,
    loading: true
  })
  const [error, setError] = useState<string | null>(null)

  // Load H5P content
  useEffect(() => {
    const loadH5PContent = async () => {
      try {
        setH5pState(prev => ({ ...prev, loading: true }))
        setError(null)

        const response = await fetch(`/api/h5p/${h5pPackageId}/embed/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load H5P content')
        }

        const data = await response.json()

        setH5pState(prev => ({
          ...prev,
          embedUrl: data.embed_url,
          state: data.state,
          completed: data.completed || false,
          loading: false
        }))

        toast({
          title: 'H5P Content Loaded',
          description: 'Interactive content is ready'
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load H5P content'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
        setH5pState(prev => ({ ...prev, loading: false }))
      }
    }

    loadH5PContent()
  }, [h5pPackageId])

  // Set up postMessage listener for xAPI statements from H5P
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (!event.origin.includes('h5p')) {
        return
      }

      const { type, data } = event.data

      if (type === 'xapi') {
        // H5P sent an xAPI statement
        try {
          const response = await fetch(`/api/h5p/${h5pPackageId}/xapi/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              statement: data.statement
            })
          })

          if (response.ok) {
            const result = await response.json()

            // Update state if completion detected
            if (result.completed) {
              setH5pState(prev => ({
                ...prev,
                completed: true,
                score: result.score,
                maxScore: result.max_score
              }))

              toast({
                title: 'Activity Completed!',
                description: `Score: ${result.score}/${result.max_score}`
              })

              if (onCompletion) {
                onCompletion(result)
              }
            }
          }
        } catch (err) {
          console.error('Error processing H5P xAPI statement:', err)
        }
      } else if (type === 'state') {
        // H5P sent state data
        try {
          await fetch(`/api/h5p/${h5pPackageId}/state/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              state: data.state
            })
          })
        } catch (err) {
          console.error('Error saving H5P state:', err)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [h5pPackageId, onCompletion])

  // Reset content
  const handleReset = async () => {
    try {
      const response = await fetch(`/api/h5p/${h5pPackageId}/state/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (response.ok) {
        setH5pState(prev => ({
          ...prev,
          completed: false,
          score: undefined,
          maxScore: undefined
        }))

        toast({
          title: 'Reset',
          description: 'Content state has been reset'
        })

        // Reload the iframe
        window.location.reload()
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to reset content',
        variant: 'destructive'
      })
    }
  }

  if (h5pState.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading H5P content...</p>
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

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>H5P Interactive Content</CardTitle>
            <div className="flex items-center gap-2">
              {h5pState.completed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge variant="default">Completed</Badge>
                </>
              ) : (
                <Badge variant="secondary">In Progress</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {h5pState.score !== undefined && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                Score: {h5pState.score}/{h5pState.maxScore}
              </p>
              {h5pState.maxScore && (
                <p className="text-sm text-muted-foreground">
                  {Math.round((h5pState.score / h5pState.maxScore) * 100)}%
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* H5P Content Iframe */}
      {h5pState.embedUrl && (
        <div className="border rounded-lg overflow-hidden bg-white">
          <iframe
            src={h5pState.embedUrl}
            title="H5P Content"
            className="w-full"
            style={{ minHeight: '600px' }}
            sandbox={{
              allowSameOrigin: true,
              allowScripts: true,
              allowForms: true,
              allowPopups: true
            } as any}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {h5pState.completed && (
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Content
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">About H5P</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This interactive content is powered by H5P, an open-source framework for creating
            rich interactive web content.
          </p>
          <p>
            Your interactions are tracked and recorded for learning analytics purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
