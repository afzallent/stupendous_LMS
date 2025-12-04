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

  // Mock data
  const course = {
    id: courseId,
    title: "Complete Web Development Bootcamp",
    instructor: "Dr. Sarah Chen",
    totalLessons: 320,
    completedLessons: 45,
    progress: 14
  }

  const currentLesson = {
    id: lessonId,
    title: "HTML Document Structure",
    description: "Learn the fundamental structure of HTML documents including doctype, html, head, and body elements.",
    duration: 925, // 15:25 in seconds
    videoUrl: "/api/placeholder/video",
    completed: false,
    order: 4,
    chapter: {
      id: "2",
      title: "HTML5 Fundamentals",
      order: 2
    }
  }

  const curriculum = [
    {
      id: "1",
      title: "Getting Started with Web Development",
      order: 1,
      lessons: [
        { id: "1-1", title: "Course Introduction and Roadmap", duration: "12:45", completed: true },
        { id: "1-2", title: "Setting Up Your Development Environment", duration: "18:30", completed: true },
        { id: "1-3", title: "Web Development Basics: HTML, CSS, JavaScript", duration: "25:15", completed: true }
      ]
    },
    {
      id: "2",
      title: "HTML5 Fundamentals",
      order: 2,
      lessons: [
        { id: "2-1", title: "HTML Document Structure", duration: "15:20", completed: false, current: true },
        { id: "2-2", title: "Text and Semantic Elements", duration: "22:10", completed: false },
        { id: "2-3", title: "Forms and Input Validation", duration: "28:45", completed: false },
        { id: "2-4", title: "HTML5 Best Practices", duration: "16:30", completed: false }
      ]
    },
    {
      id: "3",
      title: "CSS3 and Responsive Design",
      order: 3,
      lessons: [
        { id: "3-1", title: "CSS Selectors and Properties", duration: "20:15", completed: false },
        { id: "3-2", title: "Flexbox Layout", duration: "24:40", completed: false },
        { id: "3-3", title: "CSS Grid", duration: "26:55", completed: false },
        { id: "3-4", title: "Media Queries and Responsive Design", duration: "30:20", completed: false }
      ]
    }
  ]

  const resources = [
    { id: "1", title: "HTML Cheat Sheet", type: "pdf", size: "2.4 MB" },
    { id: "2", title: "Exercise Files", type: "zip", size: "15.8 MB" },
    { id: "3", title: "HTML Reference Links", type: "txt", size: "4 KB" }
  ]

  const quiz = {
    id: "quiz-1",
    title: "HTML Document Structure Quiz",
    questions: [
      {
        id: "q1",
        question: "Which HTML tag defines the root of an HTML document?",
        options: ["<body>", "<html>", "<head>", "<document>"],
        correctAnswer: 1
      },
      {
        id: "q2",
        question: "Where should the <title> tag be placed?",
        options: ["In the <body> section", "In the <head> section", "Outside the <html> tag", "In the <footer> section"],
        correctAnswer: 1
      }
    ]
  }

  const discussions = [
    {
      id: "1",
      user: "John Doe",
      question: "Can we have multiple <body> tags in an HTML document?",
      timestamp: "2 hours ago",
      replies: 3
    },
    {
      id: "2",
      user: "Jane Smith",
      question: "What's the difference between <div> and <span>?",
      timestamp: "5 hours ago",
      replies: 7
    }
  ]

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
      // Update progress in database
      const response = await fetch('/api/student/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          lessonId: lessonId,
          progressPercentage: 100,
          completed: true,
          watchTime: Math.floor(duration), // In a real app, this would be the actual watch time
          lastPosition: Math.floor(duration)
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update progress')
      }
      
      const data = await response.json()
      console.log('Progress updated:', data)
      
      // If certificate was generated (course completed), show notification
      if (data.data.certificate) {
        alert('Congratulations! You have completed the course. Your certificate has been generated.')
        // Optionally redirect to certificate page
        // router.push(`/certificates/${data.data.certificate.certificateId}`)
      }
    } catch (error) {
      console.error('Error updating progress:', error)
      alert('Failed to update progress. Please try again.')
    }
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
              <Button variant="outline" size="sm">
                <Award className="h-4 w-4 mr-2" />
                My Certificate
              </Button>
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

              {/* Video Controls Overlay */}
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
                      disabled={currentLesson.order === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateLesson("next")}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
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
                          <div className="space-y-3">
                            {resources.map((resource) => (
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
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="discussion" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Lesson Discussion</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                placeholder="Ask a question about this lesson..."
                                className="flex-1 px-3 py-2 border rounded-md"
                              />
                              <Button>Post</Button>
                            </div>
                            
                            <div className="space-y-4">
                              {discussions.map((discussion) => (
                                <div key={discussion.id} className="border rounded-lg p-4">
                                  <div className="flex items-start space-x-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback>{discussion.user.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-medium">{discussion.user}</h4>
                                        <span className="text-sm text-muted-foreground">{discussion.timestamp}</span>
                                      </div>
                                      <p className="text-sm mb-2">{discussion.question}</p>
                                      <Button variant="ghost" size="sm" className="text-xs">
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        {discussion.replies} replies
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
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
    </div>
  )
}