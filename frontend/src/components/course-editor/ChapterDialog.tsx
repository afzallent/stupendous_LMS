'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Chapter, ChapterInput } from './types'
import { ValidatedInput, ValidatedTextarea } from './ValidatedInput'
import { validateChapter, getFieldError, ValidationError } from '@/lib/course-validation'

interface ChapterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chapter?: Chapter | null
  chapters: Chapter[]
  courseId: number
  onSave: (data: ChapterInput) => Promise<void>
  isLoading?: boolean
}

/**
 * ChapterDialog component for creating and editing chapters
 * 
 * Requirements: 3.1, 3.3, 6.1, 6.2
 */
export function ChapterDialog({
  open,
  onOpenChange,
  chapter,
  chapters,
  courseId,
  onSave,
  isLoading = false,
}: ChapterDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [prerequisiteChapterId, setPrerequisiteChapterId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  const isEditing = !!chapter

  // Reset form when dialog opens/closes or chapter changes
  useEffect(() => {
    if (open) {
      if (chapter) {
        setTitle(chapter.title)
        setDescription(chapter.description || '')
        setIsLocked(chapter.is_locked)
        setPrerequisiteChapterId(chapter.prerequisite_chapter_id?.toString() || '')
      } else {
        setTitle('')
        setDescription('')
        setIsLocked(false)
        setPrerequisiteChapterId('')
      }
      setError(null)
      setValidationErrors([])
    }
  }, [open, chapter])

  // Filter out current chapter from prerequisite options
  const availablePrerequisites = chapters.filter(
    (c) => !chapter || c.id !== chapter.id
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors([])

    // Validate fields - Requirements: 11.4
    const validation = validateChapter({ title, description })
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    try {
      // When unlocking, always clear the prerequisite - Requirements: 6.5
      const data: ChapterInput = {
        course: courseId,
        title: title.trim(),
        description: description.trim() || undefined,
        is_locked: isLocked,
        prerequisite_chapter: isLocked && prerequisiteChapterId ? parseInt(prerequisiteChapterId) : null,
      }

      await onSave(data)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Failed to save chapter')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Chapter' : 'Add Chapter'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the chapter details below.'
                : 'Create a new chapter to organize your lessons.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title - Requirements: 3.1, 11.4 */}
            <ValidatedInput
              id="title"
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to the Course"
              disabled={isLoading}
              error={getFieldError(validationErrors, 'title')}
            />

            {/* Description - Requirements: 3.1 */}
            <ValidatedTextarea
              id="description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this chapter covers..."
              rows={3}
              disabled={isLoading}
              helpText="Optional: Brief description of what this chapter covers"
            />

            {/* Lock Settings - Requirements: 6.1, 6.2, 6.5 */}
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-locked">Lock Chapter</Label>
                  <p className="text-xs text-muted-foreground">
                    Require students to complete a prerequisite chapter first
                  </p>
                </div>
                <Switch
                  id="is-locked"
                  checked={isLocked}
                  onCheckedChange={(checked) => {
                    setIsLocked(checked)
                    // Clear prerequisite when unlocking - Requirements: 6.5
                    if (!checked) {
                      setPrerequisiteChapterId('')
                    }
                  }}
                  disabled={isLoading}
                />
              </div>

              {isLocked && availablePrerequisites.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="prerequisite">Prerequisite Chapter</Label>
                  <Select
                    value={prerequisiteChapterId}
                    onValueChange={setPrerequisiteChapterId}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="prerequisite">
                      <SelectValue placeholder="Select a chapter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrerequisites.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isLocked && availablePrerequisites.length === 0 && (
                <p className="text-xs text-amber-600">
                  No other chapters available to set as prerequisite.
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Chapter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ChapterDialog
