from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class Coupon(models.Model):
    """Coupon code model for discounts and free access"""
    code = models.CharField(max_length=50, unique=True, help_text="Coupon code (e.g., PRERELEASE)")
    description = models.TextField(blank=True, help_text="Description of the coupon")
    discount_percentage = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Discount percentage (0-100)"
    )
    is_active = models.BooleanField(default=True, help_text="Whether the coupon is active")
    max_uses = models.IntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of times this coupon can be used (null = unlimited)"
    )
    times_used = models.IntegerField(default=0, help_text="Number of times this coupon has been used")
    valid_from = models.DateTimeField(default=timezone.now, help_text="When the coupon becomes valid")
    valid_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the coupon expires (null = no expiration)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} ({self.discount_percentage}% off)"
    
    def is_valid(self):
        """Check if coupon is valid for use"""
        if not self.is_active:
            return False
        
        now = timezone.now()
        if now < self.valid_from:
            return False
        
        if self.valid_until and now > self.valid_until:
            return False
        
        if self.max_uses and self.times_used >= self.max_uses:
            return False
        
        return True
    
    def use_coupon(self):
        """Increment the times_used counter"""
        self.times_used += 1
        self.save()


class Category(models.Model):
    """Course category model"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name


class Course(models.Model):
    """Course model with categories and status"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    LEVEL_CHOICES = [
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    markdown_description = models.TextField(blank=True, help_text="Detailed course description in Markdown format")
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courses_created')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='Beginner', help_text="Course difficulty level")
    thumbnail = models.ImageField(upload_to='course_thumbnails/', null=True, blank=True, help_text="Course thumbnail image")
    hero_image = models.ImageField(upload_to='course_heroes/', null=True, blank=True, help_text="Course hero/banner image for overview page")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Pricing fields
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Course price in USD")
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Original price before discount")
    is_free = models.BooleanField(default=False, help_text="Mark course as free")
    
    # Course Settings (Requirements 10.1, 10.2, 10.3)
    sequential_progression = models.BooleanField(default=False, help_text="Require students to complete lessons in order")
    enable_certificate = models.BooleanField(default=False, help_text="Enable certificate on course completion")
    certificate_min_completion = models.IntegerField(
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Minimum completion percentage required for certificate (0-100)"
    )
    enable_discussions = models.BooleanField(default=False, help_text="Enable discussion forums for this course")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return self.title
    
    def publish(self):
        """Publish the course"""
        if self.status != 'published':
            self.status = 'published'
            self.published_at = timezone.now()
            self.save()
    
    def unpublish(self):
        """Unpublish the course (back to draft)"""
        if self.status == 'published':
            self.status = 'draft'
            self.save()


class Chapter(models.Model):
    """Chapter/Section model for organizing lessons"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=200, help_text="Chapter title (e.g., 'Introduction', 'Advanced Topics')")
    description = models.TextField(blank=True, help_text="Optional chapter description")
    order = models.IntegerField(default=0, help_text="Order of chapter in course")
    is_locked = models.BooleanField(default=False, help_text="Lock chapter until prerequisites are met")
    prerequisite_chapter = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='dependent_chapters',
        help_text="Chapter that must be completed before this one is unlocked"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']
        unique_together = ['course', 'order']
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"
    
    def is_unlocked_for_student(self, student):
        """Check if chapter is unlocked for a specific student"""
        if not self.is_locked:
            return True
        
        if not self.prerequisite_chapter:
            return True
        
        # Check if all lessons in prerequisite chapter are completed
        prerequisite_lessons = self.prerequisite_chapter.lessons.all()
        if not prerequisite_lessons.exists():
            return True
        
        completed_count = Progress.objects.filter(
            student=student,
            lesson__in=prerequisite_lessons,
            completed=True
        ).count()
        
        return completed_count == prerequisite_lessons.count()


class Lesson(models.Model):
    # Content type choices for different lesson formats
    CONTENT_TYPE_VIDEO = 'video'
    CONTENT_TYPE_MARKDOWN = 'markdown'
    CONTENT_TYPE_SCORM = 'scorm'
    CONTENT_TYPE_H5P = 'h5p'
    CONTENT_TYPE_HTML_EMBED = 'html_embed'
    
    CONTENT_TYPE_CHOICES = [
        (CONTENT_TYPE_VIDEO, 'Video'),
        (CONTENT_TYPE_MARKDOWN, 'Markdown Document'),
        (CONTENT_TYPE_SCORM, 'SCORM Package'),
        (CONTENT_TYPE_H5P, 'H5P Interactive Content'),
        (CONTENT_TYPE_HTML_EMBED, 'HTML Embed'),
    ]
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True, related_name='lessons', help_text="Chapter this lesson belongs to")
    title = models.CharField(max_length=200)
    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPE_CHOICES,
        default=CONTENT_TYPE_VIDEO,
        help_text="Type of content for this lesson"
    )
    video_url = models.URLField(blank=True, null=True, help_text="Enter the URL of the video (e.g. YouTube embed URL)")
    video_file = models.FileField(upload_to='lesson_videos/', null=True, blank=True, help_text="Upload video file")
    thumbnail_url = models.URLField(blank=True, null=True, help_text="Thumbnail image URL (auto-fetched from YouTube)")
    duration = models.CharField(max_length=20, blank=True, null=True, help_text="Video duration (e.g., 5:30)")
    is_embeddable = models.BooleanField(default=True, help_text="Whether the video can be embedded")
    order = models.PositiveIntegerField(default=0)
    content = models.TextField(blank=True, help_text="Additional notes or content")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Enrollment(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username} enrolled in {self.course.title}"

class Progress(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('student', 'lesson')
        verbose_name_plural = "Progress"

    def save(self, *args, **kwargs):
        if self.completed and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        status = "Completed" if self.completed else "In Progress"
        return f"{self.student.username} - {self.lesson.title} ({status})"


# Import content type models for convenience
from .content_models import (
    MarkdownLesson,
    H5PPackage,
    H5PContentState,
    HTMLEmbed,
    ContentInteraction,
)

__all__ = [
    'Coupon',
    'Category',
    'Course',
    'Chapter',
    'Lesson',
    'Enrollment',
    'Progress',
    'MarkdownLesson',
    'H5PPackage',
    'H5PContentState',
    'HTMLEmbed',
    'ContentInteraction',
]
