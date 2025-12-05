"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BookOpen, 
  ArrowLeft, 
  Upload, 
  Plus, 
  X, 
  Save, 
  Eye, 
  Settings,
  DollarSign,
  Users,
  Clock,
  Target,
  FileText,
  Video,
  CheckCircle
} from "lucide-react"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { XLVILoader } from "@/components/ui/xlvi-loader"

function CreateCoursePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editCourseId = searchParams.get('edit')
  const isEditMode = Boolean(editCourseId)
  
  const [currentStep, setCurrentStep] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [courseId, setCourseId] = useState<string | null>(editCourseId)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingCourseData, setLoadingCourseData] = useState(isEditMode)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState<Record<string, boolean>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [courseData, setCourseData] = useState({
    title: "",
    subtitle: "",
    description: "",
    category: "",
    level: "",
    language: "English",
    price: "",
    thumbnail: null as File | null,
    learningObjectives: [""],
    requirements: [""],
    targetAudience: ""
  })

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      // Redirect to login if no user
      router.push('/auth/login')
    }
  }, [])

  // Load existing course data when in edit mode
  useEffect(() => {
    console.log('Edit mode effect:', { isEditMode, editCourseId, userId: user?.id })
    if (isEditMode && editCourseId && user?.id) {
      console.log('Loading course data for:', editCourseId)
      loadCourseData(editCourseId)
    }
  }, [isEditMode, editCourseId, user?.id])

  const loadCourseData = async (courseId: string) => {
    try {
      setLoadingCourseData(true)
      console.log('Fetching course data:', `/api/instructor/courses/${courseId}?instructorId=${user.id}`)
      const response = await fetch(`/api/instructor/courses/${courseId}?instructorId=${user.id}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Course data received:', data)
        const course = data.data
        
        // Update course data
        setCourseData({
          title: course.title || '',
          subtitle: course.subtitle || '',
          description: course.description || '',
          category: course.category?.name || '',
          level: course.level || '',
          language: course.language || 'English',
          price: course.price?.toString() || '',
          thumbnail: null, // Will be handled separately
          learningObjectives: course.learningObjectives || [''],
          requirements: course.requirements || [''],
          targetAudience: course.targetAudience || ''
        })
        
        // Update chapters and lessons if available
        if (course.chapters && course.chapters.length > 0) {
          const formattedChapters = course.chapters.map((chapter: any, chapterIndex: number) => ({
            id: chapter.id || (chapterIndex + 1).toString(),
            title: chapter.title || '',
            lessons: chapter.lessons?.map((lesson: any, lessonIndex: number) => ({
              id: lesson.id || `${chapterIndex + 1}-${lessonIndex + 1}`,
              title: lesson.title || '',
              description: lesson.description || '',
              videoFile: null,
              videoUrl: lesson.videoUrl || '',
              duration: lesson.duration?.toString() || '',
              resources: lesson.resources || []
            })) || [{
              id: `${chapterIndex + 1}-1`,
              title: '',
              description: '',
              videoFile: null,
              videoUrl: '',
              duration: '',
              resources: []
            }]
          }))
          setChapters(formattedChapters)
        }
      } else {
        console.error('Failed to load course data:', response.status, response.statusText)
        const errorData = await response.text()
        console.error('Error details:', errorData)
        alert('Failed to load course data. Please try again.')
      }
    } catch (error) {
      console.error('Error loading course data:', error)
      alert('Error loading course data. Please try again.')
    } finally {
      setLoadingCourseData(false)
    }
  }

  const [chapters, setChapters] = useState([
    {
      id: "1",
      title: "",
      lessons: [
        {
          id: "1-1",
          title: "",
          description: "",
          videoFile: null as File | null,
          videoUrl: "",
          duration: "",
          resources: []
        }
      ]
    }
  ])

  const categories = [
    "Web Development",
    "Data Science", 
    "Design",
    "Business",
    "Marketing",
    "Photography",
    "Music",
    "Health & Fitness"
  ]

  const levels = ["Beginner", "Intermediate", "Advanced"]

  const handleInputChange = (field: string, value: string) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayInputChange = (field: "learningObjectives" | "requirements", index: number, value: string) => {
    setCourseData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field: "learningObjectives" | "requirements") => {
    setCourseData(prev => ({
      ...prev,
      [field]: [...prev[field], ""]
    }))
  }

  const removeArrayItem = (field: "learningObjectives" | "requirements", index: number) => {
    setCourseData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const addChapter = () => {
    const newChapter = {
      id: (chapters.length + 1).toString(),
      title: "",
      lessons: [
        {
          id: `${chapters.length + 1}-1`,
          title: "",
          description: "",
          videoFile: null as File | null,
          videoUrl: "",
          duration: "",
          resources: []
        }
      ]
    }
    setChapters([...chapters, newChapter])
  }

  const addLesson = (chapterIndex: number) => {
    const updatedChapters = [...chapters]
    const chapterLessons = updatedChapters[chapterIndex].lessons
    const newLesson = {
      id: `${chapterIndex + 1}-${chapterLessons.length + 1}`,
      title: "",
      description: "",
      videoFile: null as File | null,
      videoUrl: "",
      duration: "",
      resources: []
    }
    updatedChapters[chapterIndex].lessons.push(newLesson)
    setChapters(updatedChapters)
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, or WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Thumbnail size must be less than 5MB')
      return
    }

    // First ensure course is saved as draft
    if (!courseId) {
      alert('Please save your course as draft first before uploading thumbnail')
      return
    }

    setUploadingThumbnail(true)
    
    try {
      const formData = new FormData()
      formData.append('thumbnail', file)

      // Upload to Django backend
      const result = await djangoApi.upload(`/api/courses/${courseId}/upload-thumbnail/`, formData)

      setCourseData(prev => ({ ...prev, thumbnail: file }))
      toast({
        title: "Success",
        description: "Thumbnail uploaded successfully!"
      })
    } catch (error: any) {
      console.error('Thumbnail upload error:', error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload thumbnail. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploadingThumbnail(false)
      // Clear the file input
      e.target.value = ''
    }
  }

  const handleVideoUpload = async (chapterIndex: number, lessonIndex: number, file: File) => {
    if (!file) return

    // Validate file type and size
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid video file (MP4, WebM, or QuickTime)')
      return
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB limit
      alert('Video size must be less than 500MB')
      return
    }

    const lesson = chapters[chapterIndex].lessons[lessonIndex]
    if (!lesson.id) {
      alert('Please save the lesson first before uploading video')
      return
    }

    const uploadKey = `${chapterIndex}-${lessonIndex}`
    setUploadingVideos(prev => ({ ...prev, [uploadKey]: true }))
    setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }))
    
    try {
      const formData = new FormData()
      formData.append('video', file)

      // Upload to Django backend - lesson must exist first
      if (!lesson.id) {
        throw new Error('Lesson must be saved before uploading video')
      }

      const result = await djangoApi.upload(`/api/lessons/${lesson.id}/upload-video/`, formData)

      // Update lesson with video file
      const updatedChapters = [...chapters]
      updatedChapters[chapterIndex].lessons[lessonIndex].videoFile = file
      setChapters(updatedChapters)
      
      toast({
        title: "Success",
        description: "Video uploaded successfully!"
      })
    } catch (error: any) {
      console.error('Video upload error:', error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload video. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploadingVideos(prev => ({ ...prev, [uploadKey]: false }))
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }))
    }
  }

  const handleSaveDraft = async () => {
    if (!user?.id) {
      alert("Please log in to save your course")
      return
    }

    setIsLoading(true)
    try {
      const draftData = {
        id: courseId,
        title: courseData.title,
        subtitle: courseData.subtitle,
        description: courseData.description,
        category: courseData.category,
        level: courseData.level.toUpperCase(),
        language: courseData.language,
        price: parseFloat(courseData.price) || 0,
        trainerId: user.id,
        learningObjectives: courseData.learningObjectives.filter(obj => obj.trim()),
        requirements: courseData.requirements.filter(req => req.trim()),
        targetAudience: courseData.targetAudience,
        chapters: chapters.map((chapter, chapterIndex) => ({
          id: chapter.id,
          title: chapter.title,
          order: chapterIndex + 1,
          lessons: chapter.lessons.map((lesson, lessonIndex) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            order: lessonIndex + 1,
            duration: lesson.duration ? parseInt(lesson.duration) : undefined,
            videoUrl: lesson.videoFile ? undefined : lesson.videoUrl, // Handle file upload separately
            content: lesson.description,
            isPreview: false
          }))
        }))
      }

      // Create course in Django (no separate draft status in current Django model)
      const result = await djangoApi.post('/api/courses/', draftData)

      setCourseId(result.id)
      toast({
        title: "Success",
        description: "Course saved successfully!"
      })
    } catch (error) {
      console.error("Error saving draft:", error)
      alert("Failed to save draft. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishCourse = async () => {
    if (!user?.id) {
      alert("Please log in to publish your course")
      return
    }

    // Validate required fields
    if (!courseData.title || !courseData.description || !courseData.category || !courseData.level || !courseData.price) {
      alert("Please fill in all required fields before publishing")
      return
    }

    if (chapters.some(chapter => !chapter.title || chapter.lessons.some(lesson => !lesson.title))) {
      alert("Please ensure all chapters and lessons have titles")
      return
    }

    setIsLoading(true)
    try {
      const publishData = {
        title: courseData.title,
        subtitle: courseData.subtitle,
        description: courseData.description,
        category: courseData.category,
        level: courseData.level.toUpperCase(),
        language: courseData.language,
        price: parseFloat(courseData.price),
        trainerId: user.id,
        learningObjectives: courseData.learningObjectives.filter(obj => obj.trim()),
        requirements: courseData.requirements.filter(req => req.trim()),
        targetAudience: courseData.targetAudience,
        status: "PUBLISHED",
        chapters: chapters.map((chapter, chapterIndex) => ({
          title: chapter.title,
          order: chapterIndex + 1,
          lessons: chapter.lessons.map((lesson, lessonIndex) => ({
            title: lesson.title,
            description: lesson.description,
            order: lessonIndex + 1,
            duration: lesson.duration ? parseInt(lesson.duration) : undefined,
            content: lesson.description,
            isPreview: false
          }))
        }))
      }

      // Create course in Django
      const result = await djangoApi.post('/api/courses/', publishData)

      toast({
        title: "Success",
        description: "Course published successfully! It will now appear in the course listings."
      })
      
      router.push("/instructor")
    } catch (error) {
      console.error("Error publishing course:", error)
      alert("Failed to publish course. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { id: 1, title: "Basic Info", description: "Course title, description, and category" },
    { id: 2, title: "Curriculum", description: "Create chapters and lessons" },
    { id: 3, title: "Pricing", description: "Set your course price" },
    { id: 4, title: "Publish", description: "Review and publish your course" }
  ]

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return courseData.title && courseData.description && courseData.category && courseData.level
      case 2:
        return chapters.every(chapter => 
          chapter.title && chapter.lessons.every(lesson => lesson.title)
        )
      case 3:
        return courseData.price
      case 4:
        return true
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Loading state for edit mode */}
      {loadingCourseData && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <XLVILoader size="64px" className="mx-auto mb-4" />
            <p className="text-lg font-medium">Loading course data...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your course details</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/instructor" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">CourseCompass</span>
              </Link>
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">{isEditMode ? 'Edit Course' : 'Create Course'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Draft"}
              </Button>
              <Button variant="ghost" onClick={() => router.push("/instructor")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Course' : 'Create New Course'}</h1>
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep === step.id 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : isStepComplete(step.id)
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground text-muted-foreground"
                }`}>
                  {isStepComplete(step.id) && currentStep !== step.id ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    isStepComplete(step.id) ? "bg-green-500" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <Progress value={(currentStep / steps.length) * 100} className="w-full" />
        </div>

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Basic Course Information</CardTitle>
                  <CardDescription>
                    Tell us about your course. This information will help students find and understand your course.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Complete Web Development Bootcamp"
                      value={courseData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subtitle">Course Subtitle</Label>
                    <Input
                      id="subtitle"
                      placeholder="e.g., Learn HTML, CSS, JavaScript, React and more"
                      value={courseData.subtitle}
                      onChange={(e) => handleInputChange("subtitle", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Course Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what students will learn in your course..."
                      className="min-h-[120px]"
                      value={courseData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select value={courseData.category} onValueChange={(value) => handleInputChange("category", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Level *</Label>
                      <Select value={courseData.level} onValueChange={(value) => handleInputChange("level", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty level" />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Course Thumbnail</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      {uploadingThumbnail ? (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-primary animate-pulse" />
                          <p className="text-sm text-primary font-medium">Uploading thumbnail...</p>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{width: '50%'}}></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Upload a course thumbnail (recommended: 1280x720, max 5MB)
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Supported formats: JPEG, PNG, WebP
                          </p>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleThumbnailUpload}
                            className="hidden"
                            id="thumbnail-upload"
                            disabled={uploadingThumbnail || !courseId}
                          />
                          <Button 
                            variant="outline" 
                            onClick={() => document.getElementById('thumbnail-upload')?.click()}
                            disabled={uploadingThumbnail || !courseId}
                          >
                            Choose File
                          </Button>
                          {!courseId && (
                            <p className="text-xs text-orange-600 mt-2">
                              💡 Save as draft first to enable thumbnail upload
                            </p>
                          )}
                        </>
                      )}
                      {courseData.thumbnail && (
                        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-700 font-medium">
                            ✓ {courseData.thumbnail.name}
                          </p>
                          <p className="text-xs text-green-600">
                            Size: {(courseData.thumbnail.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>What will students learn? *</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        List the key learning objectives for your course
                      </p>
                      {courseData.learningObjectives.map((objective, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <Input
                            placeholder="e.g., Build responsive websites with HTML and CSS"
                            value={objective}
                            onChange={(e) => handleArrayInputChange("learningObjectives", index, e.target.value)}
                          />
                          {courseData.learningObjectives.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeArrayItem("learningObjectives", index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem("learningObjectives")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Learning Objective
                      </Button>
                    </div>

                    <div>
                      <Label>Requirements</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        What should students know before taking your course?
                      </p>
                      {courseData.requirements.map((requirement, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <Input
                            placeholder="e.g., Basic computer skills"
                            value={requirement}
                            onChange={(e) => handleArrayInputChange("requirements", index, e.target.value)}
                          />
                          {courseData.requirements.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeArrayItem("requirements", index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addArrayItem("requirements")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Requirement
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Curriculum</CardTitle>
                  <CardDescription>
                    Organize your course content into chapters and lessons.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {chapters.map((chapter, chapterIndex) => (
                    <div key={chapter.id} className="border rounded-lg p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Chapter {chapterIndex + 1}</h3>
                          {chapters.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setChapters(chapters.filter((_, i) => i !== chapterIndex))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <Input
                          placeholder="Chapter title"
                          value={chapter.title}
                          onChange={(e) => {
                            const updatedChapters = [...chapters]
                            updatedChapters[chapterIndex].title = e.target.value
                            setChapters(updatedChapters)
                          }}
                        />

                        <div className="space-y-3">
                          <h4 className="font-medium">Lessons</h4>
                          {chapter.lessons.map((lesson, lessonIndex) => (
                            <div key={lesson.id} className="border rounded p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Lesson {lessonIndex + 1}</span>
                                {chapter.lessons.length > 1 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const updatedChapters = [...chapters]
                                      updatedChapters[chapterIndex].lessons = 
                                        updatedChapters[chapterIndex].lessons.filter((_, i) => i !== lessonIndex)
                                      setChapters(updatedChapters)
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              
                              <Input
                                placeholder="Lesson title"
                                value={lesson.title}
                                onChange={(e) => {
                                  const updatedChapters = [...chapters]
                                  updatedChapters[chapterIndex].lessons[lessonIndex].title = e.target.value
                                  setChapters(updatedChapters)
                                }}
                              />
                              
                              <Textarea
                                placeholder="Lesson description"
                                value={lesson.description}
                                onChange={(e) => {
                                  const updatedChapters = [...chapters]
                                  updatedChapters[chapterIndex].lessons[lessonIndex].description = e.target.value
                                  setChapters(updatedChapters)
                                }}
                              />

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium flex items-center space-x-2">
                                    <Video className="h-4 w-4 text-primary" />
                                    <span>Lesson Video</span>
                                  </label>
                                  {(lesson.videoFile || lesson.videoUrl) && (
                                    <Badge variant="secondary" className="text-xs">
                                      {lesson.videoFile ? 'Self-hosted' : 'External URL'}
                                    </Badge>
                                  )}
                                </div>

                                {/* Video Source Tabs */}
                                <Tabs defaultValue="url" className="w-full">
                                  <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="url">Video URL</TabsTrigger>
                                    <TabsTrigger value="upload">Upload Video</TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="url" className="space-y-3">
                                    <div className="space-y-2">
                                      <Label htmlFor={`video-url-${chapterIndex}-${lessonIndex}`}>
                                        Video URL (YouTube, Vimeo, Wistia, Loom)
                                      </Label>
                                      <Input
                                        id={`video-url-${chapterIndex}-${lessonIndex}`}
                                        placeholder="https://www.youtube.com/watch?v=... or embed URL"
                                        value={lesson.videoUrl}
                                        onChange={(e) => {
                                          const updatedChapters = [...chapters]
                                          updatedChapters[chapterIndex].lessons[lessonIndex].videoUrl = e.target.value
                                          // Clear video file if URL is provided
                                          updatedChapters[chapterIndex].lessons[lessonIndex].videoFile = null
                                          setChapters(updatedChapters)
                                        }}
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        Supported platforms: YouTube, Vimeo, Wistia, Loom
                                      </p>
                                    </div>

                                    {lesson.videoUrl && (
                                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                        <p className="text-sm text-blue-700 font-medium mb-1">
                                          ✓ Video URL added
                                        </p>
                                        <p className="text-xs text-blue-600 break-all">
                                          {lesson.videoUrl}
                                        </p>
                                      </div>
                                    )}
                                  </TabsContent>

                                  <TabsContent value="upload" className="space-y-3">
                                    {uploadingVideos[`${chapterIndex}-${lessonIndex}`] ? (
                                      <div className="border-2 border-dashed border-primary/25 rounded-lg p-4 text-center">
                                        <Video className="h-6 w-6 mx-auto mb-2 text-primary animate-pulse" />
                                        <p className="text-sm text-primary font-medium mb-2">Uploading video...</p>
                                        <div className="w-full bg-muted rounded-full h-2">
                                          <div 
                                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                                            style={{width: `${uploadProgress[`${chapterIndex}-${lessonIndex}`] || 0}%`}}
                                          ></div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {uploadProgress[`${chapterIndex}-${lessonIndex}`] || 0}% complete
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                                        <Video className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground mb-2">
                                          Upload lesson video (max 500MB)
                                        </p>
                                        <p className="text-xs text-muted-foreground mb-3">
                                          Supported: MP4, WebM, QuickTime
                                        </p>
                                        <input
                                          type="file"
                                          accept="video/mp4,video/webm,video/quicktime"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                              // Clear video URL if file is uploaded
                                              const updatedChapters = [...chapters]
                                              updatedChapters[chapterIndex].lessons[lessonIndex].videoUrl = ''
                                              setChapters(updatedChapters)
                                              handleVideoUpload(chapterIndex, lessonIndex, file)
                                            }
                                          }}
                                          className="hidden"
                                          id={`video-upload-${chapterIndex}-${lessonIndex}`}
                                          disabled={!courseId || uploadingVideos[`${chapterIndex}-${lessonIndex}`]}
                                        />
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            if (!courseId) {
                                              toast({
                                                title: "Save course first",
                                                description: "Please save the course as draft before uploading videos",
                                                variant: "destructive"
                                              })
                                              return
                                            }
                                            document.getElementById(`video-upload-${chapterIndex}-${lessonIndex}`)?.click()
                                          }}
                                          disabled={!courseId || uploadingVideos[`${chapterIndex}-${lessonIndex}`]}
                                        >
                                          {!courseId ? 'Save course first' : 'Choose Video'}
                                        </Button>
                                      </div>
                                    )}
                                    
                                    {lesson.videoFile && (
                                      <div className="p-3 bg-green-50 border border-green-200 rounded">
                                        <p className="text-sm text-green-700 font-medium">
                                          ✓ {lesson.videoFile.name}
                                        </p>
                                        <p className="text-xs text-green-600">
                                          Size: {(lesson.videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                      </div>
                                    )}
                                  </TabsContent>
                                </Tabs>
                                
                                <Input
                                  placeholder="Duration (minutes)"
                                  type="number"
                                  value={lesson.duration}
                                  onChange={(e) => {
                                    const updatedChapters = [...chapters]
                                    updatedChapters[chapterIndex].lessons[lessonIndex].duration = e.target.value
                                    setChapters(updatedChapters)
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addLesson(chapterIndex)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Lesson
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="outline" onClick={addChapter}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Chapter
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Pricing</CardTitle>
                  <CardDescription>
                    Set the price for your course. You can always change this later.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="price">Course Price (USD) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        placeholder="99.99"
                        className="pl-10"
                        value={courseData.price}
                        onChange={(e) => handleInputChange("price", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Pricing Guidelines</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Consider your course length and depth</li>
                      <li>• Research similar courses in your category</li>
                      <li>• You can run promotions and discounts later</li>
                      <li>• Free courses are great for building an audience</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review & Publish</CardTitle>
                  <CardDescription>
                    Review your course details before publishing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Course Overview</h3>
                      <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                        <p><strong>Title:</strong> {courseData.title || "Not set"}</p>
                        <p><strong>Category:</strong> {courseData.category || "Not set"}</p>
                        <p><strong>Level:</strong> {courseData.level || "Not set"}</p>
                        <p><strong>Price:</strong> ${courseData.price || "Not set"}</p>
                        <p><strong>Chapters:</strong> {chapters.length}</p>
                        <p><strong>Total Lessons:</strong> {chapters.reduce((total, chapter) => total + chapter.lessons.length, 0)}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Publishing Checklist</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className={`h-4 w-4 ${courseData.title ? 'text-green-600' : 'text-muted-foreground'}`} />
                          <span className="text-sm">Course title added</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className={`h-4 w-4 ${courseData.description ? 'text-green-600' : 'text-muted-foreground'}`} />
                          <span className="text-sm">Course description added</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className={`h-4 w-4 ${chapters.every(c => c.title) ? 'text-green-600' : 'text-muted-foreground'}`} />
                          <span className="text-sm">All chapters have titles</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className={`h-4 w-4 ${courseData.price ? 'text-green-600' : 'text-muted-foreground'}`} />
                          <span className="text-sm">Course price set</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button onClick={handlePublishCourse} className="flex-1" disabled={isLoading}>
                      {isLoading ? "Publishing..." : "Publish Course"}
                    </Button>
                    <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save as Draft"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Course Creation Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        currentStep === step.id
                          ? "bg-primary text-primary-foreground"
                          : isStepComplete(step.id)
                          ? "bg-green-50 border border-green-200"
                          : "bg-muted/30"
                      }`}
                      onClick={() => setCurrentStep(step.id)}
                    >
                      <div className="flex items-center space-x-2">
                        {isStepComplete(step.id) && currentStep !== step.id ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            currentStep === step.id ? "border-primary-foreground" : "border-muted-foreground"
                          }`} />
                        )}
                        <div>
                          <h4 className="font-medium text-sm">{step.title}</h4>
                          <p className="text-xs opacity-75">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          <Button
            onClick={() => {
              if (currentStep === steps.length) {
                handlePublishCourse()
              } else {
                setCurrentStep(Math.min(steps.length, currentStep + 1))
              }
            }}
            disabled={!isStepComplete(currentStep) || isLoading}
          >
            {currentStep === steps.length 
              ? (isLoading ? "Publishing..." : "Publish Course") 
              : "Next"
            }
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CreateCoursePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <CreateCoursePageContent />
    </Suspense>
  )
}
