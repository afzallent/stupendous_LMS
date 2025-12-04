'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  ArrowLeft,
  Download,
  Users,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Mail
} from 'lucide-react'

interface QuizResults {
  quiz: {
    id: string
    title: string
    description: string | null
    passingScore: number
    questionCount: number
    totalPoints: number
    course: { id: string; title: string }
    lesson: { id: string; title: string }
  }
  attempts: {
    id: string
    studentId: string
    studentName: string
    studentEmail: string
    score: number
    maxScore: number
    percentage: number
    passed: boolean
    completedAt: string
    duration: number | null
  }[]
  analytics: {
    totalAttempts: number
    uniqueStudents: number
    passedAttempts: number
    failedAttempts: number
    averageScore: number
    medianScore: number
    highestScore: number
    lowestScore: number
    passRate: number
    scoreDistribution: Record<string, number>
    questionPerformance: {
      questionId: string
      question: string
      type: string
      maxPoints: number
      totalAnswers: number
      correctAnswers: number
      correctRate: number
      averagePoints: number
    }[]
    topPerformers: {
      studentId: string
      studentName: string
      studentEmail: string
      attempts: number
      bestScore: number
      lastAttempt: string
    }[]
    strugglingStudents: {
      studentId: string
      studentName: string
      studentEmail: string
      attempts: number
      bestScore: number
      lastAttempt: string
    }[]
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function QuizResultsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [results, setResults] = useState<QuizResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

  useEffect(() => {
    fetchResults()
  }, [params.quizId])

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/instructor/quiz/${params.quizId}/results`)
      if (!response.ok) throw new Error('Failed to fetch results')

      const data = await response.json()
      setResults(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load quiz results',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const exportResults = () => {
    if (!results) return

    // Create CSV content
    const headers = ['Student Name', 'Email', 'Score', 'Max Score', 'Percentage', 'Passed', 'Date', 'Duration (min)']
    const rows = results.attempts.map(attempt => [
      attempt.studentName,
      attempt.studentEmail,
      attempt.score,
      attempt.maxScore,
      `${attempt.percentage}%`,
      attempt.passed ? 'Yes' : 'No',
      new Date(attempt.completedAt).toLocaleString(),
      attempt.duration || 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz-results-${params.quizId}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: 'Results exported successfully'
    })
  }

  const sendEmailToStruggling = () => {
    // This would integrate with email service
    toast({
      title: 'Email Feature',
      description: 'Email functionality would be integrated with your email service',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-muted-foreground">No students have attempted this quiz yet.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scoreDistributionData = Object.entries(results.analytics.scoreDistribution).map(([range, count]) => ({
    range,
    count
  }))

  const questionPerformanceData = results.analytics.questionPerformance.map((q, idx) => ({
    name: `Q${idx + 1}`,
    correctRate: q.correctRate,
    question: q.question.substring(0, 50) + '...'
  }))

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{results.quiz.title} - Results</h1>
            <p className="text-muted-foreground">
              {results.quiz.course.title} / {results.quiz.lesson.title}
            </p>
          </div>
        </div>
        <Button onClick={exportResults}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.analytics.totalAttempts}</div>
            <p className="text-xs text-muted-foreground">
              {results.analytics.uniqueStudents} unique students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.analytics.passRate}%</div>
            <Progress value={results.analytics.passRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {results.analytics.averageScore}/{results.quiz.totalPoints}
            </div>
            <p className="text-xs text-muted-foreground">
              Median: {results.analytics.medianScore}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass/Fail</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{results.analytics.passedAttempts}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">{results.analytics.failedAttempts}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attempts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attempts">All Attempts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="questions">Question Performance</TabsTrigger>
          <TabsTrigger value="students">Student Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="attempts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Attempts</CardTitle>
              <CardDescription>
                All quiz attempts sorted by most recent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.attempts.map(attempt => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{attempt.studentName}</p>
                          <p className="text-sm text-muted-foreground">{attempt.studentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {attempt.score}/{attempt.maxScore}
                      </TableCell>
                      <TableCell>{attempt.percentage}%</TableCell>
                      <TableCell>
                        <Badge variant={attempt.passed ? 'success' : 'destructive'}>
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attempt.duration ? `${attempt.duration} min` : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(attempt.completedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStudent(attempt.studentId)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Distribution of scores across ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pass/Fail Ratio</CardTitle>
                <CardDescription>Overall success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Passed', value: results.analytics.passedAttempts },
                        { name: 'Failed', value: results.analytics.failedAttempts }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#00C49F" />
                      <Cell fill="#FF8042" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Score Trends</CardTitle>
              <CardDescription>Performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Highest Score</p>
                  <p className="text-2xl font-bold">{results.analytics.highestScore}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Lowest Score</p>
                  <p className="text-2xl font-bold">{results.analytics.lowestScore}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Average</p>
                  <p className="text-2xl font-bold">{results.analytics.averageScore.toFixed(1)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Median</p>
                  <p className="text-2xl font-bold">{results.analytics.medianScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Question Performance</CardTitle>
              <CardDescription>
                How students performed on each question
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={questionPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Correct Rate (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      return (
                        <div className="bg-white p-2 border rounded shadow">
                          <p className="text-sm font-medium">{payload[0].payload.question}</p>
                          <p className="text-sm">Correct: {payload[0].value}%</p>
                        </div>
                      )
                    }
                    return null
                  }} />
                  <Bar dataKey="correctRate" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {results.analytics.questionPerformance.map((q, idx) => (
                  <div key={q.questionId} className="border rounded p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">Q{idx + 1}: {q.question}</p>
                        <p className="text-sm text-muted-foreground">Type: {q.type.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={q.correctRate >= 70 ? 'success' : q.correctRate >= 50 ? 'warning' : 'destructive'}>
                          {q.correctRate}% correct
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {q.correctAnswers}/{q.totalAnswers} correct
                        </p>
                      </div>
                    </div>
                    <Progress value={q.correctRate} className="mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Students with best scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.analytics.topPerformers.map((student, idx) => (
                    <div key={student.studentId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Trophy className={`h-4 w-4 ${idx === 0 ? 'text-yellow-500' : 'text-primary'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.attempts} attempt{student.attempts > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{student.bestScore}/{results.quiz.totalPoints}</p>
                        <p className="text-sm text-muted-foreground">
                          {((student.bestScore / results.quiz.totalPoints) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Needs Attention</CardTitle>
                <CardDescription>Students who haven't passed yet</CardDescription>
                {results.analytics.strugglingStudents.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={sendEmailToStruggling}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Encouragement Email
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {results.analytics.strugglingStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    All students have passed! 🎉
                  </p>
                ) : (
                  <div className="space-y-3">
                    {results.analytics.strugglingStudents.map((student) => (
                      <div key={student.studentId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium">{student.studentName}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.attempts} attempt{student.attempts > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">
                            {student.bestScore}/{results.quiz.totalPoints}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {((student.bestScore / results.quiz.totalPoints) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}