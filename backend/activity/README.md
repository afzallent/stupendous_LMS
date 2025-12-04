# Activity Tracking Module

Comprehensive user activity tracking system for the LMS.

## Features

### 1. Activity Logging
- Tracks all user actions (login, logout, course views, lesson completions, etc.)
- Uses generic foreign keys to link activities to any model
- Stores session info, IP address, and user agent
- Supports custom metadata for each activity

### 2. Session Tracking
- Monitors user sessions with start/end times
- Tracks page views and action counts per session
- Detects device type (desktop, mobile, tablet)
- Calculates session duration

### 3. Lesson Time Tracking
- Detailed time tracking for each lesson
- Records video position, pause count, replay count
- Tracks completion status and timestamps
- Measures student engagement with content

### 4. Daily Activity Summaries
- Aggregated daily statistics per user
- Engagement score calculation (0-100)
- Generated via management command
- Useful for analytics and reporting

## Models

### ActivityLog
Main activity tracking model with these key fields:
- `user`: User who performed the action
- `action_type`: Type of action (from predefined choices)
- `content_object`: Generic relation to any model
- `timestamp`: When the action occurred
- `metadata`: JSON field for additional data
- `session_key`, `ip_address`, `user_agent`: Request context

### SessionActivity
Tracks user sessions:
- `user`: Session owner
- `session_key`: Django session key
- `started_at`, `last_activity`, `ended_at`: Timing
- `page_views`, `actions_count`: Activity metrics
- `device_type`: Desktop/mobile/tablet

### LessonTimeTracking
Detailed lesson engagement:
- `student`, `lesson`: Who and what
- `time_spent`: Total seconds spent
- `last_position`: Video position in seconds
- `pause_count`, `replay_count`: Engagement metrics
- `completed`, `completed_at`: Completion status

### DailyActivitySummary
Aggregated daily stats:
- `user`, `date`: Who and when
- `login_count`, `courses_viewed`, `lessons_viewed`, `lessons_completed`: Activity counts
- `total_time_spent`: Time in seconds
- `engagement_score`: 0-100 score

## Usage

### Logging Activities

```python
from activity.utils import log_activity

# Log a course view
log_activity(
    user=request.user,
    action_type='course_view',
    content_object=course,
    description=f"Viewed {course.title}",
    request=request
)

# Log with custom metadata
log_activity(
    user=request.user,
    action_type='search',
    description="Searched for Python courses",
    metadata={'query': 'python', 'results_count': 5},
    request=request
)
```

### Getting User Statistics

```python
from activity.utils import get_user_activity_stats

# Get stats for last 30 days
stats = get_user_activity_stats(user, days=30)
print(stats['total_activities'])
print(stats['lessons_completed'])
print(stats['lesson_time_spent'])
```

### Getting Course Engagement

```python
from activity.utils import get_course_engagement_stats

stats = get_course_engagement_stats(course)
print(stats['unique_students'])
print(stats['total_time_spent'])
print(stats['activity_counts'])
```

### Tracking Lesson Time

```python
from activity.models import LessonTimeTracking

# Get or create tracking record
tracking, created = LessonTimeTracking.objects.get_or_create(
    student=request.user,
    lesson=lesson
)

# Update time spent
tracking.time_spent += 60  # Add 60 seconds
tracking.last_position = 120  # At 2 minutes
tracking.save()

# Mark as complete
tracking.mark_complete()
```

## Management Commands

### Generate Daily Summaries

```bash
# Generate for yesterday
python manage.py generate_daily_summaries

# Generate for specific date
python manage.py generate_daily_summaries --date 2025-12-01

# Generate for last 7 days
python manage.py generate_daily_summaries --days 7
```

## Middleware

The `ActivityTrackingMiddleware` automatically:
- Creates/updates session activity records
- Tracks page views
- Updates last activity timestamp
- Detects device type

Add to `MIDDLEWARE` in settings:
```python
MIDDLEWARE = [
    # ... other middleware
    'activity.middleware.ActivityTrackingMiddleware',
]
```

## Signals

Automatic activity logging via signals:
- `user_logged_in` → logs login activity
- `user_logged_out` → logs logout and ends session
- `Enrollment.post_save` → logs course enrollment
- `Progress.post_save` → logs lesson completion

## Views

### User Activity Dashboard
URL: `/activity/dashboard/`
- Shows user's own activity statistics
- Recent activities list
- Daily summaries
- Lesson time tracking

### Instructor Analytics
URL: `/activity/analytics/`
- Course engagement statistics
- Student activity metrics
- Time spent analysis
- Activity breakdowns per course

## Admin Interface

All models are registered in Django admin with:
- List displays with key metrics
- Filters for dates and types
- Search functionality
- Read-only fields for timestamps
- Custom displays for durations

## Action Types

Available action types in `ActivityLog.ACTION_TYPES`:

**Authentication:**
- `login`, `logout`, `register`

**Course Actions:**
- `course_view`, `course_enroll`, `course_unenroll`
- `course_create`, `course_update`, `course_delete`, `course_publish`

**Lesson Actions:**
- `lesson_view`, `lesson_start`, `lesson_complete`
- `lesson_create`, `lesson_update`, `lesson_delete`

**Quiz Actions (future):**
- `quiz_start`, `quiz_submit`, `quiz_complete`

**Certificate Actions (future):**
- `certificate_view`, `certificate_download`

**General:**
- `search`, `profile_view`, `profile_update`

## Database Indexes

Optimized with indexes on:
- `user` + `timestamp`
- `action_type` + `timestamp`
- `content_type` + `object_id`
- `session_key`

## Best Practices

1. **Always use `log_activity()` utility function** instead of creating ActivityLog directly
2. **Pass request object** when available for session/IP tracking
3. **Use meaningful descriptions** for better readability
4. **Store additional data in metadata** as JSON
5. **Run daily summary generation** via cron job or celery
6. **Monitor database size** and archive old logs periodically

## Future Enhancements

- Real-time activity streaming
- Advanced analytics dashboards
- Activity heatmaps
- Predictive engagement scoring
- Automated alerts for low engagement
- Export functionality for reports
