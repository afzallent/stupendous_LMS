# Analytics API Examples

## Authentication

All requests require a valid JWT token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

## Example API Calls

### 1. Get Trainer Dashboard Analytics

```bash
curl -X GET "http://localhost:8000/api/analytics/dashboard/" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "total_courses": 5,
  "total_students": 150,
  "total_enrollments": 200,
  "total_lessons": 50,
  "courses": [
    {
      "id": 1,
      "title": "Introduction to Python",
      "enrollment_count": 50,
      "lesson_count": 10,
      "avg_progress": 65.5
    },
    {
      "id": 2,
      "title": "Advanced Django",
      "enrollment_count": 30,
      "lesson_count": 15,
      "avg_progress": 72.3
    }
  ]
}
```

### 2. Get Course Statistics

```bash
curl -X GET "http://localhost:8000/api/analytics/course/1/" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "course_id": 1,
  "course_title": "Introduction to Python",
  "enrollments": 50,
  "active_students": 25,
  "completion_rate": 45.0,
  "avg_progress": 68.5,
  "total_lessons": 10,
  "completed_students": 23
}
```

### 3. Get Lesson Statistics for a Course

```bash
curl -X GET "http://localhost:8000/api/analytics/course/1/lessons/" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "lesson_id": 1,
    "lesson_title": "Getting Started",
    "chapter": "Introduction",
    "order": 1,
    "completion_count": 45,
    "avg_time_minutes": 15.5
  },
  {
    "lesson_id": 2,
    "lesson_title": "Variables and Types",
    "chapter": "Basics",
    "order": 2,
    "completion_count": 40,
    "avg_time_minutes": 22.3
  }
]
```

### 4. Get Assessment Statistics for a Course

```bash
curl -X GET "http://localhost:8000/api/analytics/course/1/assessments/" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "assessment_id": 1,
    "assessment_title": "Python Basics Quiz",
    "total_attempts": 50,
    "avg_score": 82.5,
    "pass_rate": 90.0,
    "passing_score": 70
  },
  {
    "assessment_id": 2,
    "assessment_title": "Intermediate Python Test",
    "total_attempts": 35,
    "avg_score": 75.8,
    "pass_rate": 77.1,
    "passing_score": 70
  }
]
```

### 5. Get Enrollment Trends (Daily)

```bash
curl -X GET "http://localhost:8000/api/analytics/enrollment_trends/?period=daily" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "count": 10
  },
  {
    "date": "2024-01-02",
    "count": 15
  },
  {
    "date": "2024-01-03",
    "count": 8
  }
]
```

### 6. Get Enrollment Trends (Weekly)

```bash
curl -X GET "http://localhost:8000/api/analytics/enrollment_trends/?period=weekly" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "count": 45
  },
  {
    "date": "2024-01-08",
    "count": 52
  }
]
```

### 7. Get Completion Rates

```bash
curl -X GET "http://localhost:8000/api/analytics/completion_rates/" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
[
  {
    "course_id": 3,
    "course_title": "Web Development Basics",
    "total_enrolled": 40,
    "total_completed": 32,
    "completion_rate": 80.0
  },
  {
    "course_id": 1,
    "course_title": "Introduction to Python",
    "total_enrolled": 50,
    "total_completed": 23,
    "completion_rate": 46.0
  },
  {
    "course_id": 2,
    "course_title": "Advanced Django",
    "total_enrolled": 30,
    "total_completed": 12,
    "completion_rate": 40.0
  }
]
```

### 8. Get Student Engagement Metrics

```bash
curl -X GET "http://localhost:8000/api/analytics/engagement/" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "total_active_students": 50,
  "new_enrollments": 10,
  "lessons_completed": 100,
  "avg_engagement_score": 75.5,
  "top_performers": [
    {
      "student_id": 5,
      "student_name": "Alice Johnson",
      "course_id": 1,
      "course_title": "Introduction to Python",
      "completion_rate": 95.0
    },
    {
      "student_id": 8,
      "student_name": "Bob Smith",
      "course_id": 1,
      "course_title": "Introduction to Python",
      "completion_rate": 90.0
    }
  ],
  "at_risk_students": [
    {
      "student_id": 12,
      "student_name": "Charlie Brown",
      "course_id": 1,
      "course_title": "Introduction to Python",
      "completion_rate": 15.0,
      "enrolled_date": "2024-01-01"
    }
  ]
}
```

### 9. Get Engagement for Specific Course

```bash
curl -X GET "http://localhost:8000/api/analytics/engagement/?course_id=1&days=60" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "total_active_students": 35,
  "new_enrollments": 5,
  "lessons_completed": 70,
  "avg_engagement_score": 68.2,
  "top_performers": [...],
  "at_risk_students": [...]
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "detail": "Authentication credentials were not provided."
}
```

**Solution:** Make sure you're including a valid JWT token in the Authorization header.

### 403 Forbidden

```json
{
  "detail": "You do not have permission to perform this action."
}
```

**Solution:** Make sure your user account has `is_instructor=True`.

### 404 Not Found

```json
{
  "error": "Course not found or access denied"
}
```

**Solution:** Verify the course ID exists and you are the instructor of that course.

### 400 Bad Request

```json
{
  "error": "Invalid period. Must be one of: daily, weekly, monthly"
}
```

**Solution:** Use a valid period parameter value.

## Python Usage Examples

### Using requests library

```python
import requests

# Set up headers with JWT token
headers = {
    'Authorization': f'Bearer {your_token}',
    'Content-Type': 'application/json'
}

# Get dashboard analytics
response = requests.get(
    'http://localhost:8000/api/analytics/dashboard/',
    headers=headers
)
analytics = response.json()
print(f"Total courses: {analytics['total_courses']}")
print(f"Total students: {analytics['total_students']}")

# Get course statistics
response = requests.get(
    'http://localhost:8000/api/analytics/course/1/',
    headers=headers
)
stats = response.json()
print(f"Completion rate: {stats['completion_rate']}%")

# Get enrollment trends
params = {'period': 'weekly'}
response = requests.get(
    'http://localhost:8000/api/analytics/enrollment_trends/',
    headers=headers,
    params=params
)
trends = response.json()
for trend in trends:
    print(f"{trend['date']}: {trend['count']} enrollments")
```

## JavaScript/Frontend Usage Examples

### Using fetch API

```javascript
// Set up headers with JWT token
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// Get dashboard analytics
fetch('http://localhost:8000/api/analytics/dashboard/', { headers })
  .then(response => response.json())
  .then(data => {
    console.log('Total courses:', data.total_courses);
    console.log('Total students:', data.total_students);
    console.log('Courses:', data.courses);
  });

// Get course statistics
fetch('http://localhost:8000/api/analytics/course/1/', { headers })
  .then(response => response.json())
  .then(stats => {
    console.log('Completion rate:', stats.completion_rate);
    console.log('Active students:', stats.active_students);
  });

// Get enrollment trends
fetch('http://localhost:8000/api/analytics/enrollment_trends/?period=daily', { headers })
  .then(response => response.json())
  .then(trends => {
    trends.forEach(trend => {
      console.log(`${trend.date}: ${trend.count} enrollments`);
    });
  });
```

## Performance Considerations

1. **Dashboard Caching**: The dashboard endpoint is cached for 5 minutes. Subsequent calls within this period will return cached data.

2. **Query Optimization**: All endpoints use optimized queries with `select_related` and `prefetch_related` to minimize database queries.

3. **Pagination**: For large datasets, consider implementing pagination in future versions.

4. **Time-Based Queries**: Active student calculations involve querying the last 30 days of activity. For high-traffic systems, consider adding appropriate database indexes.

## Integration Checklist

- [ ] Ensure JWT authentication is configured
- [ ] Verify trainer/instructor accounts have `is_instructor=True`
- [ ] Set up proper CORS configuration if calling from different domain
- [ ] Implement error handling in frontend
- [ ] Add loading states for API calls
- [ ] Consider implementing refresh intervals for dashboard data
- [ ] Handle edge cases (no courses, no enrollments, etc.)
