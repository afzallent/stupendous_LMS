'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Redirect page: /instructor/courses/[id] -> /instructor/courses/[id]/edit
 * 
 * This page exists for backward compatibility. The old course detail page
 * has been replaced by the new Course Editor at /instructor/courses/[id]/edit.
 * 
 * Requirements: 2.5, 13.4
 */
export default function InstructorCourseRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string

  useEffect(() => {
    // Redirect to the new Course Editor page
    router.replace(`/instructor/courses/${courseId}/edit`)
  }, [courseId, router])

  // Show a brief loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to Course Editor...</p>
      </div>
    </div>
  )
}
