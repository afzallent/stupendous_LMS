"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  Info
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { djangoApi } from "@/lib/django-api-client"

export default function ImportExportPage() {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const accessToken = djangoApi.getAccessToken()
      console.log('🔐 Import/Export page - checking auth, hasToken:', !!accessToken)
      
      if (!accessToken) {
        console.warn('⚠️ No access token found, redirecting to login')
        toast({
          title: "Authentication Required",
          description: "Please log in to access this page.",
          variant: "destructive"
        })
        router.push('/auth/login')
        return
      }
      
      setIsAuthenticated(true)
    }
    
    checkAuth()
  }, [router])

  // Don't render until authentication is verified
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      // Check if user is authenticated
      const accessToken = djangoApi.getAccessToken()
      if (!accessToken) {
        toast({
          title: "Authentication Required",
          description: "Please log in to export courses.",
          variant: "destructive"
        })
        router.push('/auth/login')
        return
      }

      // Use djangoApi.downloadBlob for automatic token refresh handling
      const blob = await djangoApi.downloadBlob('/api/courses/export_csv/')

      // Download the CSV file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `courses_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export Successful",
        description: "Your courses have been exported to CSV.",
      })
    } catch (error: any) {
      console.error('Export error:', error)
      
      // Handle authentication errors
      if (error.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive"
        })
        router.push('/auth/login')
        return
      }
      
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export courses",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file.",
          variant: "destructive"
        })
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsImporting(true)
      
      // Check if user is authenticated
      const accessToken = djangoApi.getAccessToken()
      if (!accessToken) {
        toast({
          title: "Authentication Required",
          description: "Please log in to import courses.",
          variant: "destructive"
        })
        router.push('/auth/login')
        return
      }

      const formData = new FormData()
      formData.append('file', selectedFile)

      // Use djangoApi.upload for automatic token refresh handling
      const data = await djangoApi.upload<any>('/api/courses/import_csv/', formData)

      console.log('📊 Import result:', data)
      console.log('❌ Errors:', data.errors)
      
      setImportResult(data)
      setSelectedFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      toast({
        title: data.errors && data.errors.length > 0 ? "Import Completed with Errors" : "Import Successful",
        description: `Created ${data.courses_created} courses, updated ${data.courses_updated} courses, ${data.chapters_created || 0} chapters, and ${data.lessons_created} lessons.${data.errors && data.errors.length > 0 ? ` ${data.errors.length} errors occurred.` : ''}`,
        variant: data.errors && data.errors.length > 0 ? "destructive" : "default"
      })
    } catch (error: any) {
      console.error('Import error:', error)
      
      // Handle authentication errors
      if (error.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive"
        })
        router.push('/auth/login')
        return
      }
      
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import courses",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/instructor')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Course Import/Export</h1>
          <p className="text-gray-600 mt-2">
            Export your courses to CSV or import courses from a CSV file
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>CSV Format:</strong> The CSV should include columns: Course ID, Course Title, Course Description, 
            Level, Price, Is Free, Status, Chapter Title, Chapter Order, Lesson Order, Lesson Title, Video URL, Lesson Content.
            Export your existing courses to see the format.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Export Courses</CardTitle>
                  <CardDescription>Download your courses as CSV</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 text-sm text-gray-600">
                  <FileSpreadsheet className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">What's included:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All your courses</li>
                      <li>Course details (title, description, price)</li>
                      <li>All lessons with video URLs</li>
                      <li>Lesson content and order</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export to CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Import Courses</CardTitle>
                  <CardDescription>Upload courses from CSV file</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3 text-sm text-gray-600">
                  <Info className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Import behavior:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Creates new courses if Course ID is empty</li>
                      <li>Updates existing courses if Course ID matches</li>
                      <li>Creates chapters and organizes lessons</li>
                      <li>Validates level (Beginner/Intermediate/Advanced)</li>
                      <li>Preserves chapter and lesson order</li>
                      <li>Shows detailed errors for invalid rows</li>
                    </ul>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-3" />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedFile ? selectedFile.name : 'Click to select CSV file'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      or drag and drop
                    </span>
                  </label>
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || isImporting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import from CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Result */}
        {importResult && (
          <Card className="mt-6 border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <CardTitle className="text-xl">Import Complete</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {importResult.courses_created}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Courses Created</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    {importResult.courses_updated}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Courses Updated</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">
                    {importResult.chapters_created || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Chapters Created</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {importResult.lessons_created}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Lessons Added</div>
                </div>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">Errors ({importResult.errors.length}):</h4>
                  <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.errors.map((error: string, idx: number) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => router.push('/instructor')}
                  variant="outline"
                >
                  View Courses
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CSV Format Example */}
        <Card className="mt-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">CSV Format Example</CardTitle>
            <CardDescription>
              Here's an example of how your CSV should be structured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs text-gray-700">
{`Course ID,Course Title,Course Description,Level,Price,Is Free,Status,Chapter Title,Chapter Order,Lesson Order,Lesson Title,Video URL,Lesson Content
,Python Basics,Learn Python programming,Beginner,49.99,No,published,Introduction,1,1,Welcome to Python,https://youtube.com/watch?v=xxx,Welcome content
,Python Basics,Learn Python programming,Beginner,49.99,No,published,Introduction,1,2,Setup Environment,https://youtube.com/watch?v=yyy,Setup guide
,Python Basics,Learn Python programming,Beginner,49.99,No,published,Advanced Topics,2,1,Functions,https://youtube.com/watch?v=zzz,Learn functions
,Web Development,Build modern websites,Intermediate,0,Yes,draft,HTML Basics,1,1,Introduction to HTML,https://youtube.com/watch?v=aaa,HTML intro`}
              </pre>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              <strong>Note:</strong> Leave Course ID empty for new courses. For existing courses, 
              include the Course ID to update them. Chapter Title is optional - lessons without a chapter will be unassigned. 
              Level must be: Beginner, Intermediate, or Advanced.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
