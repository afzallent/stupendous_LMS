"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  Share2, 
  CheckCircle, 
  Calendar,
  Award
} from "lucide-react"

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
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = () => {
    setIsDownloading(true)
    // In a real implementation, this would trigger the actual PDF download
    setTimeout(() => {
      setIsDownloading(false)
      alert("Certificate downloaded successfully!")
    }, 1500)
  }

  const handleShare = () => {
    // In a real implementation, this would open sharing options
    alert("Share functionality would open here")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <Card className="border-0 shadow-2xl bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            {/* Certificate Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white">
              <div className="flex items-center justify-center mb-4">
                <Award className="h-12 w-12 mr-3" />
                <h1 className="text-4xl font-bold">CourseCompass</h1>
              </div>
              <p className="text-xl opacity-90">Certificate of Completion</p>
            </div>

            {/* Certificate Body */}
            <div className="p-12 text-center">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-600 mb-2">
                  This is to certify that
                </h2>
                <h3 className="text-4xl font-bold text-blue-600 mb-6">
                  {studentName}
                </h3>
                <p className="text-xl text-gray-600 mb-2">
                  has successfully completed the course
                </p>
                <h4 className="text-3xl font-bold text-gray-900 my-8 px-4 py-6 bg-blue-50 rounded-lg border border-blue-100">
                  {courseTitle}
                </h4>
                <div className="flex items-center justify-center space-x-8 mt-8">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-gray-600">Issued on: {completionDate}</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-gray-600">Verified</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 pt-8 border-t">
                <div>
                  <p className="text-gray-600 mb-2">Instructor</p>
                  <p className="text-lg font-semibold">{instructorName}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-2">Certificate ID</p>
                  <Badge variant="secondary" className="text-base py-2 px-4">
                    {certificateId}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Certificate Footer */}
            <div className="bg-gray-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span>Verified by CourseCompass</span>
              </div>
              <div className="flex space-x-3">
                <Button 
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? "Downloading..." : "Download"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}