'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, Package, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react'
import { djangoApi } from '@/lib/django-api-client'

/**
 * H5P package data from the library
 */
export interface H5PPackage {
  id: number
  title: string
  description: string
  library_name: string
  library_version: string
  embed_url: string | null
  uploaded_at: string
}

/**
 * H5P content data structure
 */
export interface H5PContent {
  package_id: number | null
  package_file: File | null
  title?: string
  description?: string
}

interface H5PEditorProps {
  value: H5PContent
  onChange: (content: H5PContent) => void
  lessonId?: number
  existingPackages?: H5PPackage[]
  disabled?: boolean
  onUploadComplete?: (packageId: number) => void
}

/**
 * H5PEditor component for managing H5P interactive content
 * Supports uploading new H5P packages or selecting from existing library
 * 
 * Requirements: 4.4
 */
export function H5PEditor({
  value,
  onChange,
  lessonId,
  existingPackages = [],
  disabled = false,
  onUploadComplete,
}: H5PEditorProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [mode, setMode] = useState<'select' | 'upload'>(
    existingPackages.length > 0 ? 'select' : 'upload'
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedPackage = existingPackages.find(p => p.id === value.package_id)

  const handlePackageSelect = useCallback((packageId: string) => {
    setUploadError(null)
    setUploadSuccess(false)
    
    if (packageId === 'none') {
      onChange({
        package_id: null,
        package_file: null,
      })
    } else {
      const pkg = existingPackages.find(p => p.id === parseInt(packageId))
      onChange({
        package_id: parseInt(packageId),
        package_file: null,
        title: pkg?.title,
        description: pkg?.description,
      })
    }
  }, [existingPackages, onChange])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.h5p')) {
      setUploadError('Please select a valid H5P package file (.h5p)')
      return
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('File size exceeds maximum allowed (100MB)')
      return
    }

    setUploadError(null)
    setUploadSuccess(false)
    onChange({
      package_id: null,
      package_file: file,
      title: file.name.replace('.h5p', ''),
    })
  }, [onChange])

  const handleUpload = useCallback(async () => {
    if (!value.package_file || !lessonId) {
      setUploadError('Please select a file and ensure the lesson is saved first')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    try {
      const formData = new FormData()
      formData.append('lesson_id', lessonId.toString())
      formData.append('h5p_package', value.package_file)
      if (value.title) {
        formData.append('title', value.title)
      }
      if (value.description) {
        formData.append('description', value.description)
      }

      const response = await djangoApi.upload<{
        success: boolean
        h5p_id: number
        library: string
        version: string
        title: string
        message?: string
      }>('/api/h5p/upload/', formData)

      if (response.success) {
        onChange({
          package_id: response.h5p_id,
          package_file: null,
          title: response.title,
        })
        setUploadSuccess(true)
        onUploadComplete?.(response.h5p_id)
      } else {
        setUploadError('Failed to upload H5P package')
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload H5P package')
    } finally {
      setIsUploading(false)
    }
  }, [value.package_file, value.title, value.description, lessonId, onChange, onUploadComplete])

  const handleRemoveFile = useCallback(() => {
    onChange({
      package_id: null,
      package_file: null,
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setUploadError(null)
    setUploadSuccess(false)
  }, [onChange])

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      {existingPackages.length > 0 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('select')}
            disabled={disabled}
          >
            Select from Library
          </Button>
          <Button
            type="button"
            variant={mode === 'upload' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('upload')}
            disabled={disabled}
          >
            Upload New
          </Button>
        </div>
      )}

      {/* Select from Library */}
      {mode === 'select' && existingPackages.length > 0 && (
        <div className="space-y-2">
          <Label>Select H5P Package</Label>
          <Select
            value={value.package_id?.toString() || 'none'}
            onValueChange={handlePackageSelect}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an H5P package" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- No package selected --</SelectItem>
              {existingPackages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id.toString()}>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{pkg.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ({pkg.library_name})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selected Package Info */}
          {selectedPackage && (
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{selectedPackage.title}</p>
                  {selectedPackage.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedPackage.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Library: {selectedPackage.library_name} v{selectedPackage.library_version}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload New Package */}
      {mode === 'upload' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Upload H5P Package</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".h5p"
                onChange={handleFileSelect}
                disabled={disabled || isUploading}
                className="flex-1"
              />
              {value.package_file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  disabled={disabled || isUploading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload an H5P package file (.h5p). Maximum file size: 100MB
            </p>
          </div>

          {/* File Selected Info */}
          {value.package_file && (
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{value.package_file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Size: {(value.package_file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Title Input */}
          {value.package_file && (
            <div className="space-y-2">
              <Label htmlFor="h5p-title">Title (optional)</Label>
              <Input
                id="h5p-title"
                value={value.title || ''}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
                placeholder="Enter a title for this H5P content"
                disabled={disabled || isUploading}
              />
            </div>
          )}

          {/* Upload Button */}
          {value.package_file && lessonId && (
            <Button
              type="button"
              onClick={handleUpload}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Package
                </>
              )}
            </Button>
          )}

          {/* Note about saving lesson first */}
          {value.package_file && !lessonId && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Save the lesson first before uploading the H5P package.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            H5P package uploaded successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* No packages available message */}
      {existingPackages.length === 0 && mode === 'select' && (
        <p className="text-sm text-muted-foreground">
          No H5P packages available. Upload a new package to get started.
        </p>
      )}
    </div>
  )
}

export default H5PEditor
