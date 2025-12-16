'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  Upload, 
  FileUp, 
  CheckCircle, 
  Loader2,
  Info,
  X
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface H5PUploadProps {
  lessonId: string
  courseId: string
  onUploadComplete?: (data: H5PUploadResult) => void
  onCancel?: () => void
}

interface H5PUploadResult {
  success: boolean
  h5p_id: number
  library: string
  version: string
  title: string
  message: string
}

interface ValidationError {
  field: string
  message: string
}

/**
 * H5P Upload Component for Instructors
 * 
 * Provides a drag-and-drop interface for uploading H5P packages.
 * Shows validation feedback, upload progress, and library information.
 * 
 * Requirements: 12.1, 12.5
 */
export function H5PUpload({
  lessonId,
  courseId,
  onUploadComplete,
  onCancel
}: H5PUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploadResult, setUploadResult] = useState<H5PUploadResult | null>(null)

  // Handle file selection
  const handleFileChange = (selectedFile: File | null) => {
    setError(null)
    setValidationErrors([])
    setUploadResult(null)

    if (!selectedFile) {
      setFile(null)
      return
    }

    // Validate file type
    if (!selectedFile.name.endsWith('.h5p')) {
      setError('Invalid file type. Please select an H5P package (.h5p file)')
      return
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (selectedFile.size > maxSize) {
      setError(`File is too large. Maximum size is 100MB (file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`)
      return
    }

    setFile(selectedFile)

    // Auto-fill title from filename if not set
    if (!title) {
      const filename = selectedFile.name.replace('.h5p', '')
      setTitle(filename)
    }

    toast({
      title: 'File Selected',
      description: `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`
    })
  }

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }, [])

  // Handle upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select an H5P package file')
      return
    }

    if (!title.trim()) {
      setError('Please provide a title for the H5P content')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)
    setValidationErrors([])

    try {
      // Create form data
      const formData = new FormData()
      formData.append('lesson_id', lessonId)
      formData.append('h5p_package', file)
      formData.append('title', title.trim())
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/h5p/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors
        if (response.status === 400 && data.details) {
          const errors: ValidationError[] = Object.entries(data.details).map(([field, message]) => ({
            field,
            message: String(message)
          }))
          setValidationErrors(errors)
          setError(data.error || 'Validation failed')
        } else {
          setError(data.error || 'Upload failed')
        }
        
        toast({
          title: 'Upload Failed',
          description: data.error || 'Failed to upload H5P package',
          variant: 'destructive'
        })
        return
      }

      // Success
      setUploadResult(data)
      
      toast({
        title: 'Upload Successful!',
        description: `${data.title} has been uploaded successfully`
      })

      if (onUploadComplete) {
        onUploadComplete(data)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred'
      setError(errorMessage)
      
      toast({
        title: 'Upload Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setUploadProgress(0)
    setError(null)
    setValidationErrors([])
    setUploadResult(null)
  }

  // If upload is complete, show success message
  if (uploadResult) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle>Upload Successful!</CardTitle>
          </div>
          <CardDescription>
            Your H5P content has been uploaded and is ready to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Title:</span>
              <span className="text-sm">{uploadResult.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Library:</span>
              <Badge variant="secondary">{uploadResult.library}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Version:</span>
              <span className="text-sm">{uploadResult.version}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Upload Another
            </Button>
            {onCancel && (
              <Button onClick={onCancel} className="flex-1">
                Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload H5P Package</CardTitle>
        <CardDescription>
          Upload an H5P interactive content package (.h5p file)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drag and Drop Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${file ? 'bg-muted/50' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <FileUp className="h-12 w-12 text-primary" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFileChange(null)}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <Upload className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Drag and drop your H5P file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <Input
                type="file"
                accept=".h5p"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                id="h5p-file-input"
                disabled={uploading}
              />
              <Label htmlFor="h5p-file-input">
                <Button variant="outline" asChild disabled={uploading}>
                  <span className="cursor-pointer">
                    Browse Files
                  </span>
                </Button>
              </Label>
            </div>
          )}
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for this H5P content"
            disabled={uploading}
            maxLength={255}
          />
          <p className="text-xs text-muted-foreground">
            This will be displayed to students
          </p>
        </div>

        {/* Description Input */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this H5P content"
            disabled={uploading}
            rows={3}
          />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Validation Errors:</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="text-sm">
                    <strong>{err.field}:</strong> {err.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* General Error */}
        {error && !validationErrors.length && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            <p><strong>Supported file format:</strong> .h5p</p>
            <p><strong>Maximum file size:</strong> 100MB</p>
            <p><strong>Note:</strong> The H5P package will be validated before upload</p>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!file || !title.trim() || uploading}
            className="flex-1 gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload H5P Package
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
