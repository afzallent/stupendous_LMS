"use client"

import { useState, useRef, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  Clock,
  CheckCircle,
  Circle,
  BookOpen,
  MessageCircle,
  FileText,
  HelpCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"
import { CourseCompletionModal } from "@/components/course-completion-modal"

export default function LearnPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  // Unwrap the params Promise using React.use()
  const { courseId, lessonId } = use(params)

  // State for real data from API
  const [course, setCourse] = useState<any>(null)
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [curriculum, setCurriculum] = useState<any[]>([])
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
        
        // Map lesson data
        let videoUrl = lessonData.video_url || lessonData.video_file || ''
        const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
        
        // Convert YouTube watch URL to embed URL
        if (isYouTube && videoUrl) {
          if (videoUrl.includes('watch?v=')) {
            const videoId = videoUrl.split('watch?v=')[1]?.split('&')[0]
            videoUrl = `https://www.youtube.com/embed/${videoId}`
          } else if (videoUrl.includes('youtu.be/')) {
            const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
            videoUrl = `https://www.youtube.com/embed/${videoId}`
          }
        }
        
        console.log('Original URL:', lessonData.video_url)
        console.log('Processed Video URL:', videoUrl)
        console.log('Is YouTube:', isYouTube)
        
        setCurrentLesson({
          id: lessonData.id,
          title: lessonData.title,
          description: lessonData.content || '',
          duration: 0, // Django doesn't store duration yet
          videoUrl: videoUrl,
          isYouTube: isYouTube,
          completed: false, // TODO: Check from progress
          order: lessonData.order,
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
            duration: '0:00', // Duration not stored yet
            completed: false, // TODO: Check from progress
            current: lesson.id.toString() === lessonId
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

  // TODO: Fetch from API when backend is ready
  const resources: any[] = []
  const discussions: any[] = []

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const changePlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const markLessonComplete = async () => {
    // In a real app, this would update the progress in the database
    console.log("Lesson marked as complete")
    
    // Get user from localStorage (in a real app, this would come from auth context)
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      console.error('User not found')
      return
    }
    
    const user = JSON.parse(storedUser)
    
    try {
      // Mark lesson as complete in Django
      const data = await djangoApi.post<any>(`/api/lessons/${lessonId}/mark-complete/`)
      console.log('Progress updated:', data)
      
      toast({
        title: "Lesson Complete!",
        description: "Great job! Your progress has been saved."
      })
      
      // Check if course is completed
      if (data.course_progress?.course_completed) {
        // Show immediate celebration
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
          
          // Show certificate success and completion modal
          setTimeout(() => {
            toast({
              title: "📜 Certificate Generated!",
              description: `Your completion certificate for "${course.title}" is ready!`,
              duration: 5000
            })
            
            // Show the beautiful completion modal with confetti
            setCompletedCertificateId(certificateResponse.certificate_id || certificateResponse.id)
            setShowCompletionModal(true)
          }, 2000)
          
        } catch (certError) {
          console.error('Error generating certificate:', certError)
          setTimeout(() => {
            toast({
              title: "📜 Certificate Available",
              description: `Visit your profile to generate your completion certificate for "${course.title}".`,
              duration: 5000
            })
            
            // Show completion modal even without certificate ID
            setShowCompletionModal(true)
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error)
      alert('Failed to update progress. Please try again.')
    }
  }

  // Helper function to check if current lesson is the first lesson
  const isFirstLesson = () => {
    if (curriculum.length === 0) return true
    const firstChapter = curriculum[0]
    if (firstChapter.lessons.length === 0) return true
    return firstChapter.lessons[0].id === lessonId
  }

  // Helper function to check if current lesson is the last lesson
  const isLastLesson = () => {
    if (curriculum.length === 0) return true
    const lastChapter = curriculum[curriculum.length - 1]
    if (lastChapter.lessons.length === 0) return true
    return lastChapter.lessons[lastChapter.lessons.length - 1].id === lessonId
  }

  const navigateLesson = (direction: "prev" | "next") => {
    // Find current lesson in curriculum
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
    
    type LessonType = typeof curriculum[0]['lessons'][0]
    let nextLesson: LessonType | null = null
    
    if (direction === "next") {
      // Try next lesson in current chapter
      if (currentLessonIndex < curriculum[currentChapterIndex].lessons.length - 1) {
        nextLesson = curriculum[currentChapterIndex].lessons[currentLessonIndex + 1]
      } else if (currentChapterIndex < curriculum.length - 1) {
        // First lesson of next chapter
        nextLesson = curriculum[currentChapterIndex + 1].lessons[0]
      }
    } else {
      // Try previous lesson in current chapter
      if (currentLessonIndex > 0) {
        nextLesson = curriculum[currentChapterIndex].lessons[currentLessonIndex - 1]
      } else if (currentChapterIndex > 0) {
        // Last lesson of previous chapter
        const prevChapter = curriculum[currentChapterIndex - 1]
        nextLesson = prevChapter.lessons[prevChapter.lessons.length - 1]
      }
    }
    
    if (nextLesson) {
      router.push(`/learn/${courseId}/${nextLesson.id}`)
    }
  }

  const handleBackToCourse = () => {
    // Navigate back to course overview
    router.push(`/learn/${courseId}`)
  }

  // Course completion modal handlers
  const handleViewCertificate = () => {
    setShowCompletionModal(false)
    router.push(`/profile/certificates`)
  }

  const handleDownloadCertificate = () => {
    // In a real implementation, this would trigger PDF download
    if (completedCertificateId) {
      toast({
        title: "Download Started",
        description: "Your certificate is being downloaded...",
      })
    }
  }

  const handleShareCertificate = () => {
    // In a real implementation, this would open sharing options
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
        // In a real app, this would save notes to the database
        console.log("Saving notes:", notes)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [notes])

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

      <div className="flex h-[calc(100vh-73px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Section */}
          <div className="relative bg-black">
            {/* Video Player */}
            <div className="relative aspect-video">
              {currentLesson.videoUrl ? (
                currentLesson.isYouTube ? (
                  <iframe
                    className="w-full h-full"
                    src={currentLesson.videoUrl}
                    title={currentLesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      setIsPlaying(false)
                      markLessonComplete()
                    }}
                  >
                    <source src={currentLesson.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No video available</p>
                    <p className="text-sm text-muted-foreground">The instructor hasn't uploaded a video for this lesson yet</p>
                  </div>
                </div>
              )}

              {/* Video Controls Overlay - Only show for non-YouTube videos */}
              {!currentLesson.isYouTube && currentLesson.videoUrl && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center space-x-4 text-white">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <span>{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-64 md:w-96"
                    />
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center space-x-2 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skipTime(-10)}
                      className="text-white hover:text-white hover:bg-white/20"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => skipTime(10)}
                      className="text-white hover:text-white hover:bg-white/20"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <select
                      value={playbackSpeed}
                      onChange={(e) => changePlaybackSpeed(parseFloat(e.target.value))}
                      className="bg-transparent text-white text-sm border border-white/30 rounded px-2 py-1"
                    >
                      <option value="0.5">0.5x</option>
                      <option value="0.75">0.75x</option>
                      <option value="1">1x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2">2x</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:text-white hover:bg-white/20"
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Lesson Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Lesson Header */}
              <div className="border-b p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
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
                    <span>•</span>
                    <span>{formatTime(currentLesson.duration)}</span>
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
              <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-4 m-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                    <TabsTrigger value="discussion">Discussion</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-auto p-4">
                    <TabsContent value="overview" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Lesson Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none">
                            <h3>HTML Document Structure</h3>
                            <p>
                              Every HTML document follows a basic structure that includes several key elements. 
                              Understanding this structure is fundamental to creating well-formed web pages.
                            </p>
                            <h4>The Basic Structure</h4>
                            <p>
                              An HTML document starts with a doctype declaration, followed by the root <code>&lt;html&gt;</code> element, 
                              which contains a <code>&lt;head&gt;</code> section and a <code>&lt;body&gt;</code> section.
                            </p>
                            <pre>
                              <code>{`<!DOCTYPE html>
<html>
<head>
    <title>Page Title</title>
</head>
<body>
    <h1>My First Heading</h1>
    <p>My first paragraph.</p>
</body>
</html>`}</code>
                            </pre>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Lesson Quiz</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Test your understanding with this quick quiz. You need 70% to pass.
                            </p>
                            <Button>Start Quiz</Button>
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
                            placeholder="Take notes while watching the video..."
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

                    <TabsContent value="discussion" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Lesson Discussion</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8">
                            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground mb-2">Discussion feature coming soon</p>
                            <p className="text-sm text-muted-foreground">Ask questions and interact with other students</p>
                          </div>
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
        <div className="w-80 border-l bg-muted/30 flex flex-col">
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
                      {chapter.lessons.map((lesson) => (
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
                          <div className="flex items-center space-x-2">
                            {lesson.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                            <span className={lesson.id === currentLesson.id ? "font-medium" : ""}>
                              {lesson.title}
                            </span>
                          </div>
                          <span className="text-xs">{lesson.duration}</span>
                        </div>
                      ))}
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