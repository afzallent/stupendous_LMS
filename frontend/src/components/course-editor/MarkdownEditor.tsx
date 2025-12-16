'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Bold, Italic, Link, List, ListOrdered, Heading1, Heading2, Code, Quote } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (content: string) => void
  disabled?: boolean
  placeholder?: string
  minRows?: number
}

/**
 * Simple markdown to HTML converter for preview
 * Handles basic markdown syntax
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bold and Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md overflow-x-auto my-2"><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-muted-foreground/30 pl-4 italic my-2">$1</blockquote>')
    // Unordered lists
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br />')

  // Wrap in paragraph
  html = `<p class="my-2">${html}</p>`
  
  // Clean up empty paragraphs
  html = html.replace(/<p class="my-2"><\/p>/g, '')
  
  return html
}

/**
 * MarkdownEditor component for editing markdown lesson content
 * Provides a rich editing experience with preview capability
 * 
 * Requirements: 4.3
 */
export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
  placeholder = '# Heading\n\nYour markdown content here...\n\n- List item 1\n- List item 2\n\n**Bold text** and *italic text*',
  minRows = 12,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const insertMarkdown = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = document.getElementById('markdown-content') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end) || placeholder
    
    const newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end)
    onChange(newText)

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [value, onChange])

  const toolbarButtons = [
    { icon: Heading1, label: 'Heading 1', action: () => insertMarkdown('# ', '', 'Heading') },
    { icon: Heading2, label: 'Heading 2', action: () => insertMarkdown('## ', '', 'Heading') },
    { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**', 'bold text') },
    { icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*', 'italic text') },
    { icon: Code, label: 'Code', action: () => insertMarkdown('`', '`', 'code') },
    { icon: Link, label: 'Link', action: () => insertMarkdown('[', '](url)', 'link text') },
    { icon: List, label: 'Bullet List', action: () => insertMarkdown('- ', '', 'list item') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertMarkdown('1. ', '', 'list item') },
    { icon: Quote, label: 'Quote', action: () => insertMarkdown('> ', '', 'quote') },
  ]

  return (
    <div className="space-y-2">
      <Label>Markdown Content</Label>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="edit" className="gap-1">
              <Edit className="h-3 w-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          {/* Toolbar - only show in edit mode */}
          {activeTab === 'edit' && (
            <div className="flex items-center gap-0.5">
              {toolbarButtons.map((btn, index) => {
                const Icon = btn.icon
                return (
                  <Button
                    key={index}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={btn.action}
                    disabled={disabled}
                    title={btn.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="sr-only">{btn.label}</span>
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        <TabsContent value="edit" className="mt-2">
          <Textarea
            id="markdown-content"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={minRows}
            className="font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-2">
          <div 
            className="min-h-[300px] rounded-md border bg-background p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(value) || '<p class="text-muted-foreground">Nothing to preview</p>' }}
          />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Supports Markdown syntax: headings (#), bold (**), italic (*), links, lists, code blocks, and more.
      </p>
    </div>
  )
}

export default MarkdownEditor
