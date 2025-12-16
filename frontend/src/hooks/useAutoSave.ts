'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface AutoSaveOptions<T> {
  /** Data to be saved */
  data: T
  /** Function to save the data */
  onSave: (data: T) => Promise<void>
  /** Debounce delay in milliseconds (default: 3000ms) */
  delay?: number
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean
  /** Callback when save status changes */
  onStatusChange?: (status: SaveStatus) => void
  /** Callback when save error occurs */
  onError?: (error: Error) => void
}

export interface AutoSaveResult {
  /** Current save status */
  status: SaveStatus
  /** Last saved timestamp */
  lastSaved: Date | null
  /** Error message if save failed */
  error: string | null
  /** Manually trigger save */
  saveNow: () => Promise<void>
  /** Mark data as changed (triggers auto-save) */
  markChanged: () => void
  /** Reset status to idle */
  reset: () => void
}

/**
 * Custom hook for auto-save functionality with debouncing
 * 
 * Features:
 * - Debounced save after specified delay of inactivity (default: 3 seconds)
 * - "Saving..." and "All changes saved" status indicators
 * - Error handling with retry capability
 * 
 * Requirements: 11.1, 11.2, 11.3
 * 
 * @example
 * ```tsx
 * const { status, lastSaved, saveNow } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => {
 *     await api.updateCourse(courseId, data)
 *   },
 *   delay: 3000,
 * })
 * ```
 */
export function useAutoSave<T>({
  data,
  onSave,
  delay = 3000,
  enabled = true,
  onStatusChange,
  onError,
}: AutoSaveOptions<T>): AutoSaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Refs to track state without triggering re-renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dataRef = useRef<T>(data)
  const lastSavedDataRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Update status and notify
  const updateStatus = useCallback((newStatus: SaveStatus) => {
    if (!isMountedRef.current) return
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  // Perform the actual save
  const performSave = useCallback(async () => {
    const currentData = dataRef.current
    const serializedData = JSON.stringify(currentData)
    
    // Skip if data hasn't changed since last save
    if (serializedData === lastSavedDataRef.current) {
      return
    }

    try {
      updateStatus('saving')
      setError(null)
      
      await onSave(currentData)
      
      if (isMountedRef.current) {
        lastSavedDataRef.current = serializedData
        setLastSaved(new Date())
        updateStatus('saved')
        
        // Reset to idle after a short delay
        setTimeout(() => {
          if (isMountedRef.current) {
            updateStatus('idle')
          }
        }, 2000)
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save'
        setError(errorMessage)
        updateStatus('error')
        onError?.(err instanceof Error ? err : new Error(errorMessage))
      }
    }
  }, [onSave, updateStatus, onError])

  // Schedule a debounced save
  const scheduleSave = useCallback(() => {
    if (!enabled) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set pending status
    updateStatus('pending')

    // Schedule new save
    timeoutRef.current = setTimeout(() => {
      performSave()
    }, delay)
  }, [enabled, delay, performSave, updateStatus])

  // Watch for data changes and trigger auto-save
  useEffect(() => {
    if (!enabled) return

    const serializedData = JSON.stringify(data)
    
    // Skip if this is the initial render or data hasn't changed
    if (lastSavedDataRef.current === null) {
      lastSavedDataRef.current = serializedData
      return
    }

    if (serializedData !== lastSavedDataRef.current) {
      scheduleSave()
    }
  }, [data, enabled, scheduleSave])

  // Manual save function
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    await performSave()
  }, [performSave])

  // Mark data as changed (useful for external triggers)
  const markChanged = useCallback(() => {
    scheduleSave()
  }, [scheduleSave])

  // Reset status
  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    updateStatus('idle')
    setError(null)
  }, [updateStatus])

  return {
    status,
    lastSaved,
    error,
    saveNow,
    markChanged,
    reset,
  }
}

export default useAutoSave
