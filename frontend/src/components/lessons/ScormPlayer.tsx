'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ScormPlayerProps {
  scormPackageId: string
  lessonId: string
  courseId: string
  onCompletion?: (data: any) => void
}

interface ScormSession {
  sessionId: string
  initialized: boolean
  completed: boolean
  score?: number
  status?: string
}

/**
 * SCORM Player Component
 * 
 * Manages SCORM content delivery and communication with the SCORM runtime API.
 * Handles initialization, data persistence, and completion tracking.
 * 
 * Requirements: 2.1, 9.1
 */
export function ScormPlayer({
  scormPackageId,
  lessonId,
  courseId,
  onCompletion
}: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [session, setSession] = useState<ScormSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contentUrl, setContentUrl] = useState<string>('')
  const [sessionData, setSessionData] = useState<any>(null)

  // Initialize SCORM session on component mount
  useEffect(() => {
    const initializeScormSession = async () => {
      try {
        setLoading(true)
        setError(null)

        // Call backend to initialize SCORM session
        const response = await fetch('/api/scorm/runtime/initialize/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            scorm_package_id: scormPackageId,
            lesson_id: lessonId
          })
        })

        if (!response.ok) {
          throw new Error('Failed to initialize SCORM session')
        }

        const data = await response.json()
        
        setSession({
          sessionId: data.session_id,
          initialized: true,
          completed: false
        })

        setContentUrl(data.content_url)
        setSessionData(data)

        toast({
          title: 'SCORM Session Started',
          description: 'Your learning session has been initialized'
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SCORM session'
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

    initializeScormSession()
  }, [scormPackageId, lessonId])

  // Set up SCORM API for iframe communication
  useEffect(() => {
    if (!iframeRef.current || !session?.initialized) return

    // Create SCORM API object that the iframe content can access
    const scormApi = {
      LMSInitialize: (param: string) => {
        console.log('SCORM: LMSInitialize called')
        return 'true'
      },

      LMSGetValue: async (element: string) => {
        console.log(`SCORM: LMSGetValue(${element})`)
        
        try {
          const response = await fetch('/api/scorm/runtime/get-value/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              session_id: session.sessionId,
              element
            })
          })

          const data = await response.json()
          return data.value || ''
        } catch (err) {
          console.error('Error getting SCORM value:', err)
          return ''
        }
      },

      LMSSetValue: async (element: string, value: string) => {
        console.log(`SCORM: LMSSetValue(${element}, ${value})`)
        
        try {
          const response = await fetch('/api/scorm/runtime/set-value/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              session_id: session.sessionId,
              element,
              value
            })
          })

          const data = await response.json()
          return data.success ? 'true' : 'false'
        } catch (err) {
          console.error('Error setting SCORM value:', err)
          return 'false'
        }
      },

      LMSCommit: async (param: string) => {
        console.log('SCORM: LMSCommit called')
        
        try {
          const response = await fetch('/api/scorm/runtime/commit/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              session_id: session.sessionId
            })
          })

          const data = await response.json()
          return data.success ? 'true' : 'false'
        } catch (err) {
          console.error('Error committing SCORM data:', err)
          return 'false'
        }
      },

      LMSFinish: async (param: string) => {
        console.log('SCORM: LMSFinish called')
        
        try {
          const response = await fetch('/api/scorm/runtime/terminate/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({
              session_id: session.sessionId
            })
          })

          const data = await response.json()
          
          // Update session state with completion data
          setSession(prev => prev ? {
            ...prev,
            completed: true,
            score: data.score,
            status: data.status
          } : null)

          // Call completion callback
          if (onCompletion) {
            onCompletion(data)
          }

          toast({
            title: 'SCORM Session Completed',
            description: `Score: ${data.score || 'N/A'}`
          })

          return data.success ? 'true' : 'false'
        } catch (err) {
          console.error('Error finishing SCORM session:', err)
          return 'false'
        }
      },

      LMSGetLastError: () => '0',
      LMSGetErrorString: (errorCode: string) => 'No error',
      LMSGetDiagnostic: (errorCode: string) => ''
    }

    // Expose API to iframe
    if (iframeRef.current?.contentWindow) {
      (iframeRef.current.contentWindow as any).API = scormApi
    }
  }, [session, onCompletion])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Initializing SCORM session...</p>
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
      {/* Session Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SCORM Content</CardTitle>
            <div className="flex items-center gap-2">
              {session?.completed ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge variant="default">Completed</Badge>
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <Badge variant="secondary">In Progress</Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {session?.score !== undefined && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Score: {session.score}%</p>
              {session.status && (
                <p className="text-sm text-muted-foreground">Status: {session.status}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SCORM Content Iframe */}
      {contentUrl && (
        <div className="border rounded-lg overflow-hidden bg-white">
          <iframe
            ref={iframeRef}
            src={contentUrl}
            title="SCORM Content"
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

      {/* Session Info */}
      {sessionData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Session Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session ID:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs">{session?.sessionId}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SCORM Version:</span>
              <span>{sessionData.scorm_version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content:</span>
              <span>{sessionData.sco_title}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
