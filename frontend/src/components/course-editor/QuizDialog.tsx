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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Quiz } from './types'

interface QuizDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quiz: Quiz | null
  courseId: number
  chapterId: number | null
  onSave: (data: Partial<Quiz>) => Promise<void>
  isLoading?: boolean
}

/**
 * QuizDialog component for creating and editing quizzes
 * Includes fields for title, passing score, time limit, max attempts
 * 
 * Requirements: 5.2
 */
export function QuizDialog({
  open,
  onOpenChange,
  quiz,
  courseId,
  chapterId,
  onSave,
  isLoading = false,
}: QuizDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [timeLimit, setTimeLimit] = useState<number | null>(null)
  const [hasTimeLimit, setHasTimeLimit] = useState(false)
  const [maxAttempts, setMaxAttempts] = useState(3)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens/closes or quiz changes
  useEffect(() => {
    if (open) {
      if (quiz) {
        // Editing existing quiz
        setTitle(quiz.title)
        setDescription(quiz.description || '')
        setPassingScore(quiz.passing_score)
        setTimeLimit(quiz.time_limit)
        setHasTimeLimit(quiz.time_limit !== null)
        setMaxAttempts(quiz.max_attempts)
        setIsActive(quiz.is_active)
      } else {
        // Creating new quiz
        setTitle('')
        setDescription('')
        setPassingScore(70)
        setTimeLimit(null)
        setHasTimeLimit(false)
        setMaxAttempts(3)
        setIsActive(false)
      }
      setError(null)
    }
  }, [open, quiz])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (passingScore < 0 || passingScore > 100) {
      setError('Passing score must be between 0 and 100')
      return
    }

    if (maxAttempts < 1) {
      setError('Max attempts must be at least 1')
      return
    }

    if (hasTimeLimit && (timeLimit === null || timeLimit < 1)) {
      setError('Time limit must be at least 1 minute')
      return
    }

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        passing_score: passingScore,
        time_limit: hasTimeLimit ? timeLimit : null,
        max_attempts: maxAttempts,
        is_active: isActive,
        course_id: courseId,
        chapter_id: chapterId,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz')
    }
  }

  const isEditing = quiz !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the quiz settings below.'
                : 'Create a new quiz for this chapter. You can add questions after creating the quiz.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 1 Assessment"
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for the quiz"
                rows={2}
                disabled={isLoading}
              />
            </div>

            {/* Passing Score - Requirements: 5.2 */}
            <div className="grid gap-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Students must score at least this percentage to pass
              </p>
            </div>

            {/* Time Limit - Requirements: 5.2 */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="timeLimit">Time Limit</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="hasTimeLimit"
                    checked={hasTimeLimit}
                    onCheckedChange={(checked) => {
                      setHasTimeLimit(checked)
                      if (checked && timeLimit === null) {
                        setTimeLimit(30)
                      }
                    }}
                    disabled={isLoading}
                  />
                  <span className="text-sm text-muted-foreground">
                    {hasTimeLimit ? 'Enabled' : 'No limit'}
                  </span>
                </div>
              </div>
              {hasTimeLimit && (
                <div className="flex items-center gap-2">
                  <Input
                    id="timeLimit"
                    type="number"
                    min={1}
                    value={timeLimit || ''}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value) || null)}
                    disabled={isLoading}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              )}
            </div>

            {/* Max Attempts - Requirements: 5.2 */}
            <div className="grid gap-2">
              <Label htmlFor="maxAttempts">Maximum Attempts</Label>
              <Input
                id="maxAttempts"
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                disabled={isLoading}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Number of times a student can attempt this quiz
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Only active quizzes are visible to students
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isLoading}
              />
            </div>

            {/* Error Message */}
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
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Quiz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default QuizDialog
