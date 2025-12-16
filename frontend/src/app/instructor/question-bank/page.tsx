'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { djangoApi } from '@/lib/django-api-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  Filter,
  Copy,
  Trash2,
  Edit,
  Eye,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  HelpCircle,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Question {
  id: string
  question: string
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_THE_BLANK' | 'MULTIPLE_ANSWER'
  points: number
  options?: string[]
  correctAnswer: string | string[]
  explanation?: string
  courseId: string
  courseName: string
  chapterName: string
  lessonName: string
  quizId: string
  quizTitle: string
  createdAt: string
  usage: number
}

interface QuestionBankData {
  questions: Question[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  statistics: {
    total: number
    typeDistribution: {
      type: string
      count: number
    }[]
  }
}

interface Course {
  id: string
  title: string
}

interface Quiz {
  id: string
  title: string
  lessonName: string
}

export default function QuestionBankPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statistics, setStatistics] = useState<any>(null)

  const [courses, setCourses] = useState<Course[]>([])
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([])

  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [targetQuizId, setTargetQuizId] = useState<string>('')

  useEffect(() => {
    fetchQuestions()
    fetchCourses()
  }, [currentPage, selectedType, selectedCourse, searchQuery])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })

      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedCourse !== 'all') params.append('courseId', selectedCourse)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/instructor/quiz/bank?${params}`)
      if (!response.ok) throw new Error('Failed to fetch questions')

      const data: QuestionBankData = await response.json()
      setQuestions(data.questions)
      setTotalPages(data.pagination.totalPages)
      setStatistics(data.statistics)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load question bank',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      // Fetch instructor's courses from Django
      const data = await djangoApi.get('/api/courses/my_courses/')
      setCourses(data.results || [])
    } catch (error) {
      console.error('Failed to fetch courses:', error)
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive"
      })
    }
  }

  const fetchQuizzesForCourse = async (courseId: string) => {
    try {
      const response = await fetch(`/api/instructor/quizzes?courseId=${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableQuizzes(data.quizzes || [])
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
    }
  }

  const handleCopyQuestion = async () => {
    if (!selectedQuestion || !targetQuizId) {
      toast({
        title: 'Error',
        description: 'Please select a target quiz',
        variant: 'destructive'
      })
      return
    }

    try {
      // Quiz feature not implemented in Django yet
      toast({
        title: 'Coming Soon',
        description: 'Quiz and question bank features are not yet implemented. Stay tuned!',
        variant: "default"
      })

      setCopyDialogOpen(false)
      setTargetQuizId('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy question',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion) return

    try {
      const response = await fetch(`/api/instructor/quiz/bank?questionId=${selectedQuestion.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete question')

      toast({
        title: 'Success',
        description: 'Question deleted successfully'
      })

      setDeleteDialogOpen(false)
      fetchQuestions() // Refresh the list
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete question',
        variant: 'destructive'
      })
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return <List className="h-4 w-4" />
      case 'TRUE_FALSE':
        return <CheckCircle className="h-4 w-4" />
      case 'FILL_IN_THE_BLANK':
        return <FileText className="h-4 w-4" />
      case 'MULTIPLE_ANSWER':
        return <HelpCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'default'
      case 'TRUE_FALSE':
        return 'secondary'
      case 'FILL_IN_THE_BLANK':
        return 'outline'
      case 'MULTIPLE_ANSWER':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Question Bank</h1>
        <p className="text-muted-foreground">
          Manage and reuse questions across your quizzes
        </p>
      </div>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>

          {statistics.typeDistribution.map((type: any) => (
            <Card key={type.type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getTypeIcon(type.type)}
                  {type.type.replace('_', ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{type.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                <SelectItem value="FILL_IN_THE_BLANK">Fill in the Blank</SelectItem>
                <SelectItem value="MULTIPLE_ANSWER">Multiple Answer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => router.push('/instructor/quiz/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Quiz
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No questions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search filters' : 'Create your first quiz to build your question bank'}
            </p>
            <Button onClick={() => router.push('/instructor/quiz/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getTypeBadgeVariant(question.type) as any}>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(question.type)}
                          {question.type.replace('_', ' ')}
                        </span>
                      </Badge>
                      <Badge variant="outline">{question.points} point{question.points > 1 ? 's' : ''}</Badge>
                    </div>

                    <p className="text-lg mb-3">{question.question}</p>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Course:</span> {question.courseName}</p>
                      <p><span className="font-medium">Quiz:</span> {question.quizTitle}</p>
                      <p><span className="font-medium">Lesson:</span> {question.lessonName}</p>
                    </div>

                    {question.type === 'MULTIPLE_CHOICE' && question.options && (
                      <div className="mt-3 space-y-1">
                        {question.options.map((option, idx) => (
                          <div key={idx} className="text-sm flex items-center gap-2">
                            <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                            <span className={option === question.correctAnswer ? 'text-green-600 font-medium' : ''}>
                              {option}
                            </span>
                            {option === question.correctAnswer && <CheckCircle className="h-3 w-3 text-green-600" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedQuestion(question)
                        setViewDialogOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedQuestion(question)
                        fetchQuizzesForCourse(question.courseId)
                        setCopyDialogOpen(true)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/instructor/quiz/edit?questionId=${question.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedQuestion(question)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* View Question Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">Question:</p>
                <p className="text-lg">{selectedQuestion.question}</p>
              </div>

              {selectedQuestion.options && (
                <div>
                  <p className="font-medium mb-2">Options:</p>
                  <div className="space-y-1">
                    {selectedQuestion.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-medium">{String.fromCharCode(65 + idx)}.</span>
                        <span className={
                          (Array.isArray(selectedQuestion.correctAnswer)
                            ? selectedQuestion.correctAnswer.includes(option)
                            : option === selectedQuestion.correctAnswer)
                            ? 'text-green-600 font-medium'
                            : ''
                        }>
                          {option}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="font-medium mb-2">Correct Answer:</p>
                <p className="text-green-600">
                  {Array.isArray(selectedQuestion.correctAnswer)
                    ? selectedQuestion.correctAnswer.join(', ')
                    : selectedQuestion.correctAnswer}
                </p>
              </div>

              {selectedQuestion.explanation && (
                <div>
                  <p className="font-medium mb-2">Explanation:</p>
                  <p>{selectedQuestion.explanation}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Type:</p>
                  <p>{selectedQuestion.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="font-medium">Points:</p>
                  <p>{selectedQuestion.points}</p>
                </div>
                <div>
                  <p className="font-medium">Course:</p>
                  <p>{selectedQuestion.courseName}</p>
                </div>
                <div>
                  <p className="font-medium">Quiz:</p>
                  <p>{selectedQuestion.quizTitle}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Copy Question Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Question to Quiz</DialogTitle>
            <DialogDescription>
              Select a quiz to copy this question to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={targetQuizId} onValueChange={setTargetQuizId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a quiz" />
              </SelectTrigger>
              <SelectContent>
                {availableQuizzes.map(quiz => (
                  <SelectItem key={quiz.id} value={quiz.id}>
                    {quiz.title} ({quiz.lessonName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopyQuestion} disabled={!targetQuizId}>
              Copy Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This will remove it from the quiz
              and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}