'use client'

import { useState, useEffect } from 'react'
import { djangoApi } from '@/lib/django-api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  BarChart3,
  Activity
} from 'lucide-react'

interface CourseAnalytics {
  enrollment_count: number
  completion_rate: number
  average_score: number
  total_interactions: number
  lesson_completion: LessonCompletion[]
  enrollment_trend: EnrollmentTrend[]
}

interface LessonCompletion {
  lesson_id: number
  lesson_title: string
  completed_count: number
  completion_rate: number
}

interface EnrollmentTrend {
  day: string
  count: number
}

interface AnalyticsTabProps {
  courseId: string
}

/**
 * Analytics Tab Component
 * 
 * Displays course analytics including:
 * - Student enrollment count
 * - Completion rates by chapter/lesson
 * - Average quiz scores
 * 
 * Requirements: 2.2 (Analytics tab display)
 */
export function AnalyticsTab({ courseId }: AnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [courseId])

  /**
   * Fetch analytics data from multiple endpoints
   */
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch data from multiple endpoints in parallel
      // Note: Some analytics endpoints may not be implemented yet
      const [courseAnalyticsResponse, xapiAnalyticsResponse, quizScoresResponse] = await Promise.allSettled([
        djangoApi.get(`/api/activity/course/${courseId}/analytics/`).catch(() => ({ enrollments: 0, completions: 0 })),
        djangoApi.get(`/api/xapi/analytics/course/${courseId}/completion-rate/`).catch(() => ({ completion_rate: 0 })),
        djangoApi.get(`/api/xapi/analytics/course/${courseId}/quiz-scores/`).catch(() => ({ average_score: 0, quiz_attempts: 0 }))
      ])

      // Process course analytics (enrollment, lesson completion)
      let courseData: any = { enrollments: 0, completions: 0 }
      if (courseAnalyticsResponse.status === 'fulfilled') {
        courseData = courseAnalyticsResponse.value || courseData
      }

      // Process xAPI analytics (completion rate)
      let xapiData: any = { completion_rate: 0 }
      if (xapiAnalyticsResponse.status === 'fulfilled') {
        xapiData = xapiAnalyticsResponse.value || xapiData
      }

      // Process quiz scores
      let quizData: any = { average_score: 0, total_interactions: 0 }
      if (quizScoresResponse.status === 'fulfilled') {
        quizData = quizScoresResponse.value || quizData
      }

      // Combine all data
      const combinedAnalytics: CourseAnalytics = {
        enrollment_count: courseData.engagement_stats?.total_enrolled || courseData.enrollments || 0,
        completion_rate: xapiData.completion_rate || 0,
        average_score: quizData.average_score || 0,
        total_interactions: quizData.total_interactions || quizData.quiz_attempts || 0,
        lesson_completion: courseData.lesson_completion || [],
        enrollment_trend: courseData.enrollment_trend || []
      }

      setAnalytics(combinedAnalytics)
    } catch (err: any) {
      console.error('Error fetching analytics:', err)
      setError(err.message || 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-20">
                  <div className="animate-pulse bg-muted rounded h-4 w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading analytics...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-destructive mb-2">Failed to load analytics</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Student Enrollment Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.enrollment_count}</div>
            <p className="text-xs text-muted-foreground">
              Students enrolled in this course
            </p>
          </CardContent>
        </Card>

        {/* Overall Completion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completion_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Students who completed the course
            </p>
          </CardContent>
        </Card>

        {/* Average Quiz Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Quiz Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.average_score.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average score across all quizzes
            </p>
          </CardContent>
        </Card>

        {/* Total Interactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_interactions}</div>
            <p className="text-xs text-muted-foreground">
              Student learning activities
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lesson Completion Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lesson Completion Rates
            </CardTitle>
            <CardDescription>
              Completion progress for each lesson
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.lesson_completion.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No lesson data available
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {analytics.lesson_completion.map((lesson, index) => (
                    <div key={lesson.lesson_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {lesson.lesson_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.completed_count} of {analytics.enrollment_count} students
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {lesson.completion_rate.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress 
                        value={lesson.completion_rate} 
                        className="h-2"
                      />
                      {index < analytics.lesson_completion.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Enrollment Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Enrollment Trend
            </CardTitle>
            <CardDescription>
              Daily enrollments over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.enrollment_trend.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No enrollment data available
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {analytics.enrollment_trend.map((trend, index) => (
                    <div key={trend.day} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(trend.day).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {trend.count === 1 ? '1 enrollment' : `${trend.count} enrollments`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {trend.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      {analytics.enrollment_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Insights</CardTitle>
            <CardDescription>
              Key metrics and recommendations for your course
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Engagement Level</h4>
                <div className="flex items-center gap-2">
                  {analytics.completion_rate >= 80 ? (
                    <>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Excellent
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        High student engagement
                      </span>
                    </>
                  ) : analytics.completion_rate >= 60 ? (
                    <>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        Good
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Moderate engagement
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge variant="destructive">
                        Needs Improvement
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Consider reviewing content
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Quiz Performance</h4>
                <div className="flex items-center gap-2">
                  {analytics.average_score >= 80 ? (
                    <>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Strong
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Students are mastering content
                      </span>
                    </>
                  ) : analytics.average_score >= 60 ? (
                    <>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        Average
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Room for improvement
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge variant="destructive">
                        Challenging
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Consider reviewing quiz difficulty
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}