'use client'

import { forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label?: string
  /** Error message to display */
  error?: string
  /** Whether the field is required */
  required?: boolean
  /** Help text to display below the input */
  helpText?: string
}

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label */
  label?: string
  /** Error message to display */
  error?: string
  /** Whether the field is required */
  required?: boolean
  /** Help text to display below the input */
  helpText?: string
}

/**
 * ValidatedInput component with error highlighting
 * 
 * Features:
 * - Highlights invalid fields with red border
 * - Displays error message below the input
 * - Shows required indicator
 * 
 * Requirements: 11.4
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, required, helpText, className, id, ...props }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`
    const hasError = !!error

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn(hasError && 'text-destructive')}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...props}
        />
        {hasError && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        {!hasError && helpText && (
          <p className="text-sm text-muted-foreground">{helpText}</p>
        )}
      </div>
    )
  }
)

ValidatedInput.displayName = 'ValidatedInput'

/**
 * ValidatedTextarea component with error highlighting
 * 
 * Features:
 * - Highlights invalid fields with red border
 * - Displays error message below the textarea
 * - Shows required indicator
 * 
 * Requirements: 11.4
 */
export const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({ label, error, required, helpText, className, id, ...props }, ref) => {
    const inputId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`
    const hasError = !!error

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn(hasError && 'text-destructive')}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Textarea
          ref={ref}
          id={inputId}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          {...props}
        />
        {hasError && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        {!hasError && helpText && (
          <p className="text-sm text-muted-foreground">{helpText}</p>
        )}
      </div>
    )
  }
)

ValidatedTextarea.displayName = 'ValidatedTextarea'

export default ValidatedInput
