"use client"

import { useState, useRef, useEffect, use, useCallback } from "react"
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
  ArrowLeft,
  Maximize2,
  Minimize2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { djangoApi } from "@/lib/django-api-client"
import { toast } from "@/hooks/use-toast"
import { CourseCompletionModal } from "@/components/course-completion-modal"
import { BrandMark } from "@/lib/branding"

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export default function LearnPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const youtubePlayerRef = useRef<any>(null)
  const progressCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notes, setNotes] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [videoSize, setVideoSize] = useState<"theater" | "normal">("normal")
  const [youtubeProgress, setYoutubeProgress] = useState(0)
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false)
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en')

  const { courseId, lessonId } = use(params)

  const [course, setCourse] = useState<any>(null)
  const [currentLesson, setCurrentLesson] = useState<any>(null)
  const [curriculum, setCurriculum] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completedCertificateId, setCompletedCertificateId] = useState<string | null>(null)

  // Load user's preferred language
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        if (userData.preferred_language) {
          setPreferredLanguage(userData.preferred_language)
        }
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  // Fetch course and lesson data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const courseData = await djangoApi.get<any>(`/api/courses/${courseId}/`)
        const lessonData = await djangoApi.get<any>(`/api/lessons/${lessonId}/`)
        
        setCourse({
          id: courseData.id,
          title: courseData.title,
          instructor: courseData.instructor?.username || 'Instructor',
          totalLessons: courseData.lessons?.length || 0,
          completedLessons: 0,
          progress: 0
        })
        
        let videoUrl = lessonData.video_url || lessonData.video_file || ''
        if (videoUrl) videoUrl = videoUrl.trim()
        
        const isYouTube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))
        
        if (isYouTube && videoUrl) {
          if (videoUrl.includes('watch?v=')) {
            const videoId = videoUrl.split('watch?v=')[1]?.split('&')[0]
            videoUrl = `https://www.youtube.com/embed/${videoId}`
          } else if (videoUrl.includes('youtu.be/')) {
            const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]
            videoUrl = `https://www.youtube.com/embed/${videoId}`
          }
          
          // Add language parameters
          const storedUser = localStorage.getItem('user')
          let langCode = 'en'
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser)
              langCode = userData.preferred_language || 'en'
            } catch (e) {}
          }
          const separator = videoUrl.includes('?') ? '&' : '?'
          videoUrl = `${videoUrl}${separator}hl=${langCode}&cc_lang_pref=${langCode}&cc_load_policy=1`
        }
        
        setCurrentLesson({
          id: lessonData.id,
          title: lessonData.title,
          description: lessonData.content || '',
          duration: 0,
          videoUrl: videoUrl,
          isYouTube: isYouTube,
          completed: false,
          order: lessonData.order,
          chapter: { id: courseData.id.toString(), title: courseData.title, order: 1 }
        })
        
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
            current: lesson.id.toString() === lessonId
          }))
        }])
        
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({ title: "Error", description: "Failed to load lesson data", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [courseId, lessonId])

  const resources: any[] = []

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
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
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration)
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const markLessonComplete = useCallback(async () => {
    if (hasAutoCompleted) return
    
    try {
      const data = await djangoApi.post<any>(`/api/lessons/${lessonId}/mark-complete/`)
      setHasAutoCompleted(true)
      toast({ title: "Lesson Complete!", description: "Great job! Your progress has been saved." })
      
      if (data.course_progress?.course_completed) {
        toast({ title: "🎉 Course Completed!", description: `Amazing! You've finished all lessons!`, duration: 5000 })
        try {
          const certificateResponse = await djangoApi.post<any>('/api/certificates/', { course_id: courseId })
          setTimeout(() => {
            toast({ title: "📜 Certificate Generated!", description: `Your certificate is ready!`, duration: 5000 })
            setCompletedCertificateId(certificateResponse.certificate_id || certificateResponse.id)
            setShowCompletionModal(true)
          }, 2000)
        } catch (certError) {
          setTimeout(() => {
            toast({ title: "📜 Certificate Available", description: `Visit your profile to generate your certificate.`, duration: 5000 })
            setShowCompletionModal(true)
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }, [lessonId, courseId, hasAutoCompleted])

  const getYouTubeVideoId = (url: string): string | null => {
    if (!url) return null
    const match = url.match(/(?:embed\/|v=|youtu\.be\/)([^?&]+)/)
    return match ? match[1] : null
  }

  // YouTube IFrame API
  useEffect(() => {
    if (!currentLesson?.isYouTube || !currentLesson?.videoUrl) return
    
    const videoId = getYouTubeVideoId(currentLesson.videoUrl)
    if (!videoId) return

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (youtubePlayerRef.current) youtubePlayerRef.current.destroy()

      const container = document.getElementById('youtube-player')
      if (!container) return

      youtubePlayerRef.current = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
          hl: preferredLanguage,
          cc_lang_pref: preferredLanguage,
          cc_load_policy: 1
        },
        events: {
          onReady: (event: any) => setDuration(event.target.getDuration()),
          onStateChange: (event: any) => {
            if (event.data === 1) { setIsPlaying(true); startProgressTracking() }
            else if (event.data === 2) { setIsPlaying(false); stopProgressTracking() }
            else if (event.data === 0) { setIsPlaying(false); stopProgressTracking(); if (!hasAutoCompleted) markLessonComplete() }
          }
        }
      })
    }

    const startProgressTracking = () => {
      if (progressCheckIntervalRef.current) return
      progressCheckIntervalRef.current = setInterval(() => {
        if (youtubePlayerRef.current?.getCurrentTime) {
          const current = youtubePlayerRef.current.getCurrentTime()
          const total = youtubePlayerRef.current.getDuration()
          if (total > 0) {
            const progress = (current / total) * 100
            setYoutubeProgress(progress)
            setCurrentTime(current)
            setDuration(total)
            if (progress >= 95 && !hasAutoCompleted) markLessonComplete()
          }
        }
      }, 1000)
    }

    const stopProgressTracking = () => {
      if (progressCheckIntervalRef.current) {
        clearInterval(progressCheckIntervalRef.current)
        progressCheckIntervalRef.current = null
      }
    }

    if (window.YT?.Player) initPlayer()
    else window.onYouTubeIframeAPIReady = initPlayer

    return () => {
      stopProgressTracking()
      if (youtubePlayerRef.current) { youtubePlayerRef.current.destroy(); youtubePlayerRef.current = null }
    }
  }, [currentLesson?.isYouTube, currentLesson?.videoUrl, hasAutoCompleted, markLessonComplete, preferredLanguage])

  useEffect(() => {
    setHasAutoCompleted(false)
    setYoutubeProgress(0)
  }, [lessonId])

  const isFirstLesson = () => {
    if (curriculum.length === 0) return true
    return curriculum[0].lessons[0]?.id === lessonId
  }

  const isLastLesson = () => {
    if (curriculum.length === 0) return true
    const lastChapter = curriculum[curriculum.length - 1]
    return lastChapter.lessons[lastChapter.lessons.length - 1]?.id === lessonId
  }

  const navigateLesson = (direction: "prev" | "next") => {
    let currentChapterIndex = -1, currentLessonIndex = -1
    for (let i = 0; i < curriculum.length; i++) {
      const lessonIndex = curriculum[i].lessons.findIndex((l: any) => l.id === lessonId)
      if (lessonIndex !== -1) { currentChapterIndex = i; currentLessonIndex = lessonIndex; break }
    }
    if (currentChapterIndex === -1) return
    
    let nextLesson: any = null
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
    if (nextLesson) router.push(`/learn/${courseId}/${nextLesson.id}`)
  }

  const handleBackToCourse = () => router.push(`/learn/${courseId}`)

  const handleViewCertificate = () => { setShowCompletionModal(false); router.push(`/profile/certificates`) }
  const handleDownloadCertificate = () => { if (completedCertificateId) toast({ title: "Download Started", description: "Your certificate is being downloaded..." }) }
  const handleShareCertificate = () => {
    if (completedCertificateId) {
      navigator.clipboard.writeText(`${window.location.origin}/certificates/${completedCertificateId}`)
      toast({ title: "Link Copied!", description: "Certificate link copied to clipboard" })
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { if (notes.trim()) console.log("Saving notes:", notes) }, 2000)
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Compact Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/learn" className="flex items-center gap-2">
                <BrandMark logoClassName="h-6 w-6 text-primary" textClassName="font-bold hidden sm:inline" href={null} />
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[300px]">
                {course.title}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleBackToCourse}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content Area */}
        <div className={`flex-1 ${videoSize === 'theater' ? '' : 'max-w-5xl mx-auto'}`}>
          {/* Video Section */}
          <div className={`bg-black ${videoSize === 'theater' ? 'w-full' : ''}`}>
            <div className={`relative ${videoSize === 'theater' ? 'aspect-video max-h-[70vh]' : 'aspect-video max-h-[450px]'} mx-auto`}>
              {currentLesson.videoUrl ? (
                currentLesson.isYouTube ? (
                  <iframe
                    id="youtube-player"
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
                    onEnded={() => { setIsPlaying(false); markLessonComplete() }}
                    controls
                  >
                    <source src={currentLesson.videoUrl} type="video/mp4" />
                  </video>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                  <div className="text-center text-white">
                    <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm opacity-70">No video available</p>
                  </div>
                </div>
              )}
              
              {/* Theater Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVideoSize(videoSize === 'theater' ? 'normal' : 'theater')}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white h-8 px-3"
              >
                {videoSize === 'theater' ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Lesson Info & Content */}
          <div className="p-6">
            {/* Lesson Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
                <p className="text-muted-foreground">{currentLesson.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>Chapter {currentLesson.chapter.order}: {currentLesson.chapter.title}</span>
                  <span>•</span>
                  <span>Lesson {currentLesson.order}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateLesson("prev")} disabled={isFirstLesson()}>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Previous</span>
                </Button>
                <Button 
                  variant={currentLesson.completed || hasAutoCompleted ? "secondary" : "default"} 
                  size="sm"
                  onClick={markLessonComplete}
                >
                  {currentLesson.completed || hasAutoCompleted ? (
                    <><CheckCircle className="h-4 w-4 mr-1" />Completed</>
                  ) : (
                    "Mark Complete"
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateLesson("next")} disabled={isLastLesson()}>
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="discussion">Discussion</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p>{currentLesson.description || "This lesson covers important concepts. Watch the video above to learn more."}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Take notes while watching..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Notes are auto-saved</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources">
                <Card>
                  <CardHeader>
                    <CardTitle>Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {resources.length > 0 ? (
                      <div className="space-y-3">
                        {resources.map((resource: any) => (
                          <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <h4 className="font-medium">{resource.title}</h4>
                                <p className="text-sm text-muted-foreground">{resource.type}</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Download</Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No resources for this lesson</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discussion">
                <Card>
                  <CardHeader>
                    <CardTitle>Discussion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">Discussion coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sidebar - Course Content */}
        {videoSize !== 'theater' && (
          <div className="hidden lg:block w-80 border-l bg-white dark:bg-slate-900 overflow-y-auto sticky top-[57px] h-[calc(100vh-57px)]">
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-3">Course Progress</h3>
              <div className="flex justify-between text-sm mb-2">
                <span>{course.completedLessons} of {course.totalLessons}</span>
                <span>{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="h-2" />
            </div>

            <div className="p-4">
              <h3 className="font-semibold mb-3">Course Content</h3>
              <div className="space-y-1">
                {curriculum.map((chapter) => (
                  <div key={chapter.id}>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {chapter.order}. {chapter.title}
                    </p>
                    {chapter.lessons.map((lesson: any) => (
                      <div
                        key={lesson.id}
                        onClick={() => lesson.id !== currentLesson.id && router.push(`/learn/${courseId}/${lesson.id}`)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                          lesson.id === currentLesson.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1">{lesson.title}</span>
                        <span className="text-xs opacity-70">{lesson.duration}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
