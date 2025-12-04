'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Plus, Save, ArrowLeft, GripVertical } from 'lucide-react'

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_THE_BLANK' | 'MULTIPLE_ANSWER'

interface Question {
  id: string
  question: string
  type: QuestionType
  options: string[]
  correctAnswer: string | string[]
  points: number
  explanation?: string
  order: number
}

interface QuizData {
  title: string
  description: string
  passingScore: number
  timeLimit?: number
  randomizeQuestions: boolean
  showExplanations: boolean
  allowRetakes: boolean
  maxRetakes?: number
  questions: Question[]
}

export default function CreateQuizPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lessonId = searchParams.get('lessonId')
  const courseId = searchParams.get('courseId')
  const { toast } = useToast()

  const [quizData, setQuizData] = useState<QuizData>({
    title: '',
    description: '',
    passingScore: 70,
    timeLimit: undefined,
    randomizeQuestions: false,
    showExplanations: true,
    allowRetakes: true,
    maxRetakes: 3,
    questions: []
  })

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: `q_${Date.now()}`,
    question: '',
    type: 'MULTIPLE_CHOICE',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1,
    explanation: '',
    order: 0
  })

  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings')

  const addQuestion = () => {
    if (!currentQuestion.question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question',
        variant: 'destructive'
      })
      return
    }

    if (currentQuestion.type === 'MULTIPLE_CHOICE' || currentQuestion.type === 'MULTIPLE_ANSWER') {
      const validOptions = currentQuestion.options.filter(opt => opt.trim() !== '')
      if (validOptions.length < 2) {
        toast({
          title: 'Error',
          description: 'Please provide at least 2 options',
          variant: 'destructive'
        })
        return
      }
      currentQuestion.options = validOptions
    }

    if (!currentQuestion.correctAnswer ||
        (Array.isArray(currentQuestion.correctAnswer) && currentQuestion.correctAnswer.length === 0)) {
      toast({
        title: 'Error',
        description: 'Please select the correct answer',
        variant: 'destructive'
      })
      return
    }

    setQuizData(prev => ({
      ...prev,
      questions: [...prev.questions, { ...currentQuestion, order: prev.questions.length }]
    }))

    // Reset current question
    setCurrentQuestion({
      id: `q_${Date.now()}`,
      question: '',
      type: 'MULTIPLE_CHOICE',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      explanation: '',
      order: 0
    })

    toast({
      title: 'Success',
      description: 'Question added to quiz'
    })
  }

  const removeQuestion = (id: string) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id).map((q, idx) => ({ ...q, order: idx }))
    }))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...quizData.questions]
    const newIndex = direction === 'up' ? index - 1 : index + 1

    if (newIndex >= 0 && newIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]]
      newQuestions.forEach((q, idx) => q.order = idx)
      setQuizData(prev => ({ ...prev, questions: newQuestions }))
    }
  }

  const handleQuestionTypeChange = (type: QuestionType) => {
    setCurrentQuestion(prev => {
      const updated = { ...prev, type }

      if (type === 'TRUE_FALSE') {
        updated.options = ['True', 'False']
        updated.correctAnswer = ''
      } else if (type === 'FILL_IN_THE_BLANK') {
        updated.options = []
        updated.correctAnswer = ''
      } else if (type === 'MULTIPLE_ANSWER') {
        updated.options = ['', '', '', '']
        updated.correctAnswer = []
      } else {
        updated.options = ['', '', '', '']
        updated.correctAnswer = ''
      }

      return updated
    })
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...currentQuestion.options]
    newOptions[index] = value
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
  }

  const handleMultipleAnswerChange = (option: string, checked: boolean) => {
    const currentAnswers = Array.isArray(currentQuestion.correctAnswer)
      ? currentQuestion.correctAnswer
      : []

    if (checked) {
      setCurrentQuestion(prev => ({
        ...prev,
        correctAnswer: [...currentAnswers, option]
      }))
    } else {
      setCurrentQuestion(prev => ({
        ...prev,
        correctAnswer: currentAnswers.filter((a: string) => a !== option)
      }))
    }
  }

  const saveQuiz = async () => {
    if (!quizData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a quiz title',
        variant: 'destructive'
      })
      return
    }

    if (quizData.questions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one question',
        variant: 'destructive'
      })
      return
    }

    if (!lessonId) {
      toast({
        title: 'Error',
        description: 'Lesson ID is missing',
        variant: 'destructive'
      })
      return
    }

    setIsSaving(true)

    try {
      // Quiz feature not implemented in Django yet
      toast({
        title: 'Coming Soon',
        description: 'Quiz creation feature is not yet implemented. Focus on creating great course content for now!',
        variant: 'default'
      })

      // Redirect back to course
      setTimeout(() => {
        router.push(`/instructor/courses/${courseId}`)
      }, 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create quiz',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Create Quiz</h1>
        </div>
        <Button onClick={saveQuiz} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'settings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('settings')}
        >
          Quiz Settings
        </Button>
        <Button
          variant={activeTab === 'questions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('questions')}
        >
          Questions ({quizData.questions.length})
        </Button>
      </div>

      {activeTab === 'settings' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  value={quizData.title}
                  onChange={(e) => setQuizData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter quiz title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quizData.description}
                  onChange={(e) => setQuizData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this quiz covers"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="passing">Passing Score (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="passing"
                    min={0}
                    max={100}
                    step={5}
                    value={[quizData.passingScore]}
                    onValueChange={([value]) => setQuizData(prev => ({ ...prev, passingScore: value }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-medium">{quizData.passingScore}%</span>
                </div>
              </div>

              <div>
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={quizData.timeLimit || ''}
                  onChange={(e) => setQuizData(prev => ({
                    ...prev,
                    timeLimit: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  placeholder="No time limit"
                  min={1}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiz Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="randomize"
                  checked={quizData.randomizeQuestions}
                  onCheckedChange={(checked) =>
                    setQuizData(prev => ({ ...prev, randomizeQuestions: checked as boolean }))
                  }
                />
                <Label htmlFor="randomize" className="cursor-pointer">
                  Randomize question order
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="explanations"
                  checked={quizData.showExplanations}
                  onCheckedChange={(checked) =>
                    setQuizData(prev => ({ ...prev, showExplanations: checked as boolean }))
                  }
                />
                <Label htmlFor="explanations" className="cursor-pointer">
                  Show explanations after submission
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="retakes"
                  checked={quizData.allowRetakes}
                  onCheckedChange={(checked) =>
                    setQuizData(prev => ({ ...prev, allowRetakes: checked as boolean }))
                  }
                />
                <Label htmlFor="retakes" className="cursor-pointer">
                  Allow retakes
                </Label>
              </div>

              {quizData.allowRetakes && (
                <div>
                  <Label htmlFor="maxRetakes">Maximum Retakes</Label>
                  <Input
                    id="maxRetakes"
                    type="number"
                    value={quizData.maxRetakes || ''}
                    onChange={(e) => setQuizData(prev => ({
                      ...prev,
                      maxRetakes: e.target.value ? parseInt(e.target.value) : undefined
                    }))}
                    placeholder="Unlimited"
                    min={1}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Question</CardTitle>
              <CardDescription>Create questions for your quiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="questionType">Question Type</Label>
                <Select value={currentQuestion.type} onValueChange={handleQuestionTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                    <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                    <SelectItem value="FILL_IN_THE_BLANK">Fill in the Blank</SelectItem>
                    <SelectItem value="MULTIPLE_ANSWER">Multiple Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="questionText">Question</Label>
                <Textarea
                  id="questionText"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter your question"
                  rows={2}
                />
              </div>

              {(currentQuestion.type === 'MULTIPLE_CHOICE' || currentQuestion.type === 'MULTIPLE_ANSWER') && (
                <div className="space-y-2">
                  <Label>Answer Options</Label>
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {currentQuestion.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newOptions = currentQuestion.options.filter((_, i) => i !== index)
                            setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuestion(prev => ({
                      ...prev,
                      options: [...prev.options, '']
                    }))}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              )}

              {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                <div>
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={currentQuestion.correctAnswer as string}
                    onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: value }))}
                  >
                    {currentQuestion.options.filter(opt => opt.trim()).map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {currentQuestion.type === 'MULTIPLE_ANSWER' && (
                <div>
                  <Label>Correct Answers (Select all that apply)</Label>
                  <div className="space-y-2">
                    {currentQuestion.options.filter(opt => opt.trim()).map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`multi-option-${index}`}
                          checked={(currentQuestion.correctAnswer as string[])?.includes(option) || false}
                          onCheckedChange={(checked) => handleMultipleAnswerChange(option, checked as boolean)}
                        />
                        <Label htmlFor={`multi-option-${index}`} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.type === 'TRUE_FALSE' && (
                <div>
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={currentQuestion.correctAnswer as string}
                    onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: value }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="True" id="true" />
                      <Label htmlFor="true" className="cursor-pointer">True</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="False" id="false" />
                      <Label htmlFor="false" className="cursor-pointer">False</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {currentQuestion.type === 'FILL_IN_THE_BLANK' && (
                <div>
                  <Label htmlFor="fillAnswer">Correct Answer</Label>
                  <Input
                    id="fillAnswer"
                    value={currentQuestion.correctAnswer as string}
                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    placeholder="Enter the correct answer"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use underscores (_____) in the question to indicate blanks
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    value={currentQuestion.points}
                    onChange={(e) => setCurrentQuestion(prev => ({
                      ...prev,
                      points: parseInt(e.target.value) || 1
                    }))}
                    min={1}
                  />
                </div>
                <div>
                  <Label htmlFor="explanation">Explanation (Optional)</Label>
                  <Input
                    id="explanation"
                    value={currentQuestion.explanation}
                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain the correct answer"
                  />
                </div>
              </div>

              <Button onClick={addQuestion} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </CardContent>
          </Card>

          {quizData.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quiz Questions</CardTitle>
                <CardDescription>
                  Total Points: {quizData.questions.reduce((sum, q) => sum + q.points, 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quizData.questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Q{index + 1}.</span>
                            <span className="text-sm text-muted-foreground">
                              ({question.type.replace('_', ' ')}) - {question.points} point{question.points > 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="mb-2">{question.question}</p>

                          {question.type === 'MULTIPLE_CHOICE' && (
                            <div className="ml-4 space-y-1">
                              {question.options.map((opt, idx) => (
                                <div key={idx} className={`text-sm ${opt === question.correctAnswer ? 'text-green-600 font-medium' : ''}`}>
                                  {String.fromCharCode(65 + idx)}. {opt}
                                  {opt === question.correctAnswer && ' ✓'}
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === 'MULTIPLE_ANSWER' && (
                            <div className="ml-4 space-y-1">
                              {question.options.map((opt, idx) => (
                                <div key={idx} className={`text-sm ${(question.correctAnswer as string[]).includes(opt) ? 'text-green-600 font-medium' : ''}`}>
                                  {String.fromCharCode(65 + idx)}. {opt}
                                  {(question.correctAnswer as string[]).includes(opt) && ' ✓'}
                                </div>
                              ))}
                            </div>
                          )}

                          {question.type === 'TRUE_FALSE' && (
                            <p className="ml-4 text-sm">
                              Correct Answer: <span className="font-medium text-green-600">{question.correctAnswer}</span>
                            </p>
                          )}

                          {question.type === 'FILL_IN_THE_BLANK' && (
                            <p className="ml-4 text-sm">
                              Answer: <span className="font-medium text-green-600">{question.correctAnswer}</span>
                            </p>
                          )}

                          {question.explanation && (
                            <p className="ml-4 mt-2 text-sm text-muted-foreground">
                              Explanation: {question.explanation}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestion(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestion(index, 'down')}
                            disabled={index === quizData.questions.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}