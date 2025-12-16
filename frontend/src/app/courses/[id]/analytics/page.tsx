'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, TrendingUp, Users, Clock, Award } from 'lucide-react';

interface AnalyticsData {
  completionRate: {
    total_students: number;
    completed_students: number;
    completion_rate: number;
    lesson_completion: Array<{
      lesson_id: number;
      lesson_title: string;
      completed_count: number;
      completion_rate: number;
    }>;
  };
  quizScores: {
    average_score: number;
    total_attempts: number;
    pass_rate: number;
    quiz_breakdown: Array<{
      quiz_id: number;
      quiz_title: string;
      average_score: number;
      attempts: number;
    }>;
  };
  timeSpent: {
    total_time_minutes: number;
    average_time_per_student: number;
    lessons: Array<{
      lesson_id: number;
      lesson_title: string;
      total_time_minutes: number;
      average_time_minutes: number;
    }>;
  };
  verbDistribution: {
    total_statements: number;
    verbs: Array<{
      verb: string;
      verb_display: string;
      count: number;
      percentage: number;
    }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function CourseAnalyticsPage() {
  const params = useParams();
  const courseId = params.id as string;
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, [courseId, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [completionRate, quizScores, timeSpent, verbDistribution] = await Promise.all([
        apiClient.request('GET', `/xapi/analytics/course/${courseId}/completion-rate/`),
        apiClient.request('GET', `/xapi/analytics/course/${courseId}/quiz-scores/`),
        apiClient.request('GET', `/xapi/analytics/course/${courseId}/time-spent/`),
        apiClient.request('GET', `/xapi/analytics/course/${courseId}/verb-distribution/`),
      ]);

      setAnalytics({
        completionRate: completionRate.data,
        quizScores: quizScores.data,
        timeSpent: timeSpent.data,
        verbDistribution: verbDistribution.data,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.request('GET', `/xapi/export/`, {
        params: { course_id: courseId },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `course-${courseId}-xapi-data.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Course Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive learning analytics powered by xAPI
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.completionRate.completion_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.completionRate.completed_students} of{' '}
              {analytics.completionRate.total_students} students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Quiz Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.quizScores.average_score.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Pass rate: {analytics.quizScores.pass_rate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.timeSpent.total_time_minutes / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {Math.round(analytics.timeSpent.average_time_per_student)} min/student
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.verbDistribution.total_statements}
            </div>
            <p className="text-xs text-muted-foreground">xAPI statements recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="completion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="completion">Completion</TabsTrigger>
          <TabsTrigger value="quizzes">Quiz Performance</TabsTrigger>
          <TabsTrigger value="time">Time Spent</TabsTrigger>
          <TabsTrigger value="activities">Activity Types</TabsTrigger>
        </TabsList>

        {/* Completion Tab */}
        <TabsContent value="completion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Completion Rates</CardTitle>
              <CardDescription>
                Percentage of students who completed each lesson
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.completionRate.lesson_completion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="lesson_title"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completion_rate" fill="#0088FE" name="Completion Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiz Performance Tab */}
        <TabsContent value="quizzes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Performance Breakdown</CardTitle>
              <CardDescription>Average scores and attempt counts per quiz</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.quizScores.quiz_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="quiz_title"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average_score" fill="#00C49F" name="Average Score %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Spent Tab */}
        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Spent Per Lesson</CardTitle>
              <CardDescription>Average time students spend on each lesson</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.timeSpent.lessons}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="lesson_title"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="average_time_minutes"
                    fill="#FFBB28"
                    name="Avg Time (minutes)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Types Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Type Distribution</CardTitle>
              <CardDescription>
                Breakdown of learning activities by verb type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={analytics.verbDistribution.verbs}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ verb_display, percentage }) =>
                      `${verb_display}: ${percentage.toFixed(1)}%`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.verbDistribution.verbs.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
