"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ArrowLeft,
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Mail,
  BarChart3,
  Activity
} from "lucide-react"

interface StudentProgress {
  student: string
  student_id: number
  completed_lessons: number
  total_lessons: number
  percentage: number
}

interface StudentActivity {
  student_id: number
  student_name: string
  last_active: string
  total_time_spent: number
  lessons_completed: number
  engagement_score: number
  recent_activities: Array<{
    action: string
    timestamp: string
    lesson?: string
  }>
}

export default function CourseStudentsPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  
  const [course, setCourse] = useState<any>(null)
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [studentActivity, setStudentActivity] = useState<StudentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState("name")
  const [filterBy, setFilterBy] = useState("all")

  useEffect(() => {
    fetchData()
  }, [courseId])

  const fetchData = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const accessToken = localStorage.getItem('access_token')

      if (!accessToken) {
        console.error('No access token found')
        setLoading(false)
        return
      }

      // Fetch course details from Django backend
      const courseRes = await fetch(`${API_BASE_URL}/api/courses/${courseId}/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (courseRes.ok) {
        const courseData = await courseRes.json()
        setCourse(courseData)
      }

      // Fetch student progress from Django backend
      console.log('Fetching student progress for course:', courseId)
      const progressRes = await fetch(`${API_BASE_URL}/api/progress/student_progress/?course_id=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (progressRes.ok) {
        const progressData = await progressRes.json()
        console.log('Student progress data:', progressData)
        setStudentProgress(progressData)
      } else {
        console.error('Failed to fetch student progress:', progressRes.status)
        const errorText = await progressRes.text()
        console.error('Error details:', errorText)
      }

      // Fetch student activity from activity tracking API (if available)
      try {
        const activityRes = await fetch(`${API_BASE_URL}/api/activity/course/${courseId}/students/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        
        if (activityRes.ok) {
          const activityData = await activityRes.json()
          setStudentActivity(activityData.data || activityData || [])
        }
      } catch (error) {
        // Activity API might not be available, continue without it
        console.log('Activity API not available:', error)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Merge progress and activity data
  const mergedStudentData = studentProgress.map(progress => {
    const activity = studentActivity.find(a => a.student_id === progress.student_id)
    return {
      ...progress,
      last_active: activity?.last_active || 'N/A',
      total_time_spent: activity?.total_time_spent || 0,
      engagement_score: activity?.engagement_score || 0,
      recent_activities: activity?.recent_activities || []
    }
  })

  // Filter students
  const filteredStudents = mergedStudentData.filter(student => {
    if (filterBy === "all") return true
    if (filterBy === "at-risk") return student.percentage < 30 || student.engagement_score < 40
    if (filterBy === "active") return student.engagement_score >= 70
    if (filterBy === "completed") return student.percentage === 100
    return true
  })

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortBy === "name") return a.student.localeCompare(b.student)
    if (sortBy === "progress") return b.percentage - a.percentage
    if (sortBy === "engagement") return b.engagement_score - a.engagement_score
    if (sortBy === "time") return b.total_time_spent - a.total_time_spent
    return 0
  })

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getEngagementBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500">High</Badge>
    if (score >= 40) return <Badge className="bg-yellow-500">Medium</Badge>
    return <Badge className="bg-red-500">Low</Badge>
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "text-green-600"
    if (percentage >= 50) return "text-yellow-600"
    if (percentage >= 25) return "text-orange-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/instructor')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Student Progress & Activity</h1>
              <p className="text-muted-foreground">{course?.title}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Email All Students
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{studentProgress.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold">
                    {Math.round(mergedStudentData.reduce((sum, s) => sum + s.percentage, 0) / mergedStudentData.length || 0)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Engagement</p>
                  <p className="text-2xl font-bold">
                    {Math.round(mergedStudentData.reduce((sum, s) => sum + s.engagement_score, 0) / mergedStudentData.length || 0)}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">At Risk</p>
                  <p className="text-2xl font-bold">
                    {mergedStudentData.filter(s => s.percentage < 30 || s.engagement_score < 40).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sort */}
        <div className="flex gap-4 mb-6">
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="active">Highly Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="time">Time Spent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Student Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
            <CardDescription>
              Showing {sortedStudents.length} of {studentProgress.length} students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {student.student.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.student}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.completed_lessons}/{student.total_lessons} lessons
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${getProgressColor(student.percentage)}`}>
                            {student.percentage}%
                          </span>
                        </div>
                        <Progress value={student.percentage} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEngagementBadge(student.engagement_score)}
                        <span className="text-sm text-muted-foreground">
                          {student.engagement_score}/100
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(student.total_time_spent)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {student.last_active}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/instructor/courses/${courseId}/students/${student.student_id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {sortedStudents.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No students enrolled yet</h3>
                <p className="text-muted-foreground mb-4">
                  {filterBy !== 'all' 
                    ? 'No students match the selected filter. Try changing the filter above.'
                    : 'Students who enroll in this course will appear here.'}
                </p>
                {filterBy !== 'all' && (
                  <Button 
                    variant="outline" 
                    onClick={() => setFilterBy('all')}
                  >
                    Show All Students
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
