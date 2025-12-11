"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Award, 
  Trophy, 
  Star, 
  Download, 
  Share2, 
  Eye,
  Sparkles
} from "lucide-react"

interface CourseCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  courseTitle: string
  certificateId?: string
  onViewCertificate: () => void
  onDownloadCertificate: () => void
  onShareCertificate: () => void
}

export function CourseCompletionModal({
  isOpen,
  onClose,
  courseTitle,
  certificateId,
  onViewCertificate,
  onDownloadCertificate,
  onShareCertificate
}: CourseCompletionModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
      // Stop confetti after 4 seconds
      const timer = setTimeout(() => setShowConfetti(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <>
          {/* Left side confetti */}
          <div className="fixed top-0 left-0 w-32 h-full pointer-events-none z-50 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={`left-${i}`}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <div
                  className="w-3 h-3 rotate-45"
                  style={{
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
                    animation: `fall ${3 + Math.random() * 2}s linear infinite`
                  }}
                />
              </div>
            ))}
          </div>

          {/* Right side confetti */}
          <div className="fixed top-0 right-0 w-32 h-full pointer-events-none z-50 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={`right-${i}`}
                className="absolute animate-bounce"
                style={{
                  right: `${Math.random() * 100}%`,
                  top: `${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <div
                  className="w-3 h-3 rotate-45"
                  style={{
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
                    animation: `fall ${3 + Math.random() * 2}s linear infinite`
                  }}
                />
              </div>
            ))}
          </div>

          {/* Center burst confetti */}
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            {[...Array(30)].map((_, i) => (
              <div
                key={`center-${i}`}
                className="absolute"
                style={{
                  animation: `burst ${2 + Math.random()}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.5}s`
                }}
              >
                <Star 
                  className="w-4 h-4 text-yellow-400" 
                  style={{
                    transform: `rotate(${Math.random() * 360}deg)`
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              🎉 Congratulations!
            </DialogTitle>
            
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold text-foreground">
                You've successfully completed
              </div>
              <div className="text-xl font-bold text-primary">
                "{courseTitle}"
              </div>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Award className="w-3 h-3 mr-1" />
                  Course Completed
                </Badge>
                {certificateId && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Certificate Ready
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <p className="text-center text-muted-foreground">
              🎓 Your completion certificate has been generated and is ready to view!
            </p>

            <div className="flex flex-col space-y-3">
              <Button 
                onClick={onViewCertificate}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                View My Certificate
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={onDownloadCertificate}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onShareCertificate}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={onClose}
                className="w-full"
              >
                Continue Learning
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes burst {
          0% {
            transform: scale(0) translate(0, 0);
            opacity: 1;
          }
          100% {
            transform: scale(1) translate(${Math.random() * 400 - 200}px, ${Math.random() * 400 - 200}px);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}