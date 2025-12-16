'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface XAPIExportProps {
  courseId?: string;
  studentId?: string;
}

export function XAPIExport({ courseId, studentId }: XAPIExportProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [verbFilter, setVerbFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleExport = async () => {
    try {
      setLoading(true);
      setSuccess(false);
      setError(null);

      // Build query parameters
      const params: any = {};

      if (courseId) {
        params.course_id = courseId;
      }

      if (studentId) {
        params.student_id = studentId;
      }

      if (verbFilter !== 'all') {
        params.verb = verbFilter;
      }

      // Handle date range
      if (dateRange === 'custom') {
        if (startDate) {
          params.since = new Date(startDate).toISOString();
        }
        if (endDate) {
          params.until = new Date(endDate).toISOString();
        }
      } else if (dateRange !== 'all') {
        const now = new Date();
        const daysAgo = parseInt(dateRange);
        const since = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        params.since = since.toISOString();
      }

      // Make the export request
      const response = await apiClient.request('GET', '/xapi/export/', {
        params,
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
      const filename = `xapi-export-${timestamp}.json`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export data');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export xAPI Data</CardTitle>
        <CardDescription>
          Download learning activity data in xAPI JSON format for external analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Verb Filter */}
        <div className="space-y-2">
          <Label htmlFor="verb-filter">Activity Type</Label>
          <Select value={verbFilter} onValueChange={setVerbFilter}>
            <SelectTrigger id="verb-filter">
              <SelectValue placeholder="Select activity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="played">Video Played</SelectItem>
              <SelectItem value="paused">Video Paused</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="interacted">Interacted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label htmlFor="date-range">Date Range</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger id="date-range">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Export Info */}
        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-2">Export includes:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>All xAPI statements matching the selected filters</li>
            <li>Complete statement data (actor, verb, object, result, context)</li>
            <li>Timestamps and unique statement IDs</li>
            <li>JSON format compatible with xAPI specification</li>
          </ul>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span>Export completed successfully!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </>
          )}
        </Button>

        {/* Additional Info */}
        <p className="text-xs text-muted-foreground text-center">
          Exported data can be imported into any xAPI-compliant Learning Record Store (LRS)
          or analyzed using xAPI analytics tools.
        </p>
      </CardContent>
    </Card>
  );
}
