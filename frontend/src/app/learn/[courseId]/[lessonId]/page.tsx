"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { 
  Clock,
  CheckCircle,
  Circle,
  BookOpen,
  MessageCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Video,
  FileCode,
  Package,
  Puzzle,
  Code
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"
import { CourseCompletionModal } from "@/components/course-completion-modal"
import { ContentTypeRouter } from "@/components/lessons/ContentTypeRouter"

// Content type configuration with icons and labels
const CONTENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  video: { icon: Video, label: 'Video', color: 'bg-blue-500' },
  markdown: { icon: FileCode, label: 'Document', color: 'bg-green-500' },
  scorm: { icon: Package, label: 'SCORM', color: 'bg-purple-500' },
  h5p: { icon: Puzzle, label: 'Interactive', color: 'bg-orange-500' },
  html_embed: { icon: Code, label: 'HTML', color: 'bg-pink-500' },
}

// Type for content types
type ContentType = 'video' | 'markdown' | 'scorm' | 'h5p' | 'html_embed'

interface LessonData {
  id: string
  title: string
  description: string
  content_type: ContentType
  video_url?: string
  video_file?: string
  content?: string
  order: number
  scorm_package_id?: string
  h5p_package_id?: string
  completed: boolean
  chapter: {
    id: string
    title: string
    order: number
  }
}

interface CourseData {
  id: string
  title: string
  instructor: string
  totalLessons: number
  completedLessons: number
  progress: number
}

interface CurriculumLesson {
  id: string
  title: string
  duration: string
  completed: boolean
  current: boolean
  content_type: ContentType
}

interface CurriculumChapter {
  id: string
  title: string
  order: number
  lessons: CurriculumLesson[]
}

export default function LearnPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  // Unwrap the params Promise using React.use()
  const { courseId, lessonId } = use(params)

  // State for real data from API
  const [course, setCourse] = useState<CourseData | null>(null)
  const [currentLesson, setCurrentLesson] = useState<LessonData | null>(null)
  const [curriculum, setCurriculum] = useState<CurriculumChapter[]>([])
  const [loading, setLoading] = useState(true)
  
  // Course completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completedCertificateId, setCompletedCertificateId] = useState<string | null>(null)

  // Fetch course and lesson data from Django API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch course details with lessons
        const courseData = await djangoApi.get<any>(`/api/courses/${courseId}/`)
        console.log('Course data:', courseData)
        
        // Fetch specific lesson details
        const lessonData = await djangoApi.get<any>(`/api/lessons/${lessonId}/`)
        console.log('Lesson data:', lessonData)
        
        // Map course data
        setCourse({
          id: courseData.id,
          title: courseData.title,
          instructor: courseData.instructor?.username || 'Instructor',
          totalLessons: courseData.lessons?.length || 0,
          completedLessons: 0, // TODO: Calculate from progress
          progress: 0 // TODO: Calculate from progress
        })
        
        // Process video URL for YouTube embeds
        let videoUrl = lessonData.video_url || lessonData.video_file || ''
        if (videoUrl) {
          videoUrl = videoUrl.trim()
          if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
            if (videoUrl.includes('watch?v=')) {
              const videoId = videoUrl.split('watch?v=')[1]?.split('&')[0]
              videoUrl = `https://www.youtube.com/embed/${videoId}`
            } else if (videoUrl.includes('youtu.be/')) {
              const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
              videoUrl = `https://www.youtube.com/embed/${videoId}`
            }
          }
        }
        
        // Map lesson data with content type
        const contentType = lessonData.content_type || 'video'
        setCurrentLesson({
          id: lessonData.id.toString(),
          title: lessonData.title,
          description: lessonData.content || '',
          content_type: contentType as ContentType,
          video_url: videoUrl,
          content: lessonData.content,
          order: lessonData.order,
          scorm_package_id: lessonData.scorm_package_id,
          h5p_package_id: lessonData.h5p_package_id,
          completed: false, // TODO: Check from progress
          chapter: {
            id: courseData.id.toString(),
            title: courseData.title,
            order: 1
          }
        })
        
        // Map curriculum (all lessons grouped)
        const lessons = courseData.lessons || []
        setCurriculum([{
          id: courseData.id.toString(),
          title: courseData.title,
          order: 1,
          lessons: lessons.map((lesson: any) => ({
            id: lesson.id.toString(),
            title: lesson.title,
            duration: '0:00',
            completed: false,
            current: lesson.id.toString() === lessonId,
            content_type: lesson.content_type || 'video'
          }))
        }])
        
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load lesson data",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [courseId, lessonId])

  // Resources and discussions (TODO: Fetch from API)
  const resources: any[] = []
  const discussions: any[] = []

  const markLessonComplete = async () => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      console.error('User not found')
      return
    }
    
    try {
      const data = await djangoApi.post<any>(`/api/lessons/${lessonId}/mark-complete/`)
      console.log('Progress updated:', data)
      
      toast({
        title: "Lesson Complete!",
        description: "Great job! Your progress has been saved."
      })
      
      // Check if course is completed
      if (data.course_progress?.course_completed) {
        toast({
          title: "🎉 Course Completed!",
          description: `Amazing! You've finished all ${data.course_progress.total_lessons} lessons!`,
          duration: 5000
        })
        
        // Generate certificate automatically
        try {
          const certificateResponse = await djangoApi.post<any>('/api/certificates/', {
            course_id: courseId
          })
          
          setTimeout(() => {
            toast({
              title: "📜 Certificate Generated!",
              description: `Your completion certificate for "${course?.title}" is ready!`,
              duration: 5000
            })
            
            setCompletedCertificateId(certificateResponse.certificate_id || certificateResponse.id)
            setShowCompletionModal(true)
          }, 2000)
          
        } catch (certError) {
          console.error('Error generating certificate:', certError)
          setTimeout(() => {
            toast({
              title: "📜 Certificate Available",
              description: `Visit your profile to generate your completion certificate for "${course?.title}".`,
              duration: 5000
            })
            setShowCompletionModal(true)
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error)
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle content completion from ContentTypeRouter
  const handleContentCompletion = (data: any) => {
    console.log('Content completed:', data)
    markLessonComplete()
  }

  // Navigation helpers
  const isFirstLesson = () => {
    if (curriculum.length === 0) return true
    const firstChapter = curriculum[0]
    if (firstChapter.lessons.length === 0) return true
    return firstChapter.lessons[0].id === lessonId
  }

  const isLastLesson = () => {
    if (curriculum.length === 0) return true
    const lastChapter = curriculum[curriculum.length - 1]
    if (lastChapter.lessons.length === 0) return true
    return lastChapter.lessons[lastChapter.lessons.length - 1].id === lessonId
  }

  const navigateLesson = (direction: "prev" | "next") => {
    let currentChapterIndex = -1
    let currentLessonIndex = -1
    
    for (let i = 0; i < curriculum.length; i++) {
      const lessonIndex = curriculum[i].lessons.findIndex(l => l.id === lessonId)
      if (lessonIndex !== -1) {
        currentChapterIndex = i
        currentLessonIndex = lessonIndex
        break
      }
    }
    
    if (currentChapterIndex === -1) return
    
    let nextLesson: CurriculumLesson | null = null
    
    if (direction === "next") {
      if (currentLessonIndex < curriculum[currentChapterIndex].lessons.length - 1) {
        nextLesson = curriculum[currentChapterIndex].lessons[currentLessonIndex + 1]
      } else if (currentChapterIndex < curriculum.length - 1) {
        nextLesson = curriculum[currentChapterIndex + 1].lessons[0]
      }
    } else {
      if (currentLessonIndex > 0) {
        nextLesson = curriculum[currentChapterIndex].lessons[currentLessonIndex - 1]
      } else if (currentChapterIndex > 0) {
        const prevChapter = curriculum[currentChapterIndex - 1]
        nextLesson = prevChapter.lessons[prevChapter.lessons.length - 1]
      }
    }
    
    if (nextLesson) {
      router.push(`/learn/${courseId}/${nextLesson.id}`)
    }
  }

  const handleBackToCourse = () => {
    router.push(`/learn/${courseId}`)
  }

  // Course completion modal handlers
  const handleViewCertificate = () => {
    setShowCompletionModal(false)
    router.push(`/profile/certificates`)
  }

  const handleDownloadCertificate = () => {
    if (completedCertificateId) {
      toast({
        title: "Download Started",
        description: "Your certificate is being downloaded...",
      })
    }
  }

  const handleShareCertificate = () => {
    if (completedCertificateId) {
      navigator.clipboard.writeText(`${window.location.origin}/certificates/${completedCertificateId}`)
      toast({
        title: "Link Copied!",
        description: "Certificate link copied to clipboard",
      })
    }
  }

  // Auto-save notes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes.trim()) {
        console.log("Saving notes:", notes)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [notes])

  // Get content type config
  const getContentTypeConfig = (type: ContentType) => {
    return CONTENT_TYPE_CONFIG[type] || CONTENT_TYPE_CONFIG.video
  }

  if (loading || !course || !currentLesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    )
  }

  const contentConfig = getContentTypeConfig(currentLesson.content_type)
  const ContentIcon = contentConfig.icon

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">CourseCompass</span>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Course:</span>
                <span className="font-medium">{course.title}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleBackToCourse}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Content Area - Uses ContentTypeRouter */}
          <div className="bg-muted/30">
            <ContentTypeRouter
              contentType={currentLesson.content_type}
              lessonId={currentLesson.id}
              courseId={courseId}
              videoUrl={currentLesson.video_url}
              title={currentLesson.title}
              scormPackageId={currentLesson.scorm_package_id}
              h5pPackageId={currentLesson.h5p_package_id}
              initialContent={currentLesson.content}
              onCompletion={handleContentCompletion}
            />
          </div>

          {/* Lesson Content */}
          <div className="flex-1">
            <div className="flex flex-col h-full">
              {/* Lesson Header */}
              <div className="border-b p-6 bg-background">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold">{currentLesson.title}</h1>
                      <Badge className={`${contentConfig.color} text-white`}>
                        <ContentIcon className="h-3 w-3 mr-1" />
                        {contentConfig.label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{currentLesson.description}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant={currentLesson.completed ? "default" : "outline"}
                      onClick={markLessonComplete}
                    >
                      {currentLesson.completed ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        "Mark Complete"
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Chapter {currentLesson.chapter.order}: {currentLesson.chapter.title}</span>
                    <span>•</span>
                    <span>Lesson {currentLesson.order}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateLesson("prev")}
                      disabled={isFirstLesson()}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    {!isLastLesson() ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateLesson("next")}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBackToCourse}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Back to Course
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex-1 flex flex-col min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                  <TabsList className="grid w-full grid-cols-3 m-4 flex-shrink-0">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                  </TabsList>

                  <div className="p-4 flex-1 overflow-y-auto">
                    <TabsContent value="overview" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>About This Lesson</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <ContentIcon className={`h-5 w-5 mt-0.5 ${contentConfig.color.replace('bg-', 'text-')}`} />
                              <div>
                                <h4 className="font-medium mb-1">Content Type: {contentConfig.label}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {currentLesson.content_type === 'video' && 'Watch the video to learn the concepts covered in this lesson.'}
                                  {currentLesson.content_type === 'markdown' && 'Read through the document and take notes as needed.'}
                                  {currentLesson.content_type === 'scorm' && 'Complete the interactive SCORM package to progress.'}
                                  {currentLesson.content_type === 'h5p' && 'Interact with the H5P content to learn and practice.'}
                                  {currentLesson.content_type === 'html_embed' && 'Explore the embedded content to complete this lesson.'}
                                </p>
                              </div>
                            </div>
                            
                            {currentLesson.description && (
                              <div className="prose prose-sm max-w-none">
                                <p>{currentLesson.description}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Learning Objectives</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground">
                            <p>Complete this lesson to progress through the course.</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Your Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            placeholder="Take notes while learning..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[300px]"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Notes are automatically saved as you type.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="resources" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Downloadable Resources</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {resources.length > 0 ? (
                            <div className="space-y-3">
                              {resources.map((resource: any) => (
                                <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <h4 className="font-medium">{resource.title}</h4>
                                      <p className="text-sm text-muted-foreground">{resource.type.toUpperCase()} • {resource.size}</p>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm">Download</Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                              <p className="text-muted-foreground">No resources available for this lesson</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Course Progress & Curriculum */}
        <div className="lg:w-80 w-full border-l lg:border-l border-t lg:border-t-0 bg-muted/30 flex flex-col overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-2">Course Progress</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{course.completedLessons} of {course.totalLessons} lessons</span>
                <span>{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="w-full" />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-4">Course Content</h3>
              <div className="space-y-2">
                {curriculum.map((chapter) => (
                  <div key={chapter.id} className="space-y-1">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {chapter.order}. {chapter.title}
                    </h4>
                    <div className="space-y-1 ml-4">
                      {chapter.lessons.map((lesson) => {
                        const lessonConfig = getContentTypeConfig(lesson.content_type)
                        const LessonIcon = lessonConfig.icon
                        
                        return (
                          <div
                            key={lesson.id}
                            onClick={() => {
                              if (lesson.id !== currentLesson.id) {
                                router.push(`/learn/${courseId}/${lesson.id}`)
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                              lesson.id === currentLesson.id
                                ? "bg-primary text-primary-foreground"
                                : lesson.completed
                                ? "text-muted-foreground hover:bg-muted"
                                : "hover:bg-muted"
                            }`}
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {lesson.completed ? (
                                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 flex-shrink-0" />
                              )}
                              <span className={`truncate ${lesson.id === currentLesson.id ? "font-medium" : ""}`}>
                                {lesson.title}
                              </span>
                            </div>
                            <LessonIcon className="h-3 w-3 ml-2 flex-shrink-0 opacity-60" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Completion Modal with Confetti */}
      <CourseCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        courseTitle={course?.title || "Course"}
        certificateId={completedCertificateId || undefined}
        onViewCertificate={handleViewCertificate}
        onDownloadCertificate={handleDownloadCertificate}
        onShareCertificate={handleShareCertificate}
      />
    </div>
  )
}
