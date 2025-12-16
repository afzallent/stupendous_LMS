'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { djangoApi } from '@/lib/django-api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Plus,
  FileQuestion,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle,
  GripVertical,
  Check,
  X,
} from 'lucide-react'

interface Quiz {
  id: number
  course: number
  chapter_id: number | null
  title: string
  description: string
  passing_score: number
  time_limit: number | null
  max_attempts: number
  is_active: boolean
  question_count?: number
}

interface QuestionOption {
  id?: number
  option_text: string
  is_correct: boolean
  order: number
}

interface Question {
  id: number
  quiz: number
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer'
  points: number
  order: number
  explanation: string
  options: QuestionOption[]
}


/**
 * Quiz Editor Page - Manages quiz questions
 * Requirements: 5.4
 */
export default function QuizEditorPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const quizId = params.quizId as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Question dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null)

  // Fetch quiz and questions
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const quizData = await djangoApi.get<Quiz & { questions: Question[] }>(`/api/quizzes/${quizId}/`)
      setQuiz(quizData)
      setQuestions(quizData.questions || [])
    } catch (err: any) {
      console.error('Error fetching quiz data:', err)
      if (err.status === 404) {
        setError('Quiz not found')
      } else if (err.status === 403) {
        setError('You don\'t have permission to edit this quiz')
      } else {
        setError(err.message || 'Failed to load quiz')
      }
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Question CRUD operations
  const handleCreateQuestion = async (data: Partial<Question>) => {
    setIsSaving(true)
    try {
      await djangoApi.post(`/api/quizzes/${quizId}/questions/`, data)
      await fetchData()
      setQuestionDialogOpen(false)
    } catch (err: any) {
      console.error('Error creating question:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateQuestion = async (data: Partial<Question>) => {
    if (!editingQuestion) return
    
    setIsSaving(true)
    try {
      await djangoApi.patch(`/api/quizzes/${quizId}/questions/${editingQuestion.id}/`, data)
      await fetchData()
      setQuestionDialogOpen(false)
      setEditingQuestion(null)
    } catch (err: any) {
      console.error('Error updating question:', err)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!deletingQuestion) return
    
    setIsSaving(true)
    try {
      await djangoApi.delete(`/api/quizzes/${quizId}/questions/${deletingQuestion.id}/`)
      await fetchData()
      setDeleteDialogOpen(false)
      setDeletingQuestion(null)
    } catch (err: any) {
      console.error('Error deleting question:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Open dialogs
  const openAddQuestionDialog = () => {
    setEditingQuestion(null)
    setQuestionDialogOpen(true)
  }

  const openEditQuestionDialog = (question: Question) => {
    setEditingQuestion(question)
    setQuestionDialogOpen(true)
  }

  const openDeleteQuestionDialog = (question: Question) => {
    setDeletingQuestion(question)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-24 w-full mb-2" />
          <Skeleton className="h-24 w-full mb-2" />
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium mb-4">{error || 'Quiz not found'}</p>
          <Button onClick={() => router.push(`/instructor/courses/${courseId}/edit`)}>
            Back to Course Editor
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/instructor/courses/${courseId}/edit`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <FileQuestion className="h-5 w-5" />
                  {quiz.title}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                    {quiz.is_active ? 'Active' : 'Draft'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {questions.length} questions • {quiz.passing_score}% to pass
                  </span>
                </div>
              </div>
            </div>
            <Button onClick={openAddQuestionDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Quiz Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
            <CardDescription>{quiz.description || 'No description'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Passing Score:</span>
                <span className="ml-2 font-medium">{quiz.passing_score}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time Limit:</span>
                <span className="ml-2 font-medium">
                  {quiz.time_limit ? `${quiz.time_limit} minutes` : 'No limit'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Max Attempts:</span>
                <span className="ml-2 font-medium">{quiz.max_attempts}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No questions yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add questions to your quiz to assess student understanding.
                </p>
                <Button onClick={openAddQuestionDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                onEdit={() => openEditQuestionDialog(question)}
                onDelete={() => openDeleteQuestionDialog(question)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Question Dialog */}
      <QuestionDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        question={editingQuestion}
        onSave={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion} disabled={isSaving}>
              {isSaving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * QuestionCard component displays a single question
 */
interface QuestionCardProps {
  question: Question
  index: number
  onEdit: () => void
  onDelete: () => void
}

function QuestionCard({ question, index, onEdit, onDelete }: QuestionCardProps) {
  const questionTypeLabels = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True/False',
    short_answer: 'Short Answer',
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {questionTypeLabels[question.question_type]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {question.points} {question.points === 1 ? 'point' : 'points'}
              </Badge>
            </div>
            <p className="font-medium mb-2">{question.question_text}</p>
            
            {/* Options for multiple choice / true-false */}
            {question.options && question.options.length > 0 && (
              <div className="space-y-1 mt-3">
                {question.options.map((option, optIndex) => (
                  <div
                    key={optIndex}
                    className={`flex items-center gap-2 text-sm p-2 rounded ${
                      option.is_correct ? 'bg-green-50 text-green-700' : 'bg-muted/50'
                    }`}
                  >
                    {option.is_correct ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.option_text}</span>
                  </div>
                ))}
              </div>
            )}

            {question.explanation && (
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-medium">Explanation:</span> {question.explanation}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Question
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Question
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}


/**
 * QuestionDialog component for creating and editing questions
 */
interface QuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: Question | null
  onSave: (data: Partial<Question>) => Promise<void>
  isLoading?: boolean
}

function QuestionDialog({
  open,
  onOpenChange,
  question,
  onSave,
  isLoading = false,
}: QuestionDialogProps) {
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice')
  const [points, setPoints] = useState(1)
  const [explanation, setExplanation] = useState('')
  const [options, setOptions] = useState<QuestionOption[]>([
    { option_text: '', is_correct: false, order: 0 },
    { option_text: '', is_correct: false, order: 1 },
  ])
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens/closes or question changes
  useEffect(() => {
    if (open) {
      if (question) {
        setQuestionText(question.question_text)
        setQuestionType(question.question_type)
        setPoints(question.points)
        setExplanation(question.explanation || '')
        setOptions(question.options.length > 0 ? question.options : [
          { option_text: '', is_correct: false, order: 0 },
          { option_text: '', is_correct: false, order: 1 },
        ])
      } else {
        setQuestionText('')
        setQuestionType('multiple_choice')
        setPoints(1)
        setExplanation('')
        setOptions([
          { option_text: '', is_correct: false, order: 0 },
          { option_text: '', is_correct: false, order: 1 },
        ])
      }
      setError(null)
    }
  }, [open, question])

  // Handle question type change
  useEffect(() => {
    if (questionType === 'true_false') {
      setOptions([
        { option_text: 'True', is_correct: false, order: 0 },
        { option_text: 'False', is_correct: false, order: 1 },
      ])
    } else if (questionType === 'short_answer') {
      setOptions([])
    }
  }, [questionType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!questionText.trim()) {
      setError('Question text is required')
      return
    }

    if (questionType !== 'short_answer') {
      const hasCorrect = options.some(o => o.is_correct)
      if (!hasCorrect) {
        setError('At least one correct answer is required')
        return
      }

      const hasEmptyOption = options.some(o => !o.option_text.trim())
      if (hasEmptyOption) {
        setError('All options must have text')
        return
      }
    }

    try {
      await onSave({
        question_text: questionText.trim(),
        question_type: questionType,
        points,
        explanation: explanation.trim(),
        options: questionType !== 'short_answer' ? options : [],
      })
    } catch (err: any) {
      setError(err.message || 'Failed to save question')
    }
  }

  const addOption = () => {
    setOptions([...options, { option_text: '', is_correct: false, order: options.length }])
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, field: keyof QuestionOption, value: any) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setOptions(newOptions)
  }

  const isEditing = question !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Question' : 'Add Question'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the question details below.' : 'Create a new question for this quiz.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Question Type */}
            <div className="grid gap-2">
              <Label htmlFor="questionType">Question Type</Label>
              <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True/False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question Text */}
            <div className="grid gap-2">
              <Label htmlFor="questionText">Question *</Label>
              <Textarea
                id="questionText"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Points */}
            <div className="grid gap-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                disabled={isLoading}
                className="w-24"
              />
            </div>

            {/* Options (for multiple choice and true/false) */}
            {questionType !== 'short_answer' && (
              <div className="grid gap-2">
                <Label>Answer Options</Label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={option.is_correct}
                        onChange={(e) => updateOption(index, 'is_correct', e.target.checked)}
                        disabled={isLoading || questionType === 'true_false'}
                        className="h-4 w-4"
                      />
                      <Input
                        value={option.option_text}
                        onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        disabled={isLoading || questionType === 'true_false'}
                        className="flex-1"
                      />
                      {questionType === 'multiple_choice' && options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {questionType === 'multiple_choice' && (
                  <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={isLoading}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Check the box next to the correct answer(s)
                </p>
              </div>
            )}

            {/* Explanation */}
            <div className="grid gap-2">
              <Label htmlFor="explanation">Explanation (shown after answering)</Label>
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Optional explanation for the correct answer..."
                rows={2}
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
