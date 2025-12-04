# Activity Tracking Setup Guide

This guide will help you set up and use the comprehensive activity tracking system.

## Installation Steps

### 1. Activate Virtual Environment

```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Create Migrations

```bash
cd backend
python manage.py makemigrations activity
```

### 3. Apply Migrations

```bash
python manage.py migrate
```

### 4. Verify Installation

Check that the activity app is working:

```bash
python manage.py shell
```

Then in the Python shell:
```python
from activity.models import ActivityLog
from activity.utils import log_activity
print("Activity tracking installed successfully!")
```

## Configuration

The activity app is already configured in `settings.py`:

1. **INSTALLED_APPS** includes `'activity'`
2. **MIDDLEWARE** includes `'activity.middleware.ActivityTrackingMiddleware'`

## Usage Examples

### 1. Manual Activity Logging

In your views, log activities:

```python
from activity.utils import log_activity

def course_detail(request, pk):
    course = get_object_or_404(Course, pk=pk)
    
    # Log the course view
    log_activity(
        user=request.user,
        action_type='course_view',
        content_object=course,
        description=f"Viewed course: {course.title}",
        request=request
    )
    
    return render(request, 'courses/course_detail.html', {'course': course})
```

### 2. Tracking Lesson Time

When a student watches a lesson:

```python
from activity.models import LessonTimeTracking

def update_lesson_progress(request, lesson_id):
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    time_spent = int(request.POST.get('time_spent', 0))
    video_position = int(request.POST.get('position', 0))
    
    # Get or create tracking record
    tracking, created = LessonTimeTracking.objects.get_or_create(
        student=request.user,
        lesson=lesson
    )
    
    # Update tracking
    tracking.time_spent += time_spent
    tracking.last_position = video_position
    tracking.save()
    
    return JsonResponse({'status': 'success'})
```

### 3. Viewing Analytics

Access the dashboards:

- **Student Dashboard**: `/activity/dashboard/`
- **Instructor Analytics**: `/activity/analytics/`

### 4. Generate Daily Summaries

Set up a daily cron job or run manually:

```bash
# Generate for yesterday
python manage.py generate_daily_summaries

# Generate for last 7 days
python manage.py generate_daily_summaries --days 7

# Generate for specific date
python manage.py generate_daily_summaries --date 2025-12-01
```

## Automatic Tracking

The following activities are tracked automatically via signals:

1. **User Login/Logout** - Tracked automatically
2. **Course Enrollment** - When a student enrolls
3. **Lesson Completion** - When Progress model is updated

## Admin Interface

Access the admin panel at `/admin/` to view:

- **Activity Logs** - All user activities
- **Session Activities** - User sessions
- **Lesson Time Tracking** - Detailed lesson engagement
- **Daily Activity Summaries** - Aggregated statistics

## API Integration (Optional)

You can create API endpoints for activity tracking:

```python
# In activity/api_views.py
from rest_framework.decorators import api_route
from rest_framework.response import Response
from .utils import get_user_activity_stats

@api_route(['GET'])
def user_stats(request):
    stats = get_user_activity_stats(request.user, days=30)
    return Response(stats)
```

## Monitoring & Maintenance

### Database Size

Activity logs can grow large. Consider:

1. **Archiving old logs** (older than 6 months)
2. **Setting up log rotation**
3. **Using database partitioning** for large deployments

### Performance

The models include indexes for optimal performance:
- User + timestamp
- Action type + timestamp
- Content type + object ID

### Scheduled Tasks

Set up these scheduled tasks:

1. **Daily Summary Generation** - Run at midnight
   ```bash
   0 0 * * * cd /path/to/project && python manage.py generate_daily_summaries
   ```

2. **Session Cleanup** - Close stale sessions
   ```bash
   0 2 * * * cd /path/to/project && python manage.py clearsessions
   ```

## Testing

Test the activity tracking:

```python
# In Django shell
from django.contrib.auth import get_user_model
from activity.utils import log_activity
from courses.models import Course

User = get_user_model()
user = User.objects.first()
course = Course.objects.first()

# Log an activity
log_activity(
    user=user,
    action_type='course_view',
    content_object=course,
    description="Test activity"
)

# Verify
from activity.models import ActivityLog
print(ActivityLog.objects.filter(user=user).count())
```

## Troubleshooting

### Issue: Middleware not tracking sessions

**Solution**: Ensure middleware is added AFTER `AuthenticationMiddleware`:
```python
MIDDLEWARE = [
    # ...
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'activity.middleware.ActivityTrackingMiddleware',  # After auth
]
```

### Issue: Signals not firing

**Solution**: Ensure signals are imported in `apps.py`:
```python
class ActivityConfig(AppConfig):
    def ready(self):
        import activity.signals  # This loads the signals
```

### Issue: Generic foreign key errors

**Solution**: Ensure `contenttypes` app is in INSTALLED_APPS before `activity`.

## Next Steps

1. **Customize action types** - Add more action types in `ActivityLog.ACTION_TYPES`
2. **Create custom reports** - Build analytics views for specific needs
3. **Export functionality** - Add CSV/PDF export for reports
4. **Real-time tracking** - Integrate with WebSockets for live updates
5. **Engagement alerts** - Set up notifications for low engagement

## Support

For issues or questions:
1. Check the `activity/README.md` for detailed documentation
2. Review the admin interface for data verification
3. Check Django logs in `backend/logs/lms.log`
