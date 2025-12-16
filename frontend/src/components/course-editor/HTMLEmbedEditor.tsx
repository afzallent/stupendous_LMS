'use client'

import { useState, useCallback, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, Code, FileCode, FileType, Braces, AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * HTML embed content data structure
 */
export interface HTMLEmbedContent {
  html: string
  css: string
  js: string
}

interface HTMLEmbedEditorProps {
  value: HTMLEmbedContent
  onChange: (content: HTMLEmbedContent) => void
  disabled?: boolean
}

/**
 * Generate preview HTML combining HTML, CSS, and JS
 */
function generatePreviewHtml(content: HTMLEmbedContent): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    ${content.css}
  </style>
</head>
<body>
  ${content.html}
  <script>
    try {
      ${content.js}
    } catch (e) {
      console.error('Script error:', e);
    }
  </script>
</body>
</html>
  `.trim()
}

/**
 * HTMLEmbedEditor component for editing custom HTML/CSS/JS content
 * Provides code editors for each language with live preview
 * 
 * Requirements: 4.5
 */
export function HTMLEmbedEditor({
  value,
  onChange,
  disabled = false,
}: HTMLEmbedEditorProps) {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js' | 'preview'>('html')
  const [previewKey, setPreviewKey] = useState(0)

  const handleHtmlChange = useCallback((html: string) => {
    onChange({ ...value, html })
  }, [value, onChange])

  const handleCssChange = useCallback((css: string) => {
    onChange({ ...value, css })
  }, [value, onChange])

  const handleJsChange = useCallback((js: string) => {
    onChange({ ...value, js })
  }, [value, onChange])

  const refreshPreview = useCallback(() => {
    setPreviewKey(k => k + 1)
  }, [])

  const previewHtml = useMemo(() => generatePreviewHtml(value), [value])

  // Check for potentially dangerous content
  const hasWarnings = useMemo(() => {
    const dangerousPatterns = [
      /document\.cookie/i,
      /localStorage/i,
      /sessionStorage/i,
      /eval\s*\(/i,
      /new\s+Function/i,
      /window\.location/i,
    ]
    const combined = value.html + value.js
    return dangerousPatterns.some(pattern => pattern.test(combined))
  }, [value.html, value.js])

  return (
    <div className="space-y-4">
      <Label>HTML Embed Content</Label>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="html" className="gap-1">
              <FileCode className="h-3 w-3" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="css" className="gap-1">
              <FileType className="h-3 w-3" />
              CSS
            </TabsTrigger>
            <TabsTrigger value="js" className="gap-1">
              <Braces className="h-3 w-3" />
              JavaScript
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1">
              <Eye className="h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>

          {activeTab === 'preview' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshPreview}
              disabled={disabled}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh
            </Button>
          )}
        </div>

        {/* HTML Editor */}
        <TabsContent value="html" className="mt-2">
          <Textarea
            value={value.html}
            onChange={(e) => handleHtmlChange(e.target.value)}
            placeholder={`<div class="container">
  <h1>Hello World</h1>
  <p>Your HTML content here...</p>
</div>`}
            disabled={disabled}
            rows={14}
            className="font-mono text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Write your HTML markup. Do not include &lt;html&gt;, &lt;head&gt;, or &lt;body&gt; tags.
          </p>
        </TabsContent>

        {/* CSS Editor */}
        <TabsContent value="css" className="mt-2">
          <Textarea
            value={value.css}
            onChange={(e) => handleCssChange(e.target.value)}
            placeholder={`.container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #333;
  font-size: 2rem;
}`}
            disabled={disabled}
            rows={14}
            className="font-mono text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Add custom CSS styles. Styles are scoped to the embed container.
          </p>
        </TabsContent>

        {/* JavaScript Editor */}
        <TabsContent value="js" className="mt-2">
          <Textarea
            value={value.js}
            onChange={(e) => handleJsChange(e.target.value)}
            placeholder={`// Your JavaScript code here
document.querySelector('h1').addEventListener('click', function() {
  alert('Hello!');
});`}
            disabled={disabled}
            rows={14}
            className="font-mono text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Add interactive JavaScript. Code runs in a sandboxed iframe.
          </p>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview" className="mt-2">
          <div className="rounded-md border bg-white">
            <iframe
              key={previewKey}
              srcDoc={previewHtml}
              title="HTML Embed Preview"
              className="h-[400px] w-full rounded-md"
              sandbox="allow-scripts"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Preview runs in a sandboxed iframe for security.
          </p>
        </TabsContent>
      </Tabs>

      {/* Security Warning */}
      {hasWarnings && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Your code contains patterns that may not work as expected in the sandboxed environment
            (e.g., localStorage, cookies, redirects). The preview runs with limited permissions for security.
          </AlertDescription>
        </Alert>
      )}

      {/* Code Stats */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>HTML: {value.html.length} chars</span>
        <span>CSS: {value.css.length} chars</span>
        <span>JS: {value.js.length} chars</span>
      </div>
    </div>
  )
}

export default HTMLEmbedEditor
