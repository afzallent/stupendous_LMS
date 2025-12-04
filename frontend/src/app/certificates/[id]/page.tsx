"use client"

import { useState, useEffect } from "react"
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
        const response = await fetch(`/api/certificates/verify?certificateId=${id}`)
        
        if (!response.ok) {
          throw new Error("Failed to fetch certificate")
        }
        
        const data = await response.json()
        
        if (!data.valid) {
          setError(data.error || "Invalid certificate")
          return
        }
        
        setCertificate(data.certificate)
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
      studentName={certificate.studentName}
      courseTitle={certificate.courseTitle}
      completionDate={new Date(certificate.issuedAt).toLocaleDateString()}
      certificateId={certificate.id}
      instructorName="Course Instructor" // In a real implementation, this would come from the API
    />
  )
}