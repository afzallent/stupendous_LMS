'use client'

import { SaveStatus } from '@/hooks/useAutoSave'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SaveStatusIndicatorProps {
  /** Current save status */
  status: SaveStatus
  /** Last saved timestamp */
  lastSaved: Date | null
  /** Error message if save failed */
  error?: string | null
  /** Additional CSS classes */
  className?: string
  /** Whether to show timestamp */
  showTimestamp?: boolean
}

/**
 * SaveStatusIndicator component displays the current save status
 * 
 * Features:
 * - "Saving..." indicator when save is in progress
 * - "All changes saved" with timestamp when save completes
 * - Error indicator when save fails
 * 
 * Requirements: 11.2, 11.3
 */
export function SaveStatusIndicator({
  status,
  lastSaved,
  error,
  className,
  showTimestamp = true,
}: SaveStatusIndicatorProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Don't show anything when idle and never saved
  if (status === 'idle' && !lastSaved) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Pending status - changes detected, waiting to save */}
      {status === 'pending' && (
        <Badge variant="secondary" className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Unsaved changes</span>
        </Badge>
      )}

      {/* Saving status */}
      {status === 'saving' && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </Badge>
      )}

      {/* Saved status */}
      {(status === 'saved' || status === 'idle') && lastSaved && (
        <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-200 bg-green-50">
          <Check className="h-3 w-3" />
          <span>All changes saved</span>
          {showTimestamp && (
            <span className="text-muted-foreground ml-1">
              at {formatTime(lastSaved)}
            </span>
          )}
        </Badge>
      )}

      {/* Error status */}
      {status === 'error' && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>{error || 'Failed to save'}</span>
        </Badge>
      )}
    </div>
  )
}

export default SaveStatusIndicator
