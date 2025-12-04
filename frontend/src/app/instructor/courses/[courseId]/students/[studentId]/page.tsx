"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  BarChart3,
  Mail,
  AlertCircle
} from "lucide-react"

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const studentId = params.studentId as string
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudentData()
  }, [courseId, studentId])

  const fetchStudentData = async () => {
    try {
      const response = await fetch(`/api/activity/course/${courseId}/students/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student details...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load student data</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </div>
      </div>
    )
  }

  const { student, course, stats, lesson_progress, activity_timeline, daily_summaries } = data

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/instructor/courses/${courseId}/students`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-2xl">
                  {student.username.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">{student.username}</h1>
                <p className="text-muted-foreground">{student.email}</p>
                <p className="text-sm text-muted-foreground mt-1">Course: {course.title}</p>
              </div>
            </div>
            <Button>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-bold">{stats.total_activities}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lessons Completed</p>
                  <p className="text-2xl font-bold">{stats.lessons_completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                  <p className="text-2xl font-bold">{formatTime(stats.lesson_time_spent)}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Study Sessions</p>
                  <p className="text-2xl font-bold">{stats.total_sessions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList>
            <TabsTrigger value="lessons">Lesson Progress</TabsTrigger>
            <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Lesson Progress Tab */}
          <TabsContent value="lessons">
            <Card>
              <CardHeader>
                <CardTitle>Lesson-by-Lesson Progress</CardTitle>
                <CardDescription>Detailed progress for each lesson in the course</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lesson</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lesson_progress.map((lesson: any) => (
                      <TableRow key={lesson.lesson_id}>
                        <TableCell className="font-medium">{lesson.lesson_title}</TableCell>
                        <TableCell>
                          {lesson.completed ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : lesson.time_spent > 0 ? (
                            <Badge className="bg-yellow-500">In Progress</Badge>
                          ) : (
                            <Badge variant="secondary">Not Started</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(lesson.time_spent)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {lesson.pause_count} pauses, {lesson.replay_count} replays
                          </div>
                        </TableCell>
                        <TableCell>
                          {lesson.completed_at ? formatDate(lesson.completed_at) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Timeline Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Recent activities and interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activity_timeline.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {activity.action_type === 'lesson_complete' && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {activity.action_type === 'lesson_view' && <Activity className="h-5 w-5 text-blue-600" />}
                        {activity.action_type === 'course_view' && <BarChart3 className="h-5 w-5 text-purple-600" />}
                        {!['lesson_complete', 'lesson_view', 'course_view'].includes(activity.action_type) && (
                          <Activity className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{activity.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Activity (Last 30 Days)</CardTitle>
                  <CardDescription>Engagement score over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-end justify-between h-48">
                      {daily_summaries.slice(0, 14).reverse().map((day: any, index: number) => {
                        const maxScore = Math.max(...daily_summaries.map((d: any) => d.engagement_score), 1)
                        return (
                          <div key={index} className="flex flex-col items-center flex-1">
                            <div 
                              className="w-full bg-primary rounded-t"
                              style={{ height: `${Math.max((day.engagement_score / maxScore) * 100, 2)}%` }}
                            />
                            <span className="text-xs mt-2 rotate-45 origin-left">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>30-Day Summary</CardTitle>
                  <CardDescription>Aggregated statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="text-sm font-medium">Total Logins</span>
                      <span className="text-lg font-bold">
                        {daily_summaries.reduce((sum: number, d: any) => sum + d.login_count, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="text-sm font-medium">Lessons Viewed</span>
                      <span className="text-lg font-bold">
                        {daily_summaries.reduce((sum: number, d: any) => sum + d.lessons_viewed, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="text-sm font-medium">Lessons Completed</span>
                      <span className="text-lg font-bold">
                        {daily_summaries.reduce((sum: number, d: any) => sum + d.lessons_completed, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="text-sm font-medium">Total Time</span>
                      <span className="text-lg font-bold">
                        {formatTime(daily_summaries.reduce((sum: number, d: any) => sum + d.time_spent, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                      <span className="text-sm font-medium">Avg Engagement Score</span>
                      <span className="text-lg font-bold">
                        {Math.round(daily_summaries.reduce((sum: number, d: any) => sum + d.engagement_score, 0) / daily_summaries.length || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
