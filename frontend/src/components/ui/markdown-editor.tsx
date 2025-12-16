'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Edit, Bold, Italic, Link, List, ListOrdered, Quote, Code } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Simple markdown editor with preview functionality
 */
export function MarkdownEditor({ value, onChange, placeholder, className }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    
    onChange(newText)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  const renderPreview = (markdown: string) => {
    // Simple markdown to HTML conversion for preview
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p><h([1-6])>/g, '<h$1>')
      .replace(/<\/h([1-6])><\/p>/g, '</h$1>')

    return html
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
        <div className="flex items-center justify-between mb-2">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-1">
              <Edit className="h-3 w-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'edit' && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown('**', '**')}
                title="Bold"
              >
                <Bold className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown('*', '*')}
                title="Italic"
              >
                <Italic className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown('[', '](url)')}
                title="Link"
              >
                <Link className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown('`', '`')}
                title="Code"
              >
                <Code className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown('\n- ', '')}
                title="Bullet List"
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown('\n1. ', '')}
                title="Numbered List"
              >
                <ListOrdered className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => insertMarkdown('\n> ', '')}
                title="Quote"
              >
                <Quote className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="edit" className="mt-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[200px] font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card>
            <CardContent className="p-4">
              {value ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
                />
              ) : (
                <p className="text-muted-foreground italic">Nothing to preview yet...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MarkdownEditor