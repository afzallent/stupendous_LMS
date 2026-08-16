from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import models, IntegrityError
from django.db.models import F
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

    def apply_to(self, price):
        """Return the price after this coupon's discount, never below zero."""
        price = Decimal(price or 0)
        discount = (price * Decimal(self.discount_percentage)) / Decimal(100)
        final = (price - discount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return max(final, Decimal('0.00'))

    def has_been_used_by(self, user):
        """True if this user has already redeemed this coupon."""
        return self.redemptions.filter(user=user).exists()

    def redeem(self, user):
        """
        Atomically record a redemption for `user` and increment the counter.

        Returns False if the coupon became invalid or the user already redeemed
        it. Must be called inside a transaction.

        The previous `use_coupon()` did a read-modify-write on times_used, so
        concurrent redemptions could push usage past max_uses, and nothing
        recorded *who* redeemed — letting one user redeem repeatedly.
        See PRODUCTION_READINESS.md (P2-2).
        """
        # Lock this row so concurrent redemptions serialise behind us.
        locked = Coupon.objects.select_for_update().get(pk=self.pk)
        if not locked.is_valid():
            return False

        try:
            CouponRedemption.objects.create(coupon=locked, user=user)
        except IntegrityError:
            # Unique constraint: this user already redeemed this coupon.
            return False

        Coupon.objects.filter(pk=self.pk).update(times_used=F('times_used') + 1)
        self.refresh_from_db(fields=['times_used'])
        return True


class CouponRedemption(models.Model):
    """
    One row per (coupon, user) redemption.

    Exists so a coupon cannot be redeemed repeatedly by the same account and so
    redemptions are auditable against revenue.
    """
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='redemptions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coupon_redemptions')
    course = models.ForeignKey('Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='coupon_redemptions')
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('coupon', 'user')
        ordering = ['-redeemed_at']

    def __str__(self):
        return f"{self.user} redeemed {self.coupon.code}"


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
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='courses_created')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='Beginner', help_text="Course difficulty level")
    thumbnail = models.ImageField(upload_to='course_thumbnails/', null=True, blank=True, help_text="Course thumbnail image")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Pricing fields
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Course price in USD")
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Original price before discount")
    is_free = models.BooleanField(default=False, help_text="Mark course as free")
    
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
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True, related_name='lessons', help_text="Chapter this lesson belongs to")
    title = models.CharField(max_length=200)
    video_url = models.URLField(blank=True, null=True, help_text="Enter the URL of the video (e.g. YouTube embed URL)")
    video_file = models.FileField(upload_to='lesson_videos/', null=True, blank=True, help_text="Upload video file")
    duration = models.PositiveIntegerField(null=True, blank=True, help_text="Duration in minutes")
    order = models.PositiveIntegerField()
    content = models.TextField(blank=True, help_text="Additional notes or content")

    class Meta:
        ordering = ['order']

    def clean(self):
        """
        A lesson has two paths to a course: directly via `course`, and
        indirectly via `chapter.course`. Nothing kept them in agreement.

        This matters more than it used to: the lesson, quiz and question
        querysets now filter by `course`, so a lesson whose chapter belongs to
        a different course would either vanish from the course it is displayed
        under, or surface inside a course the student has not paid for.
        """
        super().clean()
        if self.chapter_id and self.chapter.course_id != self.course_id:
            raise ValidationError({
                'chapter': (
                    'Chapter belongs to a different course than the lesson. '
                    'A lesson may only be placed in a chapter of its own course.'
                )
            })

    def save(self, *args, **kwargs):
        # Enforce on every write, not just on forms that call full_clean().
        if self.chapter_id and self.chapter.course_id != self.course_id:
            raise ValidationError(
                'Lesson.chapter must belong to the same course as Lesson.course.'
            )
        super().save(*args, **kwargs)

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
