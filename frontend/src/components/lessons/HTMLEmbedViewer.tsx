'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface HTMLEmbedViewerProps {
  lessonId: string
  courseId: string
  onCompletion?: (data: any) => void
}

interface EmbedConfig {
  id: string
  embed_type: 'url' | 'inline'
  external_url?: string
  inline_html?: string
  width: string
  height: string
  sandbox_attributes: string
  enable_xapi_messaging: boolean
  allowed_origins: string[]
}

/**
 * HTML Embed Viewer Component
 * 
 * Displays embedded HTML content (iframes, custom HTML) with security controls.
 * Supports xAPI statement capture via postMessage.
 * Handles PhET simulations and other embedded content.
 * 
 * Requirements: 13.2, 13.3, 13.4
 */
export function HTMLEmbedViewer({
  lessonId,
  courseId,
  onCompletion
}: HTMLEmbedViewerProps) {
  const [config, setConfig] = useState<EmbedConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  // Load embed configuration
  useEffect(() => {
    const loadEmbedConfig = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/lessons/${lessonId}/html-embed/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load embed configuration')
        }

        const data = await response.json()
        setConfig(data)

        toast({
          title: 'Content Loaded',
          description: 'Embedded content is ready'
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

    loadEmbedConfig()
  }, [lessonId])

  // Set up postMessage listener for xAPI statements
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!config?.enable_xapi_messaging) {
        return
      }

      // Verify origin is allowed
      if (!config.allowed_origins.includes(event.origin)) {
        console.warn(`Blocked message from unauthorized origin: ${event.origin}`)
        return
      }

      const { type, data } = event.data

      if (type === 'xapi') {
        // Embedded content sent an xAPI statement
        try {
          const response = await fetch(`/api/lessons/${lessonId}/html-embed/xapi/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              statement: data.statement,
              origin: event.origin
            })
          })

          if (response.ok) {
            const result = await response.json()

            // Update completion status if indicated
            if (result.completed) {
              setCompleted(true)

              toast({
                title: 'Activity Completed!',
                description: 'Your interaction has been recorded'
              })

              if (onCompletion) {
                onCompletion(result)
              }
            }
          }
        } catch (err) {
          console.error('Error processing xAPI statement:', err)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [config, lessonId, onCompletion])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading embedded content...</p>
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

  if (!config) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No embedded content available</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Embedded Content</CardTitle>
            {completed && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Badge variant="default">Completed</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {config.embed_type === 'url' ? (
            <p>External URL: {config.external_url}</p>
          ) : (
            <p>Custom HTML content</p>
          )}
        </CardContent>
      </Card>

      {/* Embedded Content */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {config.embed_type === 'url' && config.external_url ? (
          <iframe
            src={config.external_url}
            title="Embedded Content"
            className="w-full"
            style={{
              width: config.width,
              height: config.height,
              minHeight: '600px'
            }}
            sandbox={{
              allowSameOrigin: config.sandbox_attributes.includes('allow-same-origin'),
              allowScripts: config.sandbox_attributes.includes('allow-scripts'),
              allowForms: config.sandbox_attributes.includes('allow-forms'),
              allowPopups: config.sandbox_attributes.includes('allow-popups'),
              allowTopNavigation: config.sandbox_attributes.includes('allow-top-navigation')
            } as any}
          />
        ) : config.embed_type === 'inline' && config.inline_html ? (
          <div
            className="p-6"
            style={{
              width: config.width,
              height: config.height,
              minHeight: '600px',
              overflow: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: config.inline_html }}
          />
        ) : (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <p>No content available</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Content Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="capitalize">{config.embed_type === 'url' ? 'External URL' : 'Custom HTML'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dimensions:</span>
            <span>{config.width} × {config.height}</span>
          </div>
          {config.enable_xapi_messaging && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">xAPI Tracking:</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          This content is displayed in a sandboxed iframe for security. Some features may be restricted.
        </AlertDescription>
      </Alert>
    </div>
  )
}
