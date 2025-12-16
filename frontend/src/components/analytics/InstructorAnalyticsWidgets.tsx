'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  Award,
  Activity,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface RecentActivity {
  id: string;
  actor_name: string;
  verb_display: string;
  object_name: string;
  timestamp: string;
  result?: {
    score?: { scaled?: number };
    success?: boolean;
  };
}

interface CourseStats {
  course_id: number;
  course_title: string;
  completion_rate: number;
  average_score: number;
  total_students: number;
}

interface InstructorAnalyticsWidgetsProps {
  instructorId: string;
  maxActivities?: number;
}

export function InstructorAnalyticsWidgets({
  instructorId,
  maxActivities = 5,
}: InstructorAnalyticsWidgetsProps) {
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [instructorId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch instructor's courses
      const coursesResponse = await apiClient.request('GET', '/courses/', {
        params: { instructorId },
      });

      const courses = coursesResponse.data.results || coursesResponse.data || [];

      // Fetch analytics for each course
      const statsPromises = courses.slice(0, 5).map(async (course: any) => {
        try {
          const [completionRate, quizScores] = await Promise.all([
            apiClient.request('GET', `/xapi/analytics/course/${course.id}/completion-rate/`),
            apiClient.request('GET', `/xapi/analytics/course/${course.id}/quiz-scores/`),
          ]);

          return {
            course_id: course.id,
            course_title: course.title,
            completion_rate: completionRate.data.completion_rate || 0,
            average_score: quizScores.data.average_score || 0,
            total_students: completionRate.data.total_students || 0,
          };
        } catch (err) {
          console.error(`Error fetching analytics for course ${course.id}:`, err);
          return {
            course_id: course.id,
            course_title: course.title,
            completion_rate: 0,
            average_score: 0,
            total_students: 0,
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      setCourseStats(stats);

      // Fetch recent activity across all courses
      const activityPromises = courses.slice(0, 3).map(async (course: any) => {
        try {
          const response = await apiClient.request(
            'GET',
            `/xapi/analytics/course/${course.id}/recent-activity/`,
            { params: { limit: maxActivities } }
          );
          return response.data.results || response.data || [];
        } catch (err) {
          return [];
        }
      });

      const allActivities = (await Promise.all(activityPromises)).flat();
      
      // Sort by timestamp and take the most recent
      const sortedActivities = allActivities
        .sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, maxActivities);

      setRecentActivity(sortedActivities);
    } catch (err) {
      console.error('Error fetching instructor analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading analytics...</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading activity...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Course Performance Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Course Performance</CardTitle>
              <CardDescription>Completion rates and quiz scores</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {courseStats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No course data available
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {courseStats.map((course) => (
                  <Link
                    key={course.course_id}
                    href={`/courses/${course.course_id}/analytics`}
                    className="block"
                  >
                    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium line-clamp-1">{course.course_title}</h4>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground text-xs">Students</div>
                          <div className="font-medium">{course.total_students}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Completion</div>
                          <div className="font-medium">{course.completion_rate.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Avg Score</div>
                          <div className="font-medium">{course.average_score.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          )}
          {courseStats.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Link href="/instructor/analytics">
                <Button variant="outline" className="w-full">
                  View All Analytics
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Student Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Student Activity</CardTitle>
              <CardDescription>Latest learning activities across your courses</CardDescription>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No recent activity
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentActivity.map((activity) => {
                  const verbKey = activity.verb_display.toLowerCase();
                  const isSuccess = activity.result?.success !== false;
                  const score = activity.result?.score?.scaled;

                  return (
                    <div
                      key={activity.id}
                      className="flex gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {verbKey.includes('complete') && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        {verbKey.includes('pass') && (
                          <Award className="h-5 w-5 text-green-600" />
                        )}
                        {verbKey.includes('fail') && (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        {!verbKey.includes('complete') &&
                          !verbKey.includes('pass') &&
                          !verbKey.includes('fail') && (
                            <Activity className="h-5 w-5 text-blue-600" />
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {activity.actor_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.verb_display}{' '}
                              <span className="font-medium">{activity.object_name}</span>
                            </p>
                          </div>
                          {score !== undefined && (
                            <Badge
                              variant={isSuccess ? 'default' : 'destructive'}
                              className="flex-shrink-0"
                            >
                              {(score * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
