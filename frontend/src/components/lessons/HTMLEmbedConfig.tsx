'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, 
  Save, 
  Eye, 
  Code, 
  Link as LinkIcon,
  Shield,
  Settings,
  Info,
  Loader2,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface HTMLEmbedConfigProps {
  lessonId: string
  courseId: string
  existingConfig?: HTMLEmbedConfiguration | null
  onSaveComplete?: (data: HTMLEmbedConfiguration) => void
  onCancel?: () => void
}

interface HTMLEmbedConfiguration {
  id?: number
  lesson_id: number
  embed_type: 'url' | 'inline'
  external_url?: string
  inline_html?: string
  width: string
  height: string
  allow_scripts: boolean
  allow_forms: boolean
  allow_popups: boolean
  allow_same_origin: boolean
  allow_top_navigation: boolean
  custom_sandbox_attrs?: string
  enable_xapi_messaging: boolean
  allowed_origins: string[]
  iframe_html?: string
  xapi_listener_script?: string
}

/**
 * HTML Embed Configuration Component for Instructors
 * 
 * Provides a comprehensive interface for configuring HTML embeds including:
 * - URL or inline HTML input with tabs
 * - Sandbox permission toggles (scripts, forms, popups, etc.)
 * - Dimension configuration (width, height)
 * - xAPI messaging toggle and allowed origins
 * - Preview functionality
 * 
 * Requirements: 13.1, 13.5
 */
export function HTMLEmbedConfig({
  lessonId,
  courseId,
  existingConfig,
  onSaveComplete,
  onCancel
}: HTMLEmbedConfigProps) {
  // Form state
  const [embedType, setEmbedType] = useState<'url' | 'inline'>('url')
  const [externalUrl, setExternalUrl] = useState('')
  const [inlineHtml, setInlineHtml] = useState('')
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('600px')
  
  // Sandbox permissions
  const [allowScripts, setAllowScripts] = useState(false)
  const [allowForms, setAllowForms] = useState(false)
  const [allowPopups, setAllowPopups] = useState(false)
  const [allowSameOrigin, setAllowSameOrigin] = useState(false)
  const [allowTopNavigation, setAllowTopNavigation] = useState(false)
  const [customSandboxAttrs, setCustomSandboxAttrs] = useState('')
  
  // xAPI settings
  const [enableXapiMessaging, setEnableXapiMessaging] = useState(false)
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([])
  const [newOrigin, setNewOrigin] = useState('')
  
  // UI state
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')

  // Load existing configuration
  useEffect(() => {
    if (existingConfig) {
      setEmbedType(existingConfig.embed_type)
      setExternalUrl(existingConfig.external_url || '')
      setInlineHtml(existingConfig.inline_html || '')
      setWidth(existingConfig.width)
      setHeight(existingConfig.height)
      setAllowScripts(existingConfig.allow_scripts)
      setAllowForms(existingConfig.allow_forms)
      setAllowPopups(existingConfig.allow_popups)
      setAllowSameOrigin(existingConfig.allow_same_origin)
      setAllowTopNavigation(existingConfig.allow_top_navigation)
      setCustomSandboxAttrs(existingConfig.custom_sandbox_attrs || '')
      setEnableXapiMessaging(existingConfig.enable_xapi_messaging)
      setAllowedOrigins(existingConfig.allowed_origins || [])
    }
  }, [existingConfig])

  // Add allowed origin
  const handleAddOrigin = () => {
    if (!newOrigin.trim()) {
      return
    }

    // Basic URL validation
    try {
      new URL(newOrigin.trim())
      if (!allowedOrigins.includes(newOrigin.trim())) {
        setAllowedOrigins([...allowedOrigins, newOrigin.trim()])
        setNewOrigin('')
      } else {
        toast({
          title: 'Duplicate Origin',
          description: 'This origin is already in the list',
          variant: 'destructive'
        })
      }
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid URL (e.g., https://example.com)',
        variant: 'destructive'
      })
    }
  }

  // Remove allowed origin
  const handleRemoveOrigin = (origin: string) => {
    setAllowedOrigins(allowedOrigins.filter(o => o !== origin))
  }

  // Validate form
  const validateForm = (): boolean => {
    setError(null)

    if (embedType === 'url') {
      if (!externalUrl.trim()) {
        setError('Please enter an external URL')
        return false
      }
      try {
        new URL(externalUrl.trim())
      } catch {
        setError('Please enter a valid URL')
        return false
      }
    } else if (embedType === 'inline') {
      if (!inlineHtml.trim()) {
        setError('Please enter HTML content')
        return false
      }
    }

    if (enableXapiMessaging && allowedOrigins.length === 0) {
      setError('Please add at least one allowed origin for xAPI messaging')
      return false
    }

    return true
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload: any = {
        embed_type: embedType,
        width,
        height,
        allow_scripts: allowScripts,
        allow_forms: allowForms,
        allow_popups: allowPopups,
        allow_same_origin: allowSameOrigin,
        allow_top_navigation: allowTopNavigation,
        enable_xapi_messaging: enableXapiMessaging,
        allowed_origins: allowedOrigins
      }

      if (embedType === 'url') {
        payload.external_url = externalUrl.trim()
      } else {
        payload.inline_html = inlineHtml.trim()
      }

      if (customSandboxAttrs.trim()) {
        payload.custom_sandbox_attrs = customSandboxAttrs.trim()
      }

      const response = await fetch(`/api/lessons/${lessonId}/html-embed/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to save configuration')
        toast({
          title: 'Save Failed',
          description: data.error || 'Failed to save HTML embed configuration',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Configuration Saved',
        description: 'HTML embed configuration has been saved successfully'
      })

      if (onSaveComplete) {
        onSaveComplete(data)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      
      toast({
        title: 'Save Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle preview
  const handlePreview = () => {
    if (!validateForm()) {
      return
    }

    let html = ''
    
    if (embedType === 'url') {
      const sandboxAttrs: string[] = []
      if (allowScripts) sandboxAttrs.push('allow-scripts')
      if (allowForms) sandboxAttrs.push('allow-forms')
      if (allowPopups) sandboxAttrs.push('allow-popups')
      if (allowSameOrigin) sandboxAttrs.push('allow-same-origin')
      if (allowTopNavigation) sandboxAttrs.push('allow-top-navigation')
      
      html = `<iframe src="${externalUrl}" style="width: ${width}; height: ${height}; border: 1px solid #e5e7eb;" sandbox="${sandboxAttrs.join(' ')}"></iframe>`
    } else {
      html = inlineHtml
    }

    setPreviewHtml(html)
    setShowPreview(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HTML Embed Configuration</CardTitle>
          <CardDescription>
            Configure embedded HTML content with security controls and xAPI tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Embed Type Tabs */}
          <Tabs value={embedType} onValueChange={(v) => setEmbedType(v as 'url' | 'inline')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-2">
                <LinkIcon className="h-4 w-4" />
                External URL
              </TabsTrigger>
              <TabsTrigger value="inline" className="gap-2">
                <Code className="h-4 w-4" />
                Inline HTML
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="external-url">
                  External URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="external-url"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com/content"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the URL of the content to embed (e.g., PhET simulation, external tool)
                </p>
              </div>
            </TabsContent>

            <TabsContent value="inline" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="inline-html">
                  HTML Content <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="inline-html"
                  value={inlineHtml}
                  onChange={(e) => setInlineHtml(e.target.value)}
                  placeholder="<div>Your HTML content here...</div>"
                  disabled={saving}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter custom HTML content. Content will be sanitized for security.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Dimensions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <h3 className="font-medium">Dimensions</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="100%"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  e.g., 100%, 800px
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="600px"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  e.g., 600px, 80vh
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sandbox Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <h3 className="font-medium">Security & Permissions</h3>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Sandbox attributes control what the embedded content can do. Enable only what's necessary for security.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-scripts">Allow Scripts</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable JavaScript execution
                  </p>
                </div>
                <Switch
                  id="allow-scripts"
                  checked={allowScripts}
                  onCheckedChange={setAllowScripts}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-forms">Allow Forms</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable form submission
                  </p>
                </div>
                <Switch
                  id="allow-forms"
                  checked={allowForms}
                  onCheckedChange={setAllowForms}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-popups">Allow Popups</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable popup windows
                  </p>
                </div>
                <Switch
                  id="allow-popups"
                  checked={allowPopups}
                  onCheckedChange={setAllowPopups}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-same-origin">Allow Same Origin</Label>
                  <p className="text-xs text-muted-foreground">
                    Treat content as same origin (use with caution)
                  </p>
                </div>
                <Switch
                  id="allow-same-origin"
                  checked={allowSameOrigin}
                  onCheckedChange={setAllowSameOrigin}
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-top-navigation">Allow Top Navigation</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow navigating the top-level window
                  </p>
                </div>
                <Switch
                  id="allow-top-navigation"
                  checked={allowTopNavigation}
                  onCheckedChange={setAllowTopNavigation}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* xAPI Messaging */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-xapi">Enable xAPI Messaging</Label>
                <p className="text-xs text-muted-foreground">
                  Capture xAPI statements from embedded content via postMessage
                </p>
              </div>
              <Switch
                id="enable-xapi"
                checked={enableXapiMessaging}
                onCheckedChange={setEnableXapiMessaging}
                disabled={saving}
              />
            </div>

            {enableXapiMessaging && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                <Label>Allowed Origins</Label>
                <p className="text-xs text-muted-foreground">
                  Specify which origins can send xAPI statements (for security)
                </p>
                
                {/* Origin List */}
                {allowedOrigins.length > 0 && (
                  <div className="space-y-2">
                    {allowedOrigins.map((origin, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm font-mono">{origin}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOrigin(origin)}
                          disabled={saving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Origin */}
                <div className="flex gap-2">
                  <Input
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="https://example.com"
                    disabled={saving}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddOrigin()
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddOrigin}
                    disabled={saving || !newOrigin.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={saving}
              className="flex-1 gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal/Card */}
      {showPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              This is how the embedded content will appear to students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted/50">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Note: Some interactive features may not work in preview mode
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
