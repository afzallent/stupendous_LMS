"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, Download, Share2, Calendar, Loader2 } from "lucide-react"
import { useBrand } from "@/lib/branding"

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
  const brand = useBrand()
  const certificateRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to download the certificate')
        setIsDownloading(false)
        return
      }

      const verifyUrl = `${window.location.host}/certificates/${certificateId}`
      
      // Write the certificate HTML to the new window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate - ${studentName}</title>
          <style>
            @page {
              size: landscape;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .certificate {
              background: white;
              width: 1000px;
              padding: 60px;
              border: 8px solid #4f46e5;
              border-radius: 8px;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
              text-align: center;
            }
            .award-icon {
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
              border-radius: 50%;
              margin: 0 auto 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 40px;
            }
            .issuer {
              font-size: 18px;
              letter-spacing: 3px;
              text-transform: uppercase;
              color: #4f46e5;
              margin-bottom: 10px;
            }
            .issuer img {
              height: 28px;
              vertical-align: middle;
              margin-right: 8px;
            }
            .title {
              font-size: 36px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 10px;
            }
            .divider {
              width: 120px;
              height: 4px;
              background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
              margin: 20px auto;
              border-radius: 2px;
            }
            .subtitle {
              font-size: 18px;
              color: #6b7280;
              margin: 20px 0;
            }
            .student-name {
              font-size: 32px;
              font-weight: bold;
              color: #1f2937;
              border-bottom: 2px solid #d1d5db;
              padding-bottom: 8px;
              display: inline-block;
              margin: 10px 0;
            }
            .course-title {
              font-size: 24px;
              font-weight: 600;
              color: #4f46e5;
              margin: 20px 0;
            }
            .date {
              font-size: 16px;
              color: #6b7280;
              margin: 20px 0;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 40px;
              padding-top: 30px;
              border-top: 1px solid #e5e7eb;
            }
            .instructor {
              text-align: left;
            }
            .instructor-name {
              font-weight: 600;
              color: #1f2937;
              border-bottom: 1px solid #9ca3af;
              padding-bottom: 4px;
              margin-bottom: 8px;
              min-width: 200px;
            }
            .instructor-label {
              font-size: 14px;
              color: #6b7280;
            }
            .verification {
              text-align: right;
            }
            .cert-id {
              background: #f3f4f6;
              padding: 6px 12px;
              border-radius: 4px;
              font-size: 12px;
              color: #374151;
              margin-bottom: 8px;
              display: inline-block;
            }
            .verify-url {
              font-size: 11px;
              color: #9ca3af;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .certificate {
                box-shadow: none;
                border: 8px solid #4f46e5;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="award-icon">🏆</div>
            ${brand.logoUrl ? `<div class="issuer"><img src="${brand.logoUrl}" alt="" /></div>` : ""}
            <div class="issuer">${brand.name}</div>
            <h1 class="title">Certificate of Completion</h1>
            <div class="divider"></div>
            <p class="subtitle">This is to certify that</p>
            <h2 class="student-name">${studentName}</h2>
            <p class="subtitle">has successfully completed the course</p>
            <h3 class="course-title">${courseTitle}</h3>
            <p class="date">📅 Completed on ${completionDate}</p>
            <div class="footer">
              <div class="instructor">
                <div class="instructor-name">${instructorName}</div>
                <div class="instructor-label">Course Instructor</div>
              </div>
              <div class="verification">
                <div class="cert-id">Certificate ID: ${certificateId}</div>
                <div class="verify-url">Issued by ${brand.name}</div>
                <div class="verify-url">Verify at: ${verifyUrl}</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `)
      
      printWindow.document.close()
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          setIsDownloading(false)
        }, 250)
      }
      
      // Fallback if onload doesn't fire
      setTimeout(() => {
        setIsDownloading(false)
      }, 3000)
      
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to generate PDF. Please try again.')
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/certificates/${certificateId}`
    
    try {
      await navigator.clipboard.writeText(url)
      alert('Certificate link copied to clipboard!')
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Certificate link copied to clipboard!')
    }
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
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
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
              <p className="text-sm uppercase tracking-widest text-blue-600">{brand.name}</p>
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
                  Issued by {brand.name}
                </p>
                <p className="text-xs text-gray-500">
                  Verify at: {typeof window !== 'undefined' ? window.location.host : 'learn.5stars.dev'}/certificates/{certificateId}
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