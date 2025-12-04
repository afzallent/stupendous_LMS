# Activity Tracking Integration Examples

Examples of how to integrate activity tracking into existing views.

## Course Views Integration

### Example 1: Track Course Views

```python
# In courses/views.py
from activity.utils import log_activity

class CourseDetailView(DetailView):
    model = Course
    template_name = 'courses/course_detail.html'
    
    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        
        # Log the course view
        if request.user.is_authenticated:
            log_activity(
                user=request.user,
                action_type='course_view',
                content_object=self.object,
                description=f"Viewed course: {self.object.title}",
                request=request
            )
        
        return response
```

### Example 2: Track Lesson Views

```python
# In courses/views.py
from activity.utils import log_activity
from activity.models import LessonTimeTracking

def lesson_detail(request, pk):
    lesson = get_object_or_404(Lesson, pk=pk)
    
    # Log lesson view
    log_activity(
        user=request.user,
        action_type='lesson_view',
        content_object=lesson,
        description=f"Viewed lesson: {lesson.title}",
        request=request
    )
    
    # Initialize or get time tracking
    if request.user.is_authenticated and request.user.is_student:
        tracking, created = LessonTimeTracking.objects.get_or_create(
            student=request.user,
            lesson=lesson
        )
        
        if created:
            log_activity(
                user=request.user,
                action_type='lesson_start',
                content_object=lesson,
                description=f"Started lesson: {lesson.title}",
                request=request
            )
    
    context = {
        'lesson': lesson,
        'tracking': tracking if request.user.is_authenticated else None
    }
    return render(request, 'courses/lesson_detail.html', context)
```

### Example 3: Track Enrollment

```python
# In courses/views.py
from activity.utils import log_activity

def enroll_course(request, pk):
    course = get_object_or_404(Course, pk=pk)
    
    # Create enrollment
    enrollment, created = Enrollment.objects.get_or_create(
        student=request.user,
        course=course
    )
    
    if created:
        # Log enrollment (also done by signal, but you can add custom metadata)
        log_activity(
            user=request.user,
            action_type='course_enroll',
            content_object=course,
            description=f"Enrolled in {course.title}",
            metadata={
                'course_category': course.category.name if course.category else None,
                'instructor': course.instructor.username,
            },
            request=request
        )
        messages.success(request, f"Successfully enrolled in {course.title}")
    else:
        messages.info(request, "You are already enrolled in this course")
    
    return redirect('courses:course_detail', pk=pk)
```

## AJAX Integration for Real-time Tracking

### Example 4: Track Video Progress (JavaScript)

```javascript
// In your lesson detail template
<script>
let videoPlayer = document.getElementById('video-player');
let lastPosition = 0;
let timeSpent = 0;
let updateInterval;

videoPlayer.addEventListener('play', function() {
    // Start tracking time
    updateInterval = setInterval(function() {
        timeSpent += 1;
        lastPosition = Math.floor(videoPlayer.currentTime);
        
        // Update every 10 seconds
        if (timeSpent % 10 === 0) {
            updateProgress();
        }
    }, 1000);
});

videoPlayer.addEventListener('pause', function() {
    clearInterval(updateInterval);
    updateProgress();
    
    // Log pause event
    fetch('/api/activity/log/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            action_type: 'lesson_pause',
            lesson_id: {{ lesson.id }},
            position: lastPosition
        })
    });
});

function updateProgress() {
    fetch('/api/lessons/{{ lesson.id }}/update-progress/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            time_spent: timeSpent,
            position: lastPosition
        })
    });
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
</script>
```

### Example 5: API Endpoint for Progress Updates

```python
# In courses/api_views.py or create activity/api_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from activity.models import LessonTimeTracking
from courses.models import Lesson

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_lesson_progress(request, lesson_id):
    """Update lesson time tracking via AJAX"""
    try:
        lesson = Lesson.objects.get(pk=lesson_id)
        time_spent = int(request.data.get('time_spent', 0))
        position = int(request.data.get('position', 0))
        
        # Get or create tracking
        tracking, created = LessonTimeTracking.objects.get_or_create(
            student=request.user,
            lesson=lesson
        )
        
        # Update tracking
        tracking.time_spent = time_spent
        tracking.last_position = position
        tracking.save()
        
        return Response({
            'status': 'success',
            'time_spent': tracking.time_spent,
            'position': tracking.last_position
        })
    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
```

## Dashboard Integration

### Example 6: Add Activity Widget to Student Dashboard

```python
# In courses/views.py
from activity.utils import get_user_activity_stats

@login_required
def student_dashboard(request):
    # Existing code...
    enrollments = Enrollment.objects.filter(student=request.user)
    
    # Add activity stats
    activity_stats = get_user_activity_stats(request.user, days=7)
    
    # Get recent lesson activity
    from activity.models import LessonTimeTracking
    recent_lessons = LessonTimeTracking.objects.filter(
        student=request.user
    ).select_related('lesson', 'lesson__course').order_by('-started_at')[:5]
    
    context = {
        'enrollments': enrollments,
        'activity_stats': activity_stats,
        'recent_lessons': recent_lessons,
    }
    return render(request, 'courses/student_dashboard.html', context)
```

### Example 7: Template Integration

```html
<!-- In courses/student_dashboard.html -->
<div class="row">
    <div class="col-md-12">
        <h3>Your Activity This Week</h3>
        <div class="row">
            <div class="col-md-3">
                <div class="stat-card">
                    <h4>{{ activity_stats.total_activities }}</h4>
                    <p>Total Activities</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <h4>{{ activity_stats.lessons_completed }}</h4>
                    <p>Lessons Completed</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <h4>{{ activity_stats.lesson_time_spent|floatformat:0 }}s</h4>
                    <p>Time Spent Learning</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <h4>{{ activity_stats.total_sessions }}</h4>
                    <p>Study Sessions</p>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row mt-4">
    <div class="col-md-12">
        <h4>Recent Lesson Activity</h4>
        <table class="table">
            <thead>
                <tr>
                    <th>Lesson</th>
                    <th>Course</th>
                    <th>Progress</th>
                    <th>Time Spent</th>
                </tr>
            </thead>
            <tbody>
                {% for tracking in recent_lessons %}
                <tr>
                    <td>{{ tracking.lesson.title }}</td>
                    <td>{{ tracking.lesson.course.title }}</td>
                    <td>
                        {% if tracking.completed %}
                        <span class="badge bg-success">Completed</span>
                        {% else %}
                        <span class="badge bg-warning">In Progress</span>
                        {% endif %}
                    </td>
                    <td>{{ tracking.time_spent|floatformat:0 }}s</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
</div>
```

## Search Integration

### Example 8: Track Search Queries

```python
# In courses/views.py
from activity.utils import log_activity

def course_search(request):
    query = request.GET.get('q', '')
    results = Course.objects.filter(
        Q(title__icontains=query) | Q(description__icontains=query)
    )
    
    # Log search activity
    if request.user.is_authenticated and query:
        log_activity(
            user=request.user,
            action_type='search',
            description=f"Searched for: {query}",
            metadata={
                'query': query,
                'results_count': results.count(),
                'search_type': 'course'
            },
            request=request
        )
    
    context = {
        'query': query,
        'results': results
    }
    return render(request, 'courses/search_results.html', context)
```

## Instructor Dashboard Integration

### Example 9: Show Course Analytics

```python
# In courses/views.py
from activity.utils import get_course_engagement_stats

@login_required
def instructor_course_analytics(request, pk):
    course = get_object_or_404(Course, pk=pk, instructor=request.user)
    
    # Get engagement stats
    stats = get_course_engagement_stats(course)
    
    # Get top students by engagement
    from activity.models import LessonTimeTracking
    top_students = LessonTimeTracking.objects.filter(
        lesson__course=course
    ).values('student__username').annotate(
        total_time=Sum('time_spent'),
        completed_count=Count('id', filter=Q(completed=True))
    ).order_by('-total_time')[:10]
    
    context = {
        'course': course,
        'stats': stats,
        'top_students': top_students,
    }
    return render(request, 'courses/course_analytics.html', context)
```

## Custom Action Types

### Example 10: Add Custom Action Types

```python
# Extend ActivityLog.ACTION_TYPES in activity/models.py
ACTION_TYPES = [
    # ... existing types
    
    # Custom types for your LMS
    ('assignment_submit', 'Submitted Assignment'),
    ('discussion_post', 'Posted in Discussion'),
    ('resource_download', 'Downloaded Resource'),
    ('bookmark_add', 'Bookmarked Content'),
    ('note_create', 'Created Note'),
]

# Then use them:
from activity.utils import log_activity

def submit_assignment(request, assignment_id):
    # ... assignment submission logic
    
    log_activity(
        user=request.user,
        action_type='assignment_submit',
        content_object=assignment,
        description=f"Submitted assignment: {assignment.title}",
        metadata={
            'submission_time': timezone.now().isoformat(),
            'file_count': len(request.FILES)
        },
        request=request
    )
```

## Batch Operations

### Example 11: Bulk Activity Logging

```python
from activity.models import ActivityLog
from django.contrib.contenttypes.models import ContentType

def bulk_log_activities(user, action_type, objects, request=None):
    """Log activities for multiple objects at once"""
    activities = []
    
    for obj in objects:
        activity = ActivityLog(
            user=user,
            action_type=action_type,
            content_type=ContentType.objects.get_for_model(obj),
            object_id=obj.pk,
            description=f"{action_type} - {str(obj)}"
        )
        
        if request:
            activity.session_key = request.session.session_key or ''
            activity.ip_address = get_client_ip(request)
            activity.user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        activities.append(activity)
    
    # Bulk create for efficiency
    ActivityLog.objects.bulk_create(activities)
```

These examples show how to integrate activity tracking throughout your LMS application.
