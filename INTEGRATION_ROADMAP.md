# stupendousLMS Integration Roadmap

## Overview
This document outlines the step-by-step integration of advanced features from CompassLMS into stupendousLMS, organized by priority and implementation complexity.

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Database Schema Enhancements

**Files to Update**: `backend/lms_project/settings.py`, `backend/courses/models.py`

#### Add to Django Models:

```python
# backend/courses/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
import uuid

User = get_user_model()

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
    file_size = models.BigIntegerField()  # in bytes
    category = models.CharField(max_length=20, choices=FILE_CATEGORIES)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files')
    
    # Virus scanning
    virus_scan_status = models.CharField(max_length=20, choices=VIRUS_SCAN_STATUS, default='PENDING')
    virus_scan_result = models.TextField(null=True, blank=True)
    
    # Metadata
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
    icon = models.CharField(max_length=50, blank=True)  # icon name
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name


class Course(models.Model):
    COURSE_STATUS = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('ARCHIVED', 'Archived'),
    ]
    
    DIFFICULTY_LEVEL = [
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('ADVANCED', 'Advanced'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Media
    thumbnail = models.ForeignKey(
        UploadedFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='course_thumbnails'
    )
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=COURSE_STATUS, default='DRAFT')
    level = models.CharField(max_length=20, choices=DIFFICULTY_LEVEL, default='BEGINNER')
    language = models.CharField(max_length=10, default='en')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Learning objectives and requirements
    learning_objectives = models.JSONField(default=list, blank=True)  # Array of strings
    requirements = models.JSONField(default=list, blank=True)  # Array of strings
    target_audience = models.TextField(blank=True)
    
    # Instructor
    instructor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')
    
    # Timestamps
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['instructor']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return self.title


class Chapter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']
        unique_together = ['course', 'order']
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Video
    video_file = models.ForeignKey(
        UploadedFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lesson_videos'
    )
    video_url = models.URLField(blank=True)  # External video URL
    duration = models.PositiveIntegerField(null=True, blank=True)  # in seconds
    
    # Content
    content = models.TextField(blank=True)  # Lesson description/notes
    order = models.PositiveIntegerField()
    is_preview = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']
        unique_together = ['chapter', 'order']
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"


# ============ ENROLLMENT ENHANCEMENTS ============
class Enrollment(models.Model):
    ENROLLMENT_STATUS = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=ENROLLMENT_STATUS, default='ACTIVE')
    progress = models.FloatField(default=0)  # 0-100
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['student', 'course']
        ordering = ['-enrolled_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.course.title}"


# ============ PROGRESS TRACKING ============
class Progress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='progress_records')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='progress')
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='lesson_progress', null=True, blank=True)
    
    # Progress tracking
    progress_percentage = models.FloatField(default=0)  # 0-100
    watch_time = models.PositiveIntegerField(default=0)  # in seconds
    completed = models.BooleanField(default=False)
    last_position = models.PositiveIntegerField(null=True, blank=True)  # last video position in seconds
    
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
    action = models.CharField(max_length=100)  # e.g., 'course_created', 'lesson_completed'
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

### 1.2 Create Serializers

```python
# backend/courses/serializers.py

from rest_framework import serializers
from .models import (
    UploadedFile, Category, Course, Chapter, Lesson,
    Enrollment, Progress, ActivityLog
)

class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ['id', 'original_name', 'file_size', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'icon']


class LessonSerializer(serializers.ModelSerializer):
    video_file = UploadedFileSerializer(read_only=True)
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'description', 'video_file', 'video_url',
            'duration', 'content', 'order', 'is_preview', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ChapterSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    
    class Meta:
        model = Chapter
        fields = ['id', 'title', 'order', 'lessons']


class CourseSerializer(serializers.ModelSerializer):
    thumbnail = UploadedFileSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    chapters = ChapterSerializer(many=True, read_only=True)
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'subtitle', 'description', 'price',
            'thumbnail', 'status', 'level', 'language', 'category',
            'learning_objectives', 'requirements', 'target_audience',
            'instructor', 'published_at', 'created_at', 'chapters'
        ]
        read_only_fields = ['id', 'created_at', 'published_at']


class ProgressSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)
    
    class Meta:
        model = Progress
        fields = [
            'id', 'lesson', 'progress_percentage', 'watch_time',
            'completed', 'last_position', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    lesson_progress = ProgressSerializer(many=True, read_only=True)
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'course', 'status', 'progress', 'enrolled_at',
            'completed_at', 'lesson_progress'
        ]
        read_only_fields = ['id', 'enrolled_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ['id', 'action', 'details', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']
```

### 1.3 Create Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

---

## Phase 2: Assessment System (Weeks 3-4)

### 2.1 Quiz Models

```python
# backend/courses/models.py

class Quiz(models.Model):
    QUESTION_TYPES = [
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('MULTIPLE_ANSWER', 'Multiple Answer'),
        ('TRUE_FALSE', 'True/False'),
        ('TEXT', 'Text'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='quiz')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    passing_score = models.PositiveIntegerField(default=70)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title


class Question(models.Model):
    QUESTION_TYPES = [
        ('MULTIPLE_CHOICE', 'Multiple Choice'),
        ('MULTIPLE_ANSWER', 'Multiple Answer'),
        ('TRUE_FALSE', 'True/False'),
        ('TEXT', 'Text'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    options = models.JSONField(default=list, blank=True)  # For MCQ
    correct_answer = models.TextField()
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.question


class QuizAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quiz_attempts')
    score = models.FloatField()
    max_score = models.FloatField()
    passed = models.BooleanField()
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-completed_at']
    
    def __str__(self):
        return f"{self.student.username} - {self.quiz.title}"


class QuizAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.TextField()
    is_correct = models.BooleanField()
    points = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.attempt.student.username} - Q{self.question.order}"
```

---

## Phase 3: Certificates (Weeks 5-6)

### 3.1 Certificate Model

```python
class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    certificate_url = models.URLField()
    certificate_id = models.CharField(max_length=100, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revocation_reason = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['user', 'course']
    
    def __str__(self):
        return f"{self.user.username} - {self.course.title}"
```

---

## Phase 4: Moderation System (Weeks 7-8)

### 4.1 Moderation Models

```python
class ContentReport(models.Model):
    CONTENT_TYPES = [
        ('COURSE', 'Course'),
        ('REVIEW', 'Review'),
        ('USER', 'User'),
        ('LESSON', 'Lesson'),
    ]
    
    SEVERITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    
    REPORT_STATUS = [
        ('PENDING', 'Pending'),
        ('UNDER_REVIEW', 'Under Review'),
        ('RESOLVED', 'Resolved'),
        ('DISMISSED', 'Dismissed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    content_id = models.CharField(max_length=100)
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    reason = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='MEDIUM')
    status = models.CharField(max_length=20, choices=REPORT_STATUS, default='PENDING')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_reviewed')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    resolution = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report: {self.content_type} - {self.reason}"


class ModerationAction(models.Model):
    ACTION_TYPES = [
        ('WARNING', 'Warning'),
        ('SUSPEND', 'Suspend'),
        ('BAN', 'Ban'),
        ('DELETE', 'Delete'),
        ('HIDE', 'Hide'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
    ]
    
    CONTENT_TYPES = [
        ('COURSE', 'Course'),
        ('REVIEW', 'Review'),
        ('USER', 'User'),
        ('LESSON', 'Lesson'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(ContentReport, on_delete=models.SET_NULL, null=True, blank=True, related_name='actions')
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    content_id = models.CharField(max_length=100)
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    performed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='moderation_actions')
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action_type} - {self.content_type}"
```

---

## Phase 5: Support Ticket System (Weeks 9-10)

### 5.1 Support Models

```python
class SupportTicket(models.Model):
    CATEGORIES = [
        ('GENERAL', 'General'),
        ('TECHNICAL', 'Technical'),
        ('BILLING', 'Billing'),
        ('CONTENT', 'Content'),
        ('ACCOUNT', 'Account'),
    ]
    
    PRIORITIES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    
    STATUSES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('WAITING_FOR_USER', 'Waiting for User'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
    subject = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORIES, default='GENERAL')
    priority = models.CharField(max_length=20, choices=PRIORITIES, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUSES, default='OPEN')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Ticket #{self.id} - {self.subject}"


class TicketMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_internal = models.BooleanField(default=False)  # Only visible to staff
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message in Ticket #{self.ticket.id}"
```

---

## Implementation Checklist

- [ ] Phase 1: Database Schema & Serializers
  - [ ] Create models
  - [ ] Create serializers
  - [ ] Run migrations
  - [ ] Create ViewSets
  - [ ] Add URL routes
  - [ ] Write tests

- [ ] Phase 2: Assessment System
  - [ ] Create Quiz models
  - [ ] Create serializers
  - [ ] Implement scoring logic
  - [ ] Create ViewSets
  - [ ] Write tests

- [ ] Phase 3: Certificates
  - [ ] Create Certificate model
  - [ ] Implement certificate generation
  - [ ] Create API endpoints
  - [ ] Write tests

- [ ] Phase 4: Moderation
  - [ ] Create moderation models
  - [ ] Create serializers
  - [ ] Implement moderation workflow
  - [ ] Create admin dashboard
  - [ ] Write tests

- [ ] Phase 5: Support Tickets
  - [ ] Create ticket models
  - [ ] Create serializers
  - [ ] Implement ticket workflow
  - [ ] Create support dashboard
  - [ ] Write tests

---

## Testing Strategy

For each phase, implement:
1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test API endpoints
3. **Property-Based Tests** - Test invariants and properties

Example test structure:
```python
# backend/courses/tests/test_quiz.py
import pytest
from hypothesis import given, strategies as st

@pytest.mark.django_db
class TestQuizSystem:
    def test_quiz_creation(self):
        # Test quiz creation
        pass
    
    @given(score=st.floats(min_value=0, max_value=100))
    def test_passing_score_property(self, score):
        # Property: score >= passing_score means passed
        pass
```

---

## Deployment Considerations

1. **Database Migrations** - Plan migration strategy for production
2. **File Storage** - Set up cloud storage (S3, Cloudinary)
3. **Virus Scanning** - Integrate ClamAV or similar
4. **Backups** - Ensure database backups before major changes
5. **Monitoring** - Set up logging and monitoring

