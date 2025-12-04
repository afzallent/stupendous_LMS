# Quick Start: Implementing CompassLMS Features

## Step-by-Step Implementation Guide

### Step 1: Update Django Models (Day 1)

**File**: `backend/courses/models.py`

Add these imports at the top:
```python
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
```

Add these model classes:

```python
# ============ FILE MANAGEMENT ============
class UploadedFile(models.Model):
    FILE_CATEGORIES = [
        ('AVATAR', 'User Avatar'),
        ('THUMBNAIL', 'Course Thumbnail'),
        ('VIDEO', 'Video Content'),
        ('DOCUMENT', 'Document'),
        ('RESOURCE', 'Resource'),
    ]
    
    VIRUS_SCAN_STATUS = [
        ('PENDING', 'Pending'),
        ('SCANNING', 'Scanning'),
        ('CLEAN', 'Clean'),
        ('INFECTED', 'Infected'),
        ('ERROR', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_name = models.CharField(max_length=255)
    file_name = models.CharField(max_length=255, unique=True)
    file_path = models.FileField(upload_to='uploads/%Y/%m/%d/')
    mime_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    category = models.CharField(max_length=20, choices=FILE_CATEGORIES)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    virus_scan_status = models.CharField(max_length=20, choices=VIRUS_SCAN_STATUS, default='PENDING')
    virus_scan_result = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['uploaded_by']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.original_name


# ============ COURSE ENHANCEMENTS ============
class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name


class Chapter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']
        unique_together = ['course', 'order']
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"


# ============ PROGRESS TRACKING ============
class Progress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_records')
    lesson = models.ForeignKey('Lesson', on_delete=models.CASCADE, related_name='progress')
    enrollment = models.ForeignKey('Enrollment', on_delete=models.CASCADE, related_name='lesson_progress', null=True, blank=True)
    progress_percentage = models.FloatField(default=0)
    watch_time = models.PositiveIntegerField(default=0)  # seconds
    completed = models.BooleanField(default=False)
    last_position = models.PositiveIntegerField(null=True, blank=True)  # seconds
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['student', 'lesson']
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.lesson.title}"


# ============ ACTIVITY LOGGING ============
class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=100)
    details = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.action}"
```

### Step 2: Create Serializers (Day 1)

**File**: `backend/courses/serializers.py`

Add these serializers:

```python
from rest_framework import serializers
from .models import UploadedFile, Category, Chapter, Progress, ActivityLog

class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ['id', 'original_name', 'file_size', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'icon']


class ChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapter
        fields = ['id', 'title', 'order', 'course']
        read_only_fields = ['id']


class ProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Progress
        fields = [
            'id', 'lesson', 'progress_percentage', 'watch_time',
            'completed', 'last_position', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ['id', 'action', 'details', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']
```

### Step 3: Create Migrations (Day 1)

```bash
cd backend
python manage.py makemigrations courses
python manage.py migrate
```

### Step 4: Create ViewSets (Day 2)

**File**: `backend/courses/views.py`

Add these ViewSets:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import UploadedFile, Category, Chapter, Progress, ActivityLog
from .serializers import (
    UploadedFileSerializer, CategorySerializer, ChapterSerializer,
    ProgressSerializer, ActivityLogSerializer
)


class UploadedFileViewSet(viewsets.ModelViewSet):
    queryset = UploadedFile.objects.filter(is_active=True)
    serializer_class = UploadedFileSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category = request.query_params.get('category')
        if category:
            files = UploadedFile.objects.filter(category=category, is_active=True)
            serializer = self.get_serializer(files, many=True)
            return Response(serializer.data)
        return Response({'error': 'category parameter required'}, status=status.HTTP_400_BAD_REQUEST)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ChapterViewSet(viewsets.ModelViewSet):
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        course_id = self.request.query_params.get('course_id')
        if course_id:
            return Chapter.objects.filter(course_id=course_id)
        return Chapter.objects.all()


class ProgressViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Progress.objects.filter(student=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(student=self.request.user)
    
    @action(detail=False, methods=['get'])
    def by_lesson(self, request):
        lesson_id = request.query_params.get('lesson_id')
        if lesson_id:
            progress = Progress.objects.filter(
                student=request.user,
                lesson_id=lesson_id
            ).first()
            if progress:
                serializer = self.get_serializer(progress)
                return Response(serializer.data)
            return Response({'error': 'No progress found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'lesson_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_id = self.request.query_params.get('user_id')
        if user_id:
            return ActivityLog.objects.filter(user_id=user_id)
        return ActivityLog.objects.filter(user=self.request.user)
```

### Step 5: Register URLs (Day 2)

**File**: `backend/courses/urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'files', views.UploadedFileViewSet, basename='file')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'chapters', views.ChapterViewSet, basename='chapter')
router.register(r'progress', views.ProgressViewSet, basename='progress')
router.register(r'activity-logs', views.ActivityLogViewSet, basename='activity-log')

urlpatterns = [
    path('', include(router.urls)),
]
```

### Step 6: Create Tests (Day 3)

**File**: `backend/courses/tests/test_progress.py`

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from hypothesis import given, strategies as st
from courses.models import Progress, Lesson, Course, Chapter

User = get_user_model()


@pytest.mark.django_db
class TestProgressTracking:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.course = Course.objects.create(
            title='Test Course',
            instructor=self.user
        )
        self.chapter = Chapter.objects.create(
            course=self.course,
            title='Chapter 1',
            order=1
        )
        self.lesson = Lesson.objects.create(
            course=self.course,
            chapter=self.chapter,
            title='Lesson 1',
            order=1
        )
    
    def test_create_progress(self):
        """Test creating progress record"""
        self.client.force_authenticate(user=self.user)
        data = {
            'lesson': self.lesson.id,
            'progress_percentage': 50,
            'watch_time': 300,
            'completed': False
        }
        response = self.client.post('/api/progress/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Progress.objects.count() == 1
    
    def test_get_user_progress(self):
        """Test retrieving user's progress"""
        Progress.objects.create(
            student=self.user,
            lesson=self.lesson,
            progress_percentage=75,
            watch_time=450
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/progress/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
    
    @given(
        progress=st.floats(min_value=0, max_value=100),
        watch_time=st.integers(min_value=0, max_value=3600)
    )
    def test_progress_values_property(self, progress, watch_time):
        """Property: Progress values should be within valid ranges"""
        p = Progress.objects.create(
            student=self.user,
            lesson=self.lesson,
            progress_percentage=progress,
            watch_time=watch_time
        )
        assert 0 <= p.progress_percentage <= 100
        assert p.watch_time >= 0
```

### Step 7: Run Tests (Day 3)

```bash
cd backend
python -m pytest courses/tests/test_progress.py -v
```

### Step 8: Update Admin (Day 4)

**File**: `backend/courses/admin.py`

```python
from django.contrib import admin
from .models import UploadedFile, Category, Chapter, Progress, ActivityLog

@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'category', 'file_size', 'uploaded_by', 'created_at']
    list_filter = ['category', 'virus_scan_status', 'created_at']
    search_fields = ['original_name', 'uploaded_by__username']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order']
    list_filter = ['course']
    ordering = ['course', 'order']


@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ['student', 'lesson', 'progress_percentage', 'completed', 'updated_at']
    list_filter = ['completed', 'updated_at']
    search_fields = ['student__username', 'lesson__title']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['user__username', 'action']
    readonly_fields = ['id', 'created_at']
```

---

## Verification Checklist

- [ ] Models created and migrations run
- [ ] Serializers created
- [ ] ViewSets created
- [ ] URLs registered
- [ ] Tests written and passing
- [ ] Admin interface updated
- [ ] API endpoints tested with Postman/curl
- [ ] Documentation updated

---

## Testing the Implementation

### Using curl:

```bash
# Create a file upload
curl -X POST http://localhost:8000/api/files/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf" \
  -F "category=DOCUMENT"

# Get categories
curl http://localhost:8000/api/categories/

# Create progress
curl -X POST http://localhost:8000/api/progress/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson": "lesson-id",
    "progress_percentage": 50,
    "watch_time": 300
  }'

# Get user progress
curl http://localhost:8000/api/progress/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Next Phase: Quiz System

Once Phase 1 is complete, implement:

1. Quiz model
2. Question model
3. QuizAttempt model
4. QuizAnswer model
5. Scoring logic
6. ViewSets and serializers
7. Tests

---

## Common Issues & Solutions

### Issue: Migration conflicts
**Solution**: 
```bash
python manage.py makemigrations --merge
python manage.py migrate
```

### Issue: File upload not working
**Solution**: Ensure `MEDIA_ROOT` and `MEDIA_URL` are configured in settings.py

### Issue: Tests failing
**Solution**: Run with verbose output:
```bash
python -m pytest -vv --tb=short
```

---

## Performance Tips

1. Add database indexes for frequently queried fields
2. Use `select_related()` and `prefetch_related()` in ViewSets
3. Implement pagination for large datasets
4. Cache category and course listings
5. Use CDN for file delivery

---

## Security Tips

1. Validate file uploads
2. Scan files for viruses
3. Implement rate limiting
4. Use HTTPS only
5. Validate all user input
6. Implement CORS properly

