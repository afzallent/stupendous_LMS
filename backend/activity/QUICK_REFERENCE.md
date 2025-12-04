# Activity Tracking Quick Reference

## Installation

```bash
cd backend
python manage.py makemigrations activity
python manage.py migrate
```

## Basic Usage

### Log an Activity

```python
from activity.utils import log_activity

log_activity(
    user=request.user,
    action_type='course_view',
    content_object=course,
    description='Viewed course',
    request=request
)
```

### Track Lesson Time

```python
from activity.models import LessonTimeTracking

tracking, _ = LessonTimeTracking.objects.get_or_create(
    student=request.user,
    lesson=lesson
)
tracking.time_spent += 60
tracking.save()
```

### Get User Stats

```python
from activity.utils import get_user_activity_stats

stats = get_user_activity_stats(user, days=30)
# Returns: total_activities, lessons_completed, lesson_time_spent, etc.
```

### Get Course Stats

```python
from activity.utils import get_course_engagement_stats

stats = get_course_engagement_stats(course)
# Returns: unique_students, total_time_spent, activity_counts, etc.
```

## Action Types

- `login`, `logout`, `register`
- `course_view`, `course_enroll`, `course_unenroll`
- `lesson_view`, `lesson_start`, `lesson_complete`
- `search`, `profile_view`, `profile_update`

## URLs

- `/activity/dashboard/` - User activity dashboard
- `/activity/analytics/` - Instructor analytics
- `/admin/activity/` - Admin interface

## Management Commands

```bash
# Generate daily summaries
python manage.py generate_daily_summaries

# For specific date
python manage.py generate_daily_summaries --date 2025-12-01

# For last 7 days
python manage.py generate_daily_summaries --days 7
```

## Models

- **ActivityLog** - All user activities
- **SessionActivity** - User sessions
- **LessonTimeTracking** - Lesson engagement
- **DailyActivitySummary** - Daily aggregates

## Common Patterns

### In Views

```python
def course_detail(request, pk):
    course = get_object_or_404(Course, pk=pk)
    
    log_activity(
        user=request.user,
        action_type='course_view',
        content_object=course,
        request=request
    )
    
    return render(request, 'template.html', {'course': course})
```

### In Templates

```html
<p>Total Activities: {{ stats.total_activities }}</p>
<p>Lessons Completed: {{ stats.lessons_completed }}</p>
<p>Time Spent: {{ stats.lesson_time_spent }}s</p>
```

### AJAX Updates

```javascript
fetch('/api/lessons/123/update-progress/', {
    method: 'POST',
    body: JSON.stringify({
        time_spent: 60,
        position: 120
    })
});
```

## Testing

```bash
python manage.py test activity
```

## Documentation

- `README.md` - Full documentation
- `INTEGRATION_EXAMPLES.md` - Code examples
- `../ACTIVITY_TRACKING_SETUP.md` - Setup guide
