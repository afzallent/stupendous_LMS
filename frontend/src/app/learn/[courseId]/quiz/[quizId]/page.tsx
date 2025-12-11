'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { djangoApi } from '@/lib/django-api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Trophy,
  RefreshCw,
  BookOpen
} from 'lucide-react'

interface QuestionOption {
  id: string
  option_text: string
}

interface Question {
  id: string
  question: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_THE_BLANK' | 'MULTIPLE_ANSWER'
  options: string[] | null
  optionsWithIds?: QuestionOption[] // Store full option data with IDs
  points: number
  order: number
}

interface Quiz {
  id: string
  title: string
  description: string | null
  passingScore: number
  questions: Question[]
  metadata?: {
    timeLimit?: number
    randomizeQuestions?: boolean
    showExplanations?: boolean
    allowRetakes?: boolean
    maxRetakes?: number
  }
}

interface QuizAttempt {
  id: string
  score: number
  maxScore: number
  passed: boolean
  completedAt: string
}

interface Answer {
  questionId: string
  answer: string | string[]
}

export default function QuizTakingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([])
  const [attemptCount, setAttemptCount] = useState(0)
  const [canRetake, setCanRetake] = useState(true)

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        // Fetch quiz details
        const quizData = await djangoApi.get<any>(`/api/quizzes/${params.quizId}/`)
        
        // Fetch user's previous attempts
        const attemptsData = await djangoApi.get<any>(`/api/quizzes/${params.quizId}/my-attempts/`)
        const quizAttempts = attemptsData
        
        // Transform backend data to frontend format
        const transformedQuiz: Quiz = {
          id: quizData.id.toString(),
          title: quizData.title,
          description: quizData.description,
          passingScore: quizData.passing_score,
          questions: quizData.questions.map((q: any) => ({
            id: q.id.toString(),
            question: q.question_text,
            type: q.question_type === 'multiple_choice' ? 'MULTIPLE_CHOICE' :
                  q.question_type === 'true_false' ? 'TRUE_FALSE' : 'FILL_IN_THE_BLANK',
            options: q.options?.map((o: any) => o.option_text) || null,
            optionsWithIds: q.options?.map((o: any) => ({
              id: o.id.toString(),
              option_text: o.option_text
            })) || [],
            points: q.points,
            order: q.order
          })),
          metadata: {
            timeLimit: quizData.time_limit,
            randomizeQuestions: false, // Not in backend model yet
            showExplanations: true, // Default
            allowRetakes: true, // Default
            maxRetakes: quizData.max_attempts
          }
        }

        setQuiz(transformedQuiz)
        
        // Transform attempts
        const transformedAttempts: QuizAttempt[] = quizAttempts.map((a: any) => ({
          id: a.id.toString(),
          score: parseFloat(a.score || 0),
          maxScore: a.max_score,
          passed: a.passed,
          completedAt: a.completed_at
        }))
        
        setPreviousAttempts(transformedAttempts)
        setAttemptCount(quizAttempts.length)

        // Check if student can retake
        if (quizAttempts.length >= quizData.max_attempts) {
          setCanRetake(false)
        }

        // Set timer if time limit exists
        if (quizData.time_limit) {
          setTimeRemaining(quizData.time_limit * 60) // Convert to seconds
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to load quiz',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [params.quizId, toast])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || showResults) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev && prev <= 1) {
          handleSubmit() // Auto-submit when time runs out
          return 0
        }
        return prev ? prev - 1 : null
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, showResults])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleMultipleAnswerChange = (questionId: string, option: string, checked: boolean) => {
    const currentAnswers = (answers[questionId] as string[]) || []

    if (checked) {
      handleAnswerChange(questionId, [...currentAnswers, option])
    } else {
      handleAnswerChange(questionId, currentAnswers.filter(a => a !== option))
    }
  }

  const handleSubmit = async () => {
    if (!quiz) return

    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter(q => !answers[q.id])
    if (unansweredQuestions.length > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredQuestions.length} unanswered question(s). Do you want to submit anyway?`
      )
      if (!confirmed) return
    }

    setIsSubmitting(true)

    try {
      // Transform answers to backend format
      const submissionAnswers = quiz.questions.map(question => {
        const answer = answers[question.id]
        if (!answer) return null
        
        // Find the option ID for the selected answer
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          // Find the option ID that matches the selected answer text
          const selectedOption = question.optionsWithIds?.find(
            opt => opt.option_text === answer
          )
          
          if (selectedOption) {
            return {
              question_id: parseInt(question.id),
              selected_option_id: parseInt(selectedOption.id)
            }
          }
        } else if (question.type === 'FILL_IN_THE_BLANK') {
          return {
            question_id: parseInt(question.id),
            text_answer: answer as string
          }
        } else {
          // MULTIPLE_ANSWER - for now use text answer
          return {
            question_id: parseInt(question.id),
            text_answer: Array.isArray(answer) ? answer.join(', ') : answer
          }
        }
        
        return null
      }).filter(a => a !== null) // Only include answered questions

      // Submit to backend
      const result = await djangoApi.post<any>(`/api/quizzes/${params.quizId}/submit/`, {
        answers: submissionAnswers
      })

      // Set result and show results page
      const quizResult: QuizAttempt = {
        id: result.id.toString(),
        score: parseFloat(result.score || 0),
        maxScore: result.max_score || 0,
        passed: result.passed || false,
        completedAt: result.completed_at
      }
      
      console.log('Quiz submission result:', result)
      console.log('Transformed quiz result:', quizResult)
      
      // Debug: Check if quiz has questions and points
      console.log('Quiz questions:', quiz.questions)
      console.log('Total questions:', quiz.questions.length)
      console.log('Questions with points:', quiz.questions.map(q => ({ id: q.id, points: q.points })))
      
      setQuizResult(quizResult)
      setShowResults(true)

      toast({
        title: result.passed ? 'Congratulations!' : 'Quiz Completed',
        description: result.passed
          ? `You passed with ${result.score}/${result.max_score} points!`
          : `You scored ${result.score}/${result.max_score} points. Keep practicing!`,
        variant: result.passed ? 'default' : 'destructive'
      })
    } catch (error: any) {
      console.error('Quiz submission error:', error)
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.detail || error.message
        
        if (errorMessage.includes('Maximum attempts')) {
          // Max attempts reached - show special handling
          setCanRetake(false)
          toast({
            title: 'Maximum Attempts Reached',
            description: errorMessage,
            variant: 'destructive'
          })
          
          // Redirect back to course after a delay
          setTimeout(() => {
            router.push(`/learn/${params.courseId}`)
          }, 3000)
        } else {
          toast({
            title: 'Cannot Submit Quiz',
            description: errorMessage,
            variant: 'destructive'
          })
        }
      } else {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to submit quiz',
          variant: 'destructive'
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetake = () => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setQuizResult(null)
    setShowResults(false)

    // Reset timer if applicable
    if (quiz?.metadata?.timeLimit) {
      setTimeRemaining(quiz.metadata.timeLimit * 60)
    }

    // Re-randomize questions if enabled
    if (quiz?.metadata?.randomizeQuestions) {
      const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5)
      setQuiz({ ...quiz, questions: shuffled })
    }
  }

  const goToNext = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Quiz not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (showResults && quizResult) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {quizResult.passed ? (
                <Trophy className="h-16 w-16 text-yellow-500" />
              ) : (
                <AlertCircle className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-3xl">
              {quizResult.passed ? 'Congratulations!' : 'Quiz Completed'}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {quiz.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {quizResult.maxScore === 0 ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">Quiz Configuration Issue</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    This quiz has no questions or questions with no points assigned. Please contact your instructor.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Your Score</p>
                  <p className="text-3xl font-bold">
                    {quizResult.score}/{quizResult.maxScore}
                  </p>
                  <p className="text-lg">
                    {((quizResult.score / quizResult.maxScore) * 100).toFixed(1)}%
                  </p>
                </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Passing Score</p>
                <p className="text-3xl font-bold">{quiz.passingScore}%</p>
                <Badge variant={quizResult.passed ? 'default' : 'destructive'} className={quizResult.passed ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                  {quizResult.passed ? 'PASSED' : 'NOT PASSED'}
                </Badge>
              </div>
              </div>
            )}

            {quiz.metadata?.showExplanations && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Review Answers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Here you would show detailed results with explanations */}
                  <p className="text-sm text-muted-foreground">
                    Detailed answer review would be shown here
                  </p>
                </CardContent>
              </Card>
            )}

            {previousAttempts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Previous Attempts</h3>
                <div className="space-y-1">
                  {previousAttempts.map((attempt, index) => (
                    <div key={attempt.id} className="flex justify-between text-sm">
                      <span>Attempt {index + 1}</span>
                      <span className={attempt.passed ? 'text-green-600' : 'text-red-600'}>
                        {attempt.score}/{attempt.maxScore} ({attempt.passed ? 'Passed' : 'Failed'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/learn/${params.courseId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Course
            </Button>
            {canRetake && (
              <Button onClick={handleRetake}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake Quiz
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const progressPercentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/learn/${params.courseId}`)}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold">Back to Course</span>
              </Button>
            </div>
            {timeRemaining !== null && (
              <Card className={`px-4 py-2 shadow-lg ${timeRemaining < 60 ? 'border-red-500 bg-red-50' : 'bg-white'}`}>
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${timeRemaining < 60 ? 'text-red-500' : 'text-primary'}`} />
                  <span className={`font-mono font-semibold ${timeRemaining < 60 ? 'text-red-500' : 'text-foreground'}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-muted-foreground text-lg">{quiz.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
              <span>{currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            <span>{currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg">{currentQuestion.question}</p>

          {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
            <RadioGroup
              value={answers[currentQuestion.id] as string || ''}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {currentQuestion.type === 'TRUE_FALSE' && (
            <RadioGroup
              value={answers[currentQuestion.id] as string || ''}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted">
                  <RadioGroupItem value="True" id="true" />
                  <Label htmlFor="true" className="cursor-pointer flex-1">True</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted">
                  <RadioGroupItem value="False" id="false" />
                  <Label htmlFor="false" className="cursor-pointer flex-1">False</Label>
                </div>
              </div>
            </RadioGroup>
          )}

          {currentQuestion.type === 'FILL_IN_THE_BLANK' && (
            <div className="space-y-2">
              <Input
                value={answers[currentQuestion.id] as string || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here"
                className="text-lg"
              />
            </div>
          )}

          {currentQuestion.type === 'MULTIPLE_ANSWER' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted">
                  <Checkbox
                    id={`multi-${index}`}
                    checked={(answers[currentQuestion.id] as string[] || []).includes(option)}
                    onCheckedChange={(checked) =>
                      handleMultipleAnswerChange(currentQuestion.id, option, checked as boolean)
                    }
                  />
                  <Label htmlFor={`multi-${index}`} className="cursor-pointer flex-1">
                    {option}
                  </Label>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">Select all that apply</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {/* Question navigation dots */}
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-primary'
                    : answers[quiz.questions[index].id]
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
                }`}
                aria-label={`Go to question ${index + 1}`}
              />
            ))}
          </div>

          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Quiz
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goToNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Quick navigation panel */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Question Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {quiz.questions.map((question, index) => (
              <Button
                key={question.id}
                variant={answers[question.id] ? 'default' : 'outline'}
                size="sm"
                className={`${
                  index === currentQuestionIndex ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-input rounded"></div>
              <span>Not answered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}