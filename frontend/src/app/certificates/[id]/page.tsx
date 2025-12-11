"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CertificateTemplate } from "@/components/certificate-template"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Unwrap the params Promise using React.use()
  const { id } = React.use(params)

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        setLoading(true)
        const { djangoApi } = await import('@/lib/django-api-client')
        const data = await djangoApi.get<any>(`/api/certificates/verify/?certificateId=${id}`)
        
        if (!data.is_valid) {
          setError(data.detail || "Invalid certificate")
          return
        }
        
        setCertificate(data)
      } catch (err) {
        setError("Failed to load certificate. Please try again.")
        console.error("Certificate fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchCertificate()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading certificate...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button onClick={() => router.push("/learn")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Certificate not found
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button onClick={() => router.push("/learn")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <CertificateTemplate
      studentName={certificate.student_name}
      courseTitle={certificate.course_title}
      completionDate={new Date(certificate.issued_at).toLocaleDateString()}
      certificateId={certificate.certificate_id}
      instructorName={certificate.instructor_name}
    />
  )
}