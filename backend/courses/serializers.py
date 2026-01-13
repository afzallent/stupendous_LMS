from rest_framework import serializers
from .models import Course, Lesson, Enrollment, Progress, Category, Coupon, Chapter
from core.serializers import UserSerializer


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for coupon codes"""
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'description', 'discount_percentage', 'is_active', 
                  'max_uses', 'times_used', 'valid_from', 'valid_until', 'is_valid']
        read_only_fields = ['id', 'times_used']
    
    def get_is_valid(self, obj):
        return obj.is_valid()


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for course categories"""
    course_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'course_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_course_count(self, obj):
        return obj.courses.filter(status='published').count()


class ChapterSerializer(serializers.ModelSerializer):
    """Serializer for course chapters/sections"""
    lesson_count = serializers.SerializerMethodField()
    is_unlocked = serializers.SerializerMethodField()
    
    class Meta:
        model = Chapter
        fields = ['id', 'course', 'title', 'description', 'order', 'is_locked', 
                  'prerequisite_chapter', 'lesson_count', 'is_unlocked', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lesson_count(self, obj):
        return obj.lessons.count()
    
    def get_is_unlocked(self, obj):
        """Check if chapter is unlocked for current user"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return True
        return obj.is_unlocked_for_student(request.user)


class LessonSerializer(serializers.ModelSerializer):
    """
    Serializer for lesson data.
    
    Represents a lesson within a course, including video URL and content.
    """
    chapter_title = serializers.CharField(source='chapter.title', read_only=True)
    
    class Meta:
        model = Lesson
        fields = ['id', 'course', 'chapter', 'chapter_title', 'title', 'video_url', 'video_file', 'duration', 'order', 'content']
        read_only_fields = ['id']


class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for course data with nested instructor.
    
    Provides course information including instructor details, lesson count, and enrollment count.
    """
    instructor = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    lesson_count = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'instructor', 'category', 'category_id',
                  'level', 'status', 'price', 'original_price', 'is_free', 'thumbnail',
                  'created_at', 'updated_at', 'published_at',
                  'lesson_count', 'enrolled_count', 'lessons']
        read_only_fields = ['id', 'created_at', 'updated_at', 'published_at', 'instructor']

    def get_lesson_count(self, obj):
        """Get count of lessons in course"""
        return obj.lessons.count()

    def get_enrolled_count(self, obj):
        """Get count of enrolled students"""
        return obj.enrollments.count()


class CourseDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for course with all related data.
    
    Includes enrollment status and progress percentage for the current user.
    """
    instructor = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    lessons = LessonSerializer(many=True, read_only=True)
    lesson_count = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'instructor', 'category', 'level', 'status',
                  'price', 'original_price', 'is_free', 'thumbnail',
                  'created_at', 'updated_at', 'published_at',
                  'lessons', 'lesson_count', 'enrolled_count', 'duration',
                  'is_enrolled', 'progress_percentage']
        read_only_fields = ['id', 'created_at', 'updated_at', 'published_at', 'instructor']

    def get_lesson_count(self, obj):
        """Get count of lessons in course"""
        return obj.lessons.count()

    def get_enrolled_count(self, obj):
        """Get count of enrolled students"""
        return obj.enrollments.count()

    def get_duration(self, obj):
        """Calculate total duration of all lessons"""
        total_minutes = 0
        for lesson in obj.lessons.all():
            if lesson.duration:
                total_minutes += lesson.duration
        
        # If no durations set, estimate based on lesson count (avg 10 min per lesson)
        if total_minutes == 0:
            total_minutes = obj.lessons.count() * 10
        
        hours = total_minutes // 60
        minutes = total_minutes % 60
        return f"{hours}h {minutes}m"

    def get_is_enrolled(self, obj):
        """Check if current user is enrolled"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.enrollments.filter(student=request.user).exists()
        return False

    def get_progress_percentage(self, obj):
        """Calculate progress percentage for current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            total_lessons = obj.lessons.count()
            if total_lessons == 0:
                return 0
            completed = Progress.objects.filter(
                student=request.user,
                lesson__course=obj,
                completed=True
            ).count()
            return int((completed / total_lessons) * 100)
        return 0


class ProgressSerializer(serializers.ModelSerializer):
    """
    Serializer for progress tracking.
    
    Tracks lesson completion status and timestamps for students.
    """
    lesson = LessonSerializer(read_only=True)
    lesson_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Progress
        fields = ['id', 'student', 'lesson', 'lesson_id', 'completed', 'completed_at']
        read_only_fields = ['id', 'student', 'completed_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    """
    Serializer for enrollment with nested course data.
    
    Represents a student's enrollment in a course with progress information.
    """
    course = CourseSerializer(read_only=True)
    course_id = serializers.IntegerField(write_only=True)
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'course_id', 'enrolled_at', 'progress_percentage']
        read_only_fields = ['id', 'student', 'enrolled_at']

    def get_progress_percentage(self, obj):
        """Calculate progress percentage for this enrollment"""
        total_lessons = obj.course.lessons.count()
        if total_lessons == 0:
            return 0
        completed = Progress.objects.filter(
            student=obj.student,
            lesson__course=obj.course,
            completed=True
        ).count()
        return int((completed / total_lessons) * 100)

    def create(self, validated_data):
        """Create enrollment with current user as student"""
        request = self.context.get('request')
        validated_data['student'] = request.user
        return super().create(validated_data)
