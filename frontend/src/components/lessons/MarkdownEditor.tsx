'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Bold,
  Italic,
  Code,
  Heading2,
  List,
  Link,
  AlertCircle,
  Loader2,
  Save,
  Eye
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface MarkdownEditorProps {
  lessonId: string
  courseId: string
  initialContent?: string
  onSave?: (content: string) => void
}

/**
 * Markdown Editor Component for Instructors
 * 
 * Provides a live preview editor for creating and editing Markdown lessons.
 * Includes formatting toolbar and real-time preview.
 * 
 * Requirements: 11.1
 */
export function MarkdownEditor({
  lessonId,
  courseId,
  initialContent = '',
  onSave
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('edit')

  // Load existing content
  useEffect(() => {
    if (lessonId && !initialContent) {
      const loadContent = async () => {
        try {
          setLoading(true)
          const response = await fetch(`/api/lessons/${lessonId}/markdown/`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            setContent(data.content)
          }
        } catch (err) {
          console.error('Error loading content:', err)
        } finally {
          setLoading(false)
        }
      }

      loadContent()
    }
  }, [lessonId, initialContent])

  // Update preview
  useEffect(() => {
    const updatePreview = async () => {
      try {
        // For now, use a simple markdown to HTML conversion
        // In production, this would call a backend endpoint
        const response = await fetch('/api/markdown/preview/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ markdown: content })
        })

        if (response.ok) {
          const data = await response.json()
          setPreview(data.html)
        }
      } catch (err) {
        console.error('Error updating preview:', err)
      }
    }

    const timer = setTimeout(updatePreview, 500)
    return () => clearTimeout(timer)
  }, [content])

  // Insert formatting
  const insertFormatting = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end)

    setContent(newContent)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  // Save content
  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/lessons/${lessonId}/markdown/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ content })
      })

      if (!response.ok) {
        throw new Error('Failed to save content')
      }

      const data = await response.json()

      toast({
        title: 'Saved',
        description: 'Markdown content has been saved successfully'
      })

      if (onSave) {
        onSave(content)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>

        <TabsContent value="edit" className="space-y-4">
          {/* Formatting Toolbar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertFormatting('**', '**')}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertFormatting('*', '*')}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertFormatting('`', '`')}
                  title="Code"
                >
                  <Code className="h-4 w-4" />
                </Button>

                <div className="w-px bg-border" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertFormatting('## ')}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertFormatting('- ')}
                  title="List"
                >
                  <List className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertFormatting('[', '](url)')}
                  title="Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardContent className="pt-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your Markdown content here..."
                className="font-mono text-sm min-h-96 resize-none"
              />
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Words</p>
                  <p className="font-semibold">{content.split(/\s+/).filter(w => w).length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Characters</p>
                  <p className="font-semibold">{content.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Reading Time</p>
                  <p className="font-semibold">
                    {Math.max(1, Math.floor(content.split(/\s+/).filter(w => w).length / 200))} min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="pt-6">
              {preview ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              ) : (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Eye className="h-4 w-4 mr-2" />
                  <p>Preview will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
