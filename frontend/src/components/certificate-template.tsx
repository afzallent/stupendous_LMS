"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, Download, Share2, Calendar } from "lucide-react"

interface CertificateTemplateProps {
  studentName: string
  courseTitle: string
  completionDate: string
  certificateId: string
  instructorName: string
}

export function CertificateTemplate({
  studentName,
  courseTitle,
  completionDate,
  certificateId,
  instructorName
}: CertificateTemplateProps) {
  const handleDownload = () => {
    // In a real implementation, this would generate and download a PDF
    alert(`Downloading certificate ${certificateId}`)
  }

  const handleShare = () => {
    // Copy certificate URL to clipboard
    const url = `${window.location.origin}/certificates/${certificateId}`
    navigator.clipboard.writeText(url)
    alert('Certificate link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Certificate of Completion</h1>
          <div className="flex space-x-2">
            <Button onClick={handleShare} variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Certificate */}
        <Card className="bg-white shadow-2xl border-8 border-gradient-to-r from-blue-600 to-purple-600 p-8">
          <CardContent className="text-center space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800">Certificate of Completion</h1>
              <div className="w-32 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded"></div>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <p className="text-lg text-gray-600">This is to certify that</p>
              
              <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 inline-block">
                {studentName}
              </h2>
              
              <p className="text-lg text-gray-600">has successfully completed the course</p>
              
              <h3 className="text-2xl font-semibold text-blue-600">
                {courseTitle}
              </h3>
              
              <div className="flex justify-center items-center space-x-4 text-gray-600">
                <Calendar className="w-5 h-5" />
                <span>Completed on {completionDate}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end pt-8 border-t border-gray-200">
              <div className="text-left">
                <div className="border-b border-gray-400 pb-1 mb-2 w-48">
                  <p className="font-semibold text-gray-800">{instructorName}</p>
                </div>
                <p className="text-sm text-gray-600">Course Instructor</p>
              </div>
              
              <div className="text-right">
                <Badge variant="secondary" className="mb-2">
                  Certificate ID: {certificateId}
                </Badge>
                <p className="text-xs text-gray-500">
                  Verify at: coursecompass.com/verify
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Notice */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            This certificate can be verified at any time using the certificate ID above.
          </p>
        </div>
      </div>
    </div>
  )
}