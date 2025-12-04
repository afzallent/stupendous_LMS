"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Award, 
  Calendar, 
  Download, 
  Share2, 
  AlertCircle,
  Loader2
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Certificate {
  id: string
  certificateId: string
  certificateUrl: string
  issuedAt: string
  course: {
    title: string
    trainer: {
      name: string
    }
  }
}

export default function CertificatesPage() {
  const router = useRouter()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true)
        // Get user from localStorage (in a real app, this would come from auth context)
        const storedUser = localStorage.getItem('user')
        if (!storedUser) {
          setError("Please log in to view your certificates")
          return
        }
        
        const user = JSON.parse(storedUser)
        
        const response = await fetch(`/api/student/certificates?userId=${user.id}`)
        
        if (!response.ok) {
          throw new Error("Failed to fetch certificates")
        }
        
        const data = await response.json()
        setCertificates(data.data)
      } catch (err) {
        setError("Failed to load certificates. Please try again.")
        console.error("Certificates fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCertificates()
  }, [])

  const handleDownload = (certificateId: string) => {
    // In a real implementation, this would trigger the actual PDF download
    alert(`Downloading certificate ${certificateId}`)
  }

  const handleShare = (certificateId: string) => {
    // In a real implementation, this would open sharing options
    alert(`Sharing certificate ${certificateId}`)
  }

  const handleView = (certificateId: string) => {
    router.push(`/certificates/${certificateId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your certificates...</p>
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
            <Button onClick={() => router.push("/profile")}>
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Certificates</h1>
          <p className="text-muted-foreground">
            View and manage all your course completion certificates
          </p>
        </div>

        {certificates.length === 0 ? (
          <Card className="text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No certificates yet</h3>
              <p className="text-muted-foreground mb-6">
                Complete courses to earn certificates and showcase your achievements
              </p>
              <Button onClick={() => router.push("/courses")}>
                Browse Courses
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <Award className="h-8 w-8" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Verified
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg line-clamp-2 mb-2">
                    {certificate.course.title}
                  </h3>
                  <p className="text-sm opacity-90">
                    by {certificate.course.trainer.name}
                  </p>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        Issued on {new Date(certificate.issuedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleView(certificate.certificateId)}
                      >
                        View
                      </Button>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleShare(certificate.certificateId)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownload(certificate.certificateId)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}