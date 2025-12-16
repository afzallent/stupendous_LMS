'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  ListOrdered,
  Award,
  MessageSquare,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { djangoApi } from '@/lib/django-api-client'

export interface CourseSettings {
  sequential_progression: boolean
  enable_certificate: boolean
  certificate_min_completion: number
  enable_discussions: boolean
}

interface SettingsTabProps {
  courseId: string
  onSettingsChange?: (settings: CourseSettings) => void
}

/**
 * SettingsTab component for configuring course-level settings
 * 
 * Features:
 * - Sequential progression toggle (Requirements 10.1, 10.2)
 * - Certificate settings with minimum completion percentage (Requirements 10.3)
 * - Discussion forum toggle (Requirements 10.1)
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export function SettingsTab({ courseId, onSettingsChange }: SettingsTabProps) {
  const [settings, setSettings] = useState<CourseSettings>({
    sequential_progression: false,
    enable_certificate: false,
    certificate_min_completion: 100,
    enable_discussions: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [courseId])

  /**
   * Load course settings from the backend
   * Requirements: 10.5
   */
  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const course = await djangoApi.get<CourseSettings & { id: number }>(`/api/courses/${courseId}/`)
      setSettings({
        sequential_progression: course.sequential_progression ?? false,
        enable_certificate: course.enable_certificate ?? false,
        certificate_min_completion: course.certificate_min_completion ?? 100,
        enable_discussions: course.enable_discussions ?? false
      })
    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError('Failed to load course settings')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Save settings to the backend
   * Requirements: 10.4
   */
  const saveSettings = async (newSettings: CourseSettings) => {
    try {
      setSaving(true)
      setError(null)
      await djangoApi.patch(`/api/courses/${courseId}/`, newSettings)
      setLastSaved(new Date())
      onSettingsChange?.(newSettings)
    } catch (err: any) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle setting change with immediate save
   */
  const handleSettingChange = <K extends keyof CourseSettings>(
    key: K,
    value: CourseSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Course Settings</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}
          {!saving && lastSaved && (
            <Badge variant="outline" className="text-muted-foreground">
              Saved
            </Badge>
          )}
          {error && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </Badge>
          )}
        </div>
      </div>

      {/* Sequential Progression Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" />
            Sequential Progression
          </CardTitle>
          <CardDescription>
            Control how students navigate through your course content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sequential-progression">
                Require lessons in order
              </Label>
              <p className="text-sm text-muted-foreground">
                Students must complete each lesson before accessing the next one
              </p>
            </div>
            <Switch
              id="sequential-progression"
              checked={settings.sequential_progression}
              onCheckedChange={(checked) => 
                handleSettingChange('sequential_progression', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Certificate Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificate Settings
          </CardTitle>
          <CardDescription>
            Configure completion certificates for your course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-certificate">
                Enable certificate on completion
              </Label>
              <p className="text-sm text-muted-foreground">
                Award a certificate when students complete the course
              </p>
            </div>
            <Switch
              id="enable-certificate"
              checked={settings.enable_certificate}
              onCheckedChange={(checked) => 
                handleSettingChange('enable_certificate', checked)
              }
            />
          </div>

          {settings.enable_certificate && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Minimum completion required</Label>
                  <span className="text-sm font-medium">
                    {settings.certificate_min_completion}%
                  </span>
                </div>
                <Slider
                  value={[settings.certificate_min_completion]}
                  onValueChange={([value]) => 
                    handleSettingChange('certificate_min_completion', value)
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Students must complete at least {settings.certificate_min_completion}% of the course to receive a certificate
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Discussion Forums Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discussion Forums
          </CardTitle>
          <CardDescription>
            Enable student discussions and Q&A for your course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-discussions">
                Enable discussion forums
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow students to ask questions and discuss course content
              </p>
            </div>
            <Switch
              id="enable-discussions"
              checked={settings.enable_discussions}
              onCheckedChange={(checked) => 
                handleSettingChange('enable_discussions', checked)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsTab
