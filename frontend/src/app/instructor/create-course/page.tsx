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
  CheckCircle,
  GripVertical,
  Lock,
  Trash2
} from "lucide-react"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { XLVILoader } from "@/components/ui/xlvi-loader"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  const [categories, setCategories] = useState<any[]>([])
  const [apiChapters, setApiChapters] = useState<any[]>([])
  const [apiLessons, setApiLessons] = useState<any[]>([])
  const [showChapterDialog, setShowChapterDialog] = useState(false)
  const [editingChapter, setEditingChapter] = useState<any>(null)
  const [newChapterData, setNewChapterData] = useState({
    title: '',
    description: '',
    is_locked: false,
    prerequisite_chapter: null as number | null
  })
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

    // Fetch categories from Django API
    const fetchCategories = async () => {
      try {
        const categoriesData = await djangoApi.get<any>('/api/categories/')
        console.log('Categories API response:', categoriesData)
        // Handle both array response and paginated response
        const categoriesArray = Array.isArray(categoriesData) ? categoriesData : (categoriesData.results || [])
        setCategories(categoriesArray)
      } catch (error) {
        console.error('Error fetching categories:', error)
        // Ensure categories is always an array
        setCategories([])
        toast({
          title: "Warning",
          description: "Failed to load categories. Using defaults.",
          variant: "destructive"
        })
      }
    }
    fetchCategories()
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
      console.log('Fetching course data:', `/api/courses/${courseId}?instructorId=${user.id}`)
      const course = await djangoApi.get<any>(`/api/courses/${courseId}`, { instructorId: user.id })
      console.log('Course data received:', course)
      console.log('Category data:', course.category, typeof course.category)
      
      // Update course data
      setCourseData({
        title: course.title || '',
        subtitle: course.subtitle || '',
        description: course.description || '',
        category: course.category?.name || course.category || '',
        level: course.level || '',
        language: course.language || 'English',
        price: course.price?.toString() || '',
        thumbnail: null, // Will be handled separately
        learningObjectives: course.learningObjectives || [''],
        requirements: course.requirements || [''],
        targetAudience: course.targetAudience || ''
      })
      
      // Fetch and load existing lessons
      try {
        console.log('Fetching lessons for course:', courseId)
        const lessonsData = await djangoApi.get<any>(`/api/lessons/?course_id=${courseId}`)
        const lessons = lessonsData.results || lessonsData || []
        console.log('Lessons data received:', lessons)
        
        if (lessons.length > 0) {
          // Group lessons into a single chapter for now (can be enhanced later)
          const formattedChapter = {
            id: "1",
            title: "Course Lessons",
            lessons: lessons.map((lesson: any, index: number) => ({
              id: lesson.id, // Use actual numeric ID from database
              title: lesson.title || '',
              description: lesson.content || lesson.description || '',
              videoFile: null,
              videoUrl: lesson.video_url || '',
              duration: lesson.duration?.toString() || '',
              resources: lesson.resources || []
            }))
          }
          setChapters([formattedChapter])
        }
      } catch (error) {
        console.error('Error loading lessons:', error)
        // Continue without lessons if there's an error
      }
    } catch (error) {
      console.error('Error loading course data:', error)
      alert('Error loading course data. Please try again.')
    } finally {
      setLoadingCourseData(false)
    }
  }

  // Fetch chapters for the course
  const fetchChapters = async () => {
    if (!courseId) return
    try {
      const data = await djangoApi.get<any>(`/api/chapters/?course_id=${courseId}`)
      setApiChapters(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching chapters:', error)
    }
  }

  // Fetch lessons for the course
  const fetchLessons = async () => {
    if (!courseId) return
    try {
      const data = await djangoApi.get<any>(`/api/lessons/?course_id=${courseId}`)
      setApiLessons(Array.isArray(data) ? data : data.results || [])
    } catch (error) {
      console.error('Error fetching lessons:', error)
    }
  }

  // Call these in useEffect when courseId changes
  useEffect(() => {
    if (courseId && currentStep === 2) {
      fetchChapters()
      fetchLessons()
    }
  }, [courseId, currentStep])

  // Chapter CRUD functions
  const handleCreateChapter = async () => {
    if (!courseId || !newChapterData.title) return
    
    try {
      const order = apiChapters.length
      await djangoApi.post('/api/chapters/', {
        course: parseInt(courseId),
        title: newChapterData.title,
        description: newChapterData.description,
        order,
        is_locked: newChapterData.is_locked,
        prerequisite_chapter: newChapterData.prerequisite_chapter
      })
      
      toast({ title: 'Chapter created successfully!' })
      setShowChapterDialog(false)
      setNewChapterData({ title: '', description: '', is_locked: false, prerequisite_chapter: null })
      fetchChapters()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create chapter',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateChapter = async (chapterId: number, updates: any) => {
    try {
      await djangoApi.patch(`/api/chapters/${chapterId}/`, updates)
      toast({ title: 'Chapter updated!' })
      fetchChapters()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update chapter',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteChapter = async (chapterId: number) => {
    if (!confirm('Delete this chapter? Lessons will be moved to "No Chapter".')) return
    
    try {
      await djangoApi.delete(`/api/chapters/${chapterId}/`)
      toast({ title: 'Chapter deleted!' })
      fetchChapters()
      fetchLessons()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete chapter',
        variant: 'destructive'
      })
    }
  }

  const handleMoveLessonToChapter = async (lessonId: number, chapterId: number | null) => {
    try {
      await djangoApi.patch(`/api/lessons/${lessonId}/`, {
        chapter: chapterId
      })
      toast({ title: 'Lesson moved!' })
      fetchLessons()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to move lesson',
        variant: 'destructive'
      })
    }
  }

  // Handle chapter reorder
  const handleChapterDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const oldIndex = apiChapters.findIndex(c => c.id === active.id)
    const newIndex = apiChapters.findIndex(c => c.id === over.id)
    
    const reorderedChapters = arrayMove(apiChapters, oldIndex, newIndex)
    setApiChapters(reorderedChapters)
    
    // Update backend
    try {
      await djangoApi.post('/api/chapters/reorder/', {
        course_id: courseId,
        chapters: reorderedChapters.map((c, idx) => ({ id: c.id, order: idx }))
      })
    } catch (error) {
      console.error('Failed to reorder chapters:', error)
      fetchChapters() // Revert on error
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
      const result = await djangoApi.upload(`/api/courses/${courseId}/upload_thumbnail/`, formData)

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
    
    // Validate lesson ID is a number (from database)
    const lessonId = typeof lesson.id === 'number' ? lesson.id : parseInt(lesson.id)
    if (!lessonId || isNaN(lessonId)) {
      toast({
        title: "Save Required",
        description: "Please save the lesson first before uploading video",
        variant: "destructive"
      })
      return
    }

    const uploadKey = `${chapterIndex}-${lessonIndex}`
    setUploadingVideos(prev => ({ ...prev, [uploadKey]: true }))
    setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }))
    
    try {
      const formData = new FormData()
      formData.append('video', file)

      const result = await djangoApi.upload(`/api/lessons/${lessonId}/upload_video/`, formData)

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
      // Prepare course data matching Django model
      // Map category name to ID
      const selectedCategory = categories.find(c => c.name === courseData.category)
      
      const coursePayload = {
        title: courseData.title || 'Untitled Course',
        description: courseData.description || '',
        category_id: selectedCategory?.id || null,
        price: parseFloat(courseData.price) || 0,
        status: "draft",
      }

      let course
      if (courseId) {
        // Update existing course
        course = await djangoApi.put<any>(`/api/courses/${courseId}/`, coursePayload)
      } else {
        // Create new course (instructor is set automatically)
        course = await djangoApi.post<any>('/api/courses/', coursePayload)
        setCourseId(course.id)
      }

      // Create or update lessons
      let lessonOrder = 1
      for (const chapter of chapters) {
        for (const lesson of chapter.lessons) {
          if (lesson.title) {
            const lessonPayload = {
              course: course.id,
              title: lesson.title,
              content: lesson.description || '',
              order: lessonOrder++,
            }
            
            if (lesson.id && typeof lesson.id === 'number') {
              // Update existing lesson
              await djangoApi.put(`/api/lessons/${lesson.id}/`, lessonPayload)
            } else {
              // Create new lesson
              const createdLesson = await djangoApi.post<any>('/api/lessons/', lessonPayload)
              // Update lesson ID in state for future updates
              lesson.id = createdLesson.id.toString()
            }
          }
        }
      }

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
      toast({
        title: "Authentication Required",
        description: "Please log in to publish your course",
        variant: "destructive"
      })
      return
    }

    // Validate required fields
    const missingFields: string[] = []
    if (!courseData.title) missingFields.push("Title")
    if (!courseData.description) missingFields.push("Description")
    if (!courseData.category) missingFields.push("Category")
    if (!courseData.level) missingFields.push("Level")
    if (!courseData.price) missingFields.push("Price")

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive"
      })
      return
    }

    // Validate chapters and lessons
    const invalidChapters: string[] = []
    const invalidLessons: string[] = []
    
    chapters.forEach((chapter, chapterIndex) => {
      if (!chapter.title) {
        invalidChapters.push(`Chapter ${chapterIndex + 1}`)
      }
      chapter.lessons.forEach((lesson, lessonIndex) => {
        if (!lesson.title) {
          invalidLessons.push(`Chapter ${chapterIndex + 1}, Lesson ${lessonIndex + 1}`)
        }
      })
    })

    if (invalidChapters.length > 0 || invalidLessons.length > 0) {
      let errorMessage = ""
      if (invalidChapters.length > 0) {
        errorMessage += `Missing chapter titles: ${invalidChapters.join(", ")}`
      }
      if (invalidLessons.length > 0) {
        if (errorMessage) errorMessage += ". "
        errorMessage += `Missing lesson titles: ${invalidLessons.join(", ")}`
      }
      
      toast({
        title: "Incomplete Course Content",
        description: errorMessage,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // First, create or update the course
      // Map category name to ID
      console.log('Categories:', categories, 'Type:', typeof categories, 'IsArray:', Array.isArray(categories))
      console.log('Looking for category:', courseData.category)
      const selectedCategory = Array.isArray(categories) ? categories.find(c => c.name === courseData.category) : null
      console.log('Selected category:', selectedCategory)
      
      const coursePayload = {
        title: courseData.title,
        description: courseData.description,
        category_id: selectedCategory?.id || null,
        price: parseFloat(courseData.price),
        status: "published",
      }

      // Create or update course in Django
      let course
      if (isEditMode && courseId) {
        // Update existing course
        course = await djangoApi.put<any>(`/api/courses/${courseId}/`, coursePayload)
      } else {
        // Create new course
        course = await djangoApi.post<any>('/api/courses/', coursePayload)
        setCourseId(course.id.toString())
      }
      
      // Create lessons for the course
      let lessonOrder = 1
      for (const chapter of chapters) {
        for (const lesson of chapter.lessons) {
          if (lesson.title) {
            await djangoApi.post('/api/lessons/', {
              course: course.id,
              title: lesson.title,
              content: lesson.description || '',
              order: lessonOrder++,
            })
          }
        }
      }

      toast({
        title: "Success",
        description: isEditMode 
          ? "Course updated successfully! Changes have been saved."
          : "Course published successfully! It will now appear in the course listings."
      })
      
      router.push("/instructor")
    } catch (error: any) {
      console.error("Error publishing course:", error)
      
      let errorMessage = "Failed to publish course. Please try again."
      let errorTitle = "Publishing Failed"
      
      // Handle specific API errors
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.response?.data) {
        // Handle Django API validation errors
        const apiErrors = error.response.data
        if (typeof apiErrors === 'object') {
          const errorFields = Object.keys(apiErrors)
          if (errorFields.length > 0) {
            errorTitle = "Validation Error"
            errorMessage = errorFields.map(field => {
              const fieldErrors = Array.isArray(apiErrors[field]) ? apiErrors[field] : [apiErrors[field]]
              return `${field}: ${fieldErrors.join(", ")}`
            }).join(". ")
          }
        } else if (typeof apiErrors === 'string') {
          errorMessage = apiErrors
        }
      } else if (error?.status) {
        errorTitle = `HTTP ${error.status} Error`
        errorMessage = `Server returned ${error.status}. Please check your data and try again.`
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      })
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

  // Sortable Chapter Component
  function SortableChapter({ chapter, lessons, onDelete, onUpdate, onMoveLesson }: any) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: chapter.id })
    
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }
    
    const chapterLessons = lessons.filter((l: any) => l.chapter === chapter.id)
    
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3 flex-1">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{chapter.title}</CardTitle>
                {chapter.description && (
                  <CardDescription>{chapter.description}</CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chapter.is_locked && (
                <Badge variant="secondary">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
              <Badge variant="outline">{chapterLessons.length} lessons</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(chapter.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {chapterLessons.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No lessons in this chapter. Drag lessons here.
              </p>
            ) : (
              <div className="space-y-2">
                {chapterLessons.map((lesson: any) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{lesson.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMoveLesson(lesson.id, null)}
                    >
                      Remove from chapter
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
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
                          {categories.length > 0 ? (
                            categories.map((category) => (
                              <SelectItem key={category.id} value={category.name}>
                                {category.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                          )}
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

            {currentStep === 2 && !courseId && (
              <Card>
                <CardHeader>
                  <CardTitle>Save Course First</CardTitle>
                  <CardDescription>
                    Please save your course as a draft before organizing chapters and lessons.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleSaveDraft} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? "Saving..." : "Save as Draft"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && courseId && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Organize Course Content</h2>
                    <p className="text-muted-foreground">Create chapters and organize lessons</p>
                  </div>
                  <Button onClick={() => setShowChapterDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Chapter
                  </Button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleChapterDragEnd}
                >
                  <SortableContext
                    items={apiChapters.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {apiChapters.map(chapter => (
                      <SortableChapter
                        key={chapter.id}
                        chapter={chapter}
                        lessons={apiLessons}
                        onDelete={handleDeleteChapter}
                        onUpdate={handleUpdateChapter}
                        onMoveLesson={handleMoveLessonToChapter}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {/* Unassigned Lessons */}
                <Card>
                  <CardHeader>
                    <CardTitle>Unassigned Lessons</CardTitle>
                    <CardDescription>Drag these lessons into chapters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {apiLessons.filter(l => !l.chapter).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        All lessons are organized into chapters
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {apiLessons.filter(l => !l.chapter).map((lesson: any) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Video className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{lesson.title}</span>
                            </div>
                            <Select
                              onValueChange={(value) => handleMoveLessonToChapter(lesson.id, parseInt(value))}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Move to chapter..." />
                              </SelectTrigger>
                              <SelectContent>
                                {apiChapters.map(chapter => (
                                  <SelectItem key={chapter.id} value={chapter.id.toString()}>
                                    {chapter.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Legacy Chapter/Lesson Editor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Course Curriculum (Legacy)</CardTitle>
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

              {/* Chapter Creation Dialog */}
              <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Chapter</DialogTitle>
                    <DialogDescription>
                      Organize your lessons into chapters for better structure
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="chapter-title">Chapter Title</Label>
                      <Input
                        id="chapter-title"
                        value={newChapterData.title}
                        onChange={(e) => setNewChapterData({ ...newChapterData, title: e.target.value })}
                        placeholder="e.g., Introduction to React"
                      />
                    </div>
                    <div>
                      <Label htmlFor="chapter-description">Description (Optional)</Label>
                      <Textarea
                        id="chapter-description"
                        value={newChapterData.description}
                        onChange={(e) => setNewChapterData({ ...newChapterData, description: e.target.value })}
                        placeholder="Brief description of what this chapter covers"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="chapter-locked">Lock Chapter</Label>
                        <p className="text-sm text-muted-foreground">
                          Require previous chapter completion
                        </p>
                      </div>
                      <Switch
                        id="chapter-locked"
                        checked={newChapterData.is_locked}
                        onCheckedChange={(checked) => setNewChapterData({ ...newChapterData, is_locked: checked })}
                      />
                    </div>
                    {newChapterData.is_locked && apiChapters.length > 0 && (
                      <div>
                        <Label htmlFor="prerequisite">Prerequisite Chapter</Label>
                        <Select
                          value={newChapterData.prerequisite_chapter?.toString() || ''}
                          onValueChange={(value) => setNewChapterData({ ...newChapterData, prerequisite_chapter: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select prerequisite chapter" />
                          </SelectTrigger>
                          <SelectContent>
                            {apiChapters.map(chapter => (
                              <SelectItem key={chapter.id} value={chapter.id.toString()}>
                                {chapter.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowChapterDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateChapter}>
                      Create Chapter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                      {isLoading ? (isEditMode ? "Saving..." : "Publishing...") : (isEditMode ? "Save Changes" : "Publish Course")}
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
              ? (isLoading ? (isEditMode ? "Saving..." : "Publishing...") : (isEditMode ? "Save Changes" : "Publish Course"))
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
