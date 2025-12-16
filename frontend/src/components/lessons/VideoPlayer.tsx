'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  CheckCircle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface VideoPlayerProps {
  videoUrl: string
  title: string
  lessonId: string
  courseId: string
  onCompletion?: (data: any) => void
}

interface VideoInteraction {
  type: 'played' | 'paused' | 'seeked' | 'completed'
  position: number
  timestamp: string
}

/**
 * Enhanced Video Player Component
 * 
 * Wraps video playback with interaction tracking for xAPI statements.
 * Tracks play, pause, seek, and completion events.
 * 
 * Requirements: 4.5, 15.2, 15.3
 */
export function VideoPlayer({
  videoUrl,
  title,
  lessonId,
  courseId,
  onCompletion
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [watchProgress, setWatchProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [interactions, setInteractions] = useState<VideoInteraction[]>([])
  const lastInteractionRef = useRef<number>(0)

  // Track video interactions
  const trackInteraction = async (type: 'played' | 'paused' | 'seeked' | 'completed', position: number) => {
    try {
      const interaction: VideoInteraction = {
        type,
        position,
        timestamp: new Date().toISOString()
      }

      setInteractions(prev => [...prev, interaction])

      // Send to backend
      await fetch(`/api/lessons/${lessonId}/video/interaction/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          interaction_type: type,
          position,
          duration
        })
      })
    } catch (err) {
      console.error('Error tracking video interaction:', err)
    }
  }

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        trackInteraction('paused', videoRef.current.currentTime)
      } else {
        videoRef.current.play()
        trackInteraction('played', videoRef.current.currentTime)
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
      setWatchProgress((videoRef.current.currentTime / duration) * 100)
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
      trackInteraction('seeked', time)
    }
  }

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
      videoRef.current.currentTime = newTime
      trackInteraction('seeked', newTime)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen()
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

  const handleVideoEnd = async () => {
    setIsPlaying(false)
    setIsCompleted(true)
    trackInteraction('completed', duration)

    // Mark lesson as complete
    try {
      const response = await fetch(`/api/lessons/${lessonId}/mark-complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          duration,
          interactions: interactions.length
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Video Completed!',
          description: 'Great job! Your progress has been saved.'
        })

        if (onCompletion) {
          onCompletion(data)
        }
      }
    } catch (err) {
      console.error('Error marking video as complete:', err)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <div className="relative aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleVideoEnd}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
            <div className="space-y-2">
              {/* Progress Bar */}
              <div className="flex items-center space-x-2 text-white text-sm">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1"
                />
                <span>{formatTime(duration)}</span>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlay}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

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
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
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
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{title}</CardTitle>
            {isCompleted && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Completed</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Watch Progress</span>
              <span className="font-medium">{Math.round(watchProgress)}%</span>
            </div>
            <Progress value={watchProgress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-semibold">{formatTime(duration)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Watched</p>
              <p className="font-semibold">{formatTime(currentTime)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Interactions</p>
              <p className="font-semibold">{interactions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interaction History */}
      {interactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Interaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto text-sm">
              {interactions.slice(-10).reverse().map((interaction, index) => (
                <div key={index} className="flex justify-between text-muted-foreground">
                  <span className="capitalize">{interaction.type}</span>
                  <span>{formatTime(interaction.position)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
