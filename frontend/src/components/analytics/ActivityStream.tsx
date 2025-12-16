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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  BookOpen,
  Award,
  UserPlus,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface XAPIStatement {
  id: string;
  actor: {
    name: string;
    mbox?: string;
  };
  verb: {
    id: string;
    display: { [key: string]: string };
  };
  object: {
    id: string;
    definition?: {
      name?: { [key: string]: string };
      type?: string;
    };
  };
  result?: {
    score?: {
      scaled?: number;
      raw?: number;
      min?: number;
      max?: number;
    };
    success?: boolean;
    completion?: boolean;
    duration?: string;
  };
  timestamp: string;
}

interface ActivityStreamProps {
  studentId: string;
  courseId?: string;
  maxHeight?: string;
}

const VERB_ICONS: { [key: string]: React.ReactNode } = {
  completed: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  passed: <Award className="h-5 w-5 text-green-600" />,
  failed: <XCircle className="h-5 w-5 text-red-600" />,
  registered: <UserPlus className="h-5 w-5 text-blue-600" />,
  played: <Play className="h-5 w-5 text-blue-600" />,
  paused: <Pause className="h-5 w-5 text-gray-600" />,
  viewed: <BookOpen className="h-5 w-5 text-purple-600" />,
  interacted: <Activity className="h-5 w-5 text-orange-600" />,
};

const VERB_COLORS: { [key: string]: string } = {
  completed: 'bg-green-100 text-green-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  registered: 'bg-blue-100 text-blue-800',
  played: 'bg-blue-100 text-blue-800',
  paused: 'bg-gray-100 text-gray-800',
  viewed: 'bg-purple-100 text-purple-800',
  interacted: 'bg-orange-100 text-orange-800',
};

export function ActivityStream({
  studentId,
  courseId,
  maxHeight = '600px',
}: ActivityStreamProps) {
  const [statements, setStatements] = useState<XAPIStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verbFilter, setVerbFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchActivityStream();
  }, [studentId, courseId, verbFilter, page]);

  const fetchActivityStream = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        page_size: pageSize,
      };

      if (verbFilter !== 'all') {
        params.verb = verbFilter;
      }

      if (courseId) {
        params.course_id = courseId;
      }

      const response = await apiClient.request(
        'GET',
        `/xapi/analytics/student/${studentId}/activity-stream/`,
        { params }
      );

      setStatements(response.data.results || response.data);
      setTotalPages(Math.ceil((response.data.count || statements.length) / pageSize));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load activity stream');
      console.error('Activity stream error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVerbDisplay = (verb: XAPIStatement['verb']): string => {
    return verb.display['en-US'] || verb.display['en'] || verb.id.split('/').pop() || 'interacted';
  };

  const getVerbKey = (verb: XAPIStatement['verb']): string => {
    const display = getVerbDisplay(verb).toLowerCase();
    return display;
  };

  const getObjectName = (object: XAPIStatement['object']): string => {
    if (object.definition?.name) {
      return object.definition.name['en-US'] || object.definition.name['en'] || 'Activity';
    }
    return object.id.split('/').pop() || 'Activity';
  };

  const formatDuration = (duration?: string): string => {
    if (!duration) return '';
    
    // Parse ISO 8601 duration (e.g., PT1H30M)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
  };

  if (loading && statements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading activity stream...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Learning Activity Timeline</CardTitle>
            <CardDescription>
              Chronological view of all learning activities
            </CardDescription>
          </div>
          <Select value={verbFilter} onValueChange={setVerbFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by activity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="played">Played</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="interacted">Interacted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          {statements.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No activities found
            </div>
          ) : (
            <div className="space-y-4">
              {statements.map((statement) => {
                const verbKey = getVerbKey(statement.verb);
                const verbDisplay = getVerbDisplay(statement.verb);
                const objectName = getObjectName(statement.object);
                const icon = VERB_ICONS[verbKey] || VERB_ICONS.interacted;
                const colorClass = VERB_COLORS[verbKey] || VERB_COLORS.interacted;

                return (
                  <div
                    key={statement.id}
                    className="flex gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">{icon}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={colorClass}>{verbDisplay}</Badge>
                            <span className="font-medium">{objectName}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(statement.timestamp), 'PPp')}
                          </div>
                        </div>
                      </div>

                      {statement.result && (
                        <div className="flex gap-4 text-sm">
                          {statement.result.score && (
                            <div>
                              <span className="text-muted-foreground">Score: </span>
                              <span className="font-medium">
                                {statement.result.score.scaled !== undefined
                                  ? `${(statement.result.score.scaled * 100).toFixed(1)}%`
                                  : statement.result.score.raw !== undefined
                                  ? `${statement.result.score.raw}/${statement.result.score.max}`
                                  : 'N/A'}
                              </span>
                            </div>
                          )}
                          {statement.result.duration && (
                            <div>
                              <span className="text-muted-foreground">Duration: </span>
                              <span className="font-medium">
                                {formatDuration(statement.result.duration)}
                              </span>
                            </div>
                          )}
                          {statement.result.success !== undefined && (
                            <div>
                              <span className="text-muted-foreground">Success: </span>
                              <span className="font-medium">
                                {statement.result.success ? 'Yes' : 'No'}
                              </span>
                            </div>
                          )}
                          {statement.result.completion !== undefined && (
                            <div>
                              <span className="text-muted-foreground">Completed: </span>
                              <span className="font-medium">
                                {statement.result.completion ? 'Yes' : 'No'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
