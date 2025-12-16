"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  ArrowLeft, 
  Upload, 
  DollarSign,
  CheckCircle
} from "lucide-react"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { XLVILoader } from "@/components/ui/xlvi-loader"

/**
 * Course Creator Wizard - Simplified 3-step wizard for creating new courses
 * 
 * Requirements:
 * - 1.1: 3-step wizard: Basic Info → Category & Level → Pricing
 * - 1.2: On completion, redirect to Course Editor
 * - 1.3: Step 1 requires only title and description
 * - 1.4: Step 2 allows selecting category, level, and thumbnail
 * - 1.5: Step 3 allows setting price or marking as free
 * - 1.6: "Create & Edit Content" saves course and opens Course Editor
 * - 13.3: /instructor/create-course?edit={id} redirects to /instructor/courses/{id}/edit
 */

interface CourseFormData {
  title: string
  description: string
  category: string
  level: 'Beginner' | 'Intermediate' | 'Advanced' | ''
  thumbnail: File | null
  price: string
  is_free: boolean
}

function CreateCoursePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editCourseId = searchParams.get('edit')
  
  const [currentStep, setCurrentStep] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [courseData, setCourseData] = useState<CourseFormData>({
    title: "",
    description: "",
    category: "",
    level: "",
    thumbnail: null,
    price: "",
    is_free: false
  })

  // Redirect to Course Editor when edit param is present
  // Requirements: 13.3 - /instructor/create-course?edit={id} redirects to /instructor/courses/{id}/edit
  useEffect(() => {
    if (editCourseId) {
      console.log('Redirecting to Course Editor for course:', editCourseId)
      router.replace(`/instructor/courses/${editCourseId}/edit`)
    }
  }, [editCourseId, router])

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
        const categoriesArray = Array.isArray(categoriesData) ? categoriesData : (categoriesData.results || [])
        setCategories(categoriesArray)
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([])
        toast({
          title: "Warning",
          description: "Failed to load categories. Using defaults.",
          variant: "destructive"
        })
      }
    }
    fetchCategories()
  }, [router])

  const levels = ["Beginner", "Intermediate", "Advanced"]

  const handleInputChange = (field: keyof CourseFormData, value: string | boolean | File | null) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, or WebP)",
        variant: "destructive"
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Thumbnail size must be less than 5MB",
        variant: "destructive"
      })
      return
    }

    setCourseData(prev => ({ ...prev, thumbnail: file }))
    toast({
      title: "Thumbnail selected",
      description: "Thumbnail will be uploaded when you create the course"
    })
  }

  // Requirements: 1.2, 1.6 - Create course and redirect to Course Editor
  const handleCreateAndEditContent = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a course",
        variant: "destructive"
      })
      return
    }

    // Validate required fields
    if (!courseData.title || !courseData.description) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in title and description",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // Map category name to ID
      const selectedCategory = categories.find(c => c.name === courseData.category)
      
      const coursePayload = {
        title: courseData.title,
        description: courseData.description,
        category_id: selectedCategory?.id || null,
        level: courseData.level || 'Beginner',
        price: courseData.is_free ? 0 : (parseFloat(courseData.price) || 0),
        status: "draft",
      }

      // Create new course
      const course = await djangoApi.post<any>('/api/courses/', coursePayload)
      
      // Upload thumbnail if provided
      if (courseData.thumbnail && course.id) {
        try {
          setUploadingThumbnail(true)
          const formData = new FormData()
          formData.append('thumbnail', courseData.thumbnail)
          await djangoApi.upload(`/api/courses/${course.id}/upload_thumbnail/`, formData)
        } catch (thumbnailError) {
          console.error('Thumbnail upload error:', thumbnailError)
          // Don't fail the whole operation for thumbnail upload failure
          toast({
            title: "Note",
            description: "Course created but thumbnail upload failed. You can upload it later.",
          })
        } finally {
          setUploadingThumbnail(false)
        }
      }

      toast({
        title: "Success",
        description: "Course created successfully! Redirecting to editor..."
      })
      
      // Redirect to Course Editor (Requirements: 1.2, 1.6)
      router.push(`/instructor/courses/${course.id}/edit`)
    } catch (error: any) {
      console.error("Error creating course:", error)
      
      let errorMessage = "Failed to create course. Please try again."
      if (error?.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 3-step wizard structure (Requirements: 1.1)
  const steps = [
    { id: 1, title: "Basic Info", description: "Course title and description" },
    { id: 2, title: "Category & Level", description: "Category, level, and thumbnail" },
    { id: 3, title: "Pricing", description: "Set your course price" }
  ]

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        // Requirements: 1.3 - Step 1 requires only title and description
        return Boolean(courseData.title && courseData.description)
      case 2:
        // Requirements: 1.4 - Category and level (thumbnail optional)
        return Boolean(courseData.category && courseData.level)
      case 3:
        // Requirements: 1.5 - Price or free
        return courseData.is_free || Boolean(courseData.price)
      default:
        return false
    }
  }

  const canProceed = isStepComplete(currentStep)

  // If redirecting to edit mode, show loading
  if (editCourseId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XLVILoader size="64px" className="mx-auto mb-4" />
          <p className="text-lg font-medium">Redirecting to Course Editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
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
                <span className="text-muted-foreground">Create Course</span>
              </div>
            </div>
            <Button variant="ghost" onClick={() => router.push("/instructor")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Create New Course</h1>
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
            {/* Step 1: Basic Info (Requirements: 1.3) */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Basic Course Information</CardTitle>
                  <CardDescription>
                    Start with the essentials - your course title and description.
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
                    <p className="text-xs text-muted-foreground">
                      Choose a clear, descriptive title that tells students what they'll learn
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Course Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what students will learn in your course..."
                      className="min-h-[150px]"
                      value={courseData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A good description helps students understand the value of your course
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Category & Level (Requirements: 1.4) */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Category & Level</CardTitle>
                  <CardDescription>
                    Help students find your course by selecting the right category and level.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select 
                        value={courseData.category} 
                        onValueChange={(value) => handleInputChange("category", value)}
                      >
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
                      <Select 
                        value={courseData.level} 
                        onValueChange={(value) => handleInputChange("level", value)}
                      >
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
                    <Label>Course Thumbnail (Optional)</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
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
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('thumbnail-upload')?.click()}
                      >
                        Choose File
                      </Button>
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
                </CardContent>
              </Card>
            )}

            {/* Step 3: Pricing (Requirements: 1.5) */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Pricing</CardTitle>
                  <CardDescription>
                    Set the price for your course or make it free.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant={courseData.is_free ? "default" : "outline"}
                        onClick={() => handleInputChange("is_free", true)}
                        className="flex-1"
                      >
                        Free Course
                      </Button>
                      <Button
                        variant={!courseData.is_free ? "default" : "outline"}
                        onClick={() => handleInputChange("is_free", false)}
                        className="flex-1"
                      >
                        Paid Course
                      </Button>
                    </div>

                    {!courseData.is_free && (
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
                    )}
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

                  {/* Course Summary */}
                  <div className="border-t pt-6">
                    <h3 className="font-medium mb-4">Course Summary</h3>
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                      <p><strong>Title:</strong> {courseData.title || "Not set"}</p>
                      <p><strong>Category:</strong> {courseData.category || "Not set"}</p>
                      <p><strong>Level:</strong> {courseData.level || "Not set"}</p>
                      <p><strong>Price:</strong> {courseData.is_free ? "Free" : `$${courseData.price || "0"}`}</p>
                    </div>
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
          
          {currentStep === steps.length ? (
            // Final step: Create & Edit Content button (Requirements: 1.6)
            <Button
              onClick={handleCreateAndEditContent}
              disabled={!canProceed || isLoading}
            >
              {isLoading ? (
                uploadingThumbnail ? "Uploading thumbnail..." : "Creating course..."
              ) : (
                "Create & Edit Content"
              )}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
              disabled={!canProceed}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CreateCoursePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CreateCoursePageContent />
    </Suspense>
  )
}
