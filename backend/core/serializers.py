import logging

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user data.
    
    Provides user profile information including username, email, and role flags.
    """
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'is_student', 'is_instructor', 'is_staff', 'avatar_url', 'preferred_language'
        ]
        read_only_fields = ['id', 'avatar_url', 'is_staff']
    
    def get_avatar_url(self, obj):
        """Get avatar URL if exists"""
        if hasattr(obj, 'avatar') and obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    
    Allows updating first_name, last_name, and other profile fields.
    """
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    location = serializers.CharField(required=False, allow_blank=True, max_length=100)
    website = serializers.URLField(required=False, allow_blank=True)
    notification_preferences = serializers.JSONField(required=False)
    preferred_language = serializers.ChoiceField(
        choices=User.LANGUAGE_CHOICES,
        required=False,
        help_text="Preferred language for video player interface and captions"
    )
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'bio', 'phone', 
            'location', 'website', 'notification_preferences', 'preferred_language'
        ]
    
    def update(self, instance, validated_data):
        """Update user profile fields"""
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing user password.
    
    Validates old password and ensures new password meets requirements.
    """
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    
    def validate_new_password(self, value):
        """
        Validate new password strength.

        Runs Django's configured AUTH_PASSWORD_VALIDATORS (length, common
        passwords, all-numeric, similarity to user attributes) in addition to
        the local complexity rules.
        """
        validate_password(value, user=self.context.get('user'))

        # Local complexity requirements on top of the Django validators.
        if not any(c.isupper() for c in value):
            raise serializers.ValidationError('Password must contain at least one uppercase letter.')

        if not any(c.islower() for c in value):
            raise serializers.ValidationError('Password must contain at least one lowercase letter.')

        if not any(c.isdigit() for c in value):
            raise serializers.ValidationError('Password must contain at least one digit.')

        return value
    
    def validate(self, data):
        """Validate that current password is correct"""
        user = self.context.get('user')
        if not user:
            raise serializers.ValidationError('User context is required.')
        
        if not user.check_password(data['current_password']):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect.'})
        
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """
    Public self-registration. Always creates a STUDENT account.

    SECURITY: `is_instructor` used to be a client-writable field here, so
    anyone could self-register as an instructor. That role can create courses
    and — combined with the instructor-scoped read paths elsewhere in the API —
    was a privilege escalation. Instructor access is now granted only by an
    admin. See PRODUCTION_READINESS.md (P0-9).
    """
    password = serializers.CharField(
        write_only=True,
        help_text="Password must satisfy the configured password validators",
    )
    password_confirm = serializers.CharField(write_only=True, help_text="Confirm password")
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate_email(self, value):
        """Emails are the login identifier, so they must be unique."""
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_password(self, value):
        """
        Run Django's configured AUTH_PASSWORD_VALIDATORS.

        Previously registration enforced only min_length=8, bypassing the
        common-password and numeric-password checks entirely.
        """
        validate_password(value)
        return value

    def validate(self, data):
        """Validate that passwords match"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        """Create a student account. Role flags are never taken from input."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(
            **validated_data,
            is_student=True,
            is_instructor=False,
            is_staff=False,
            is_superuser=False,
        )
        user.set_password(password)
        user.save()
        return user


class TrainerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for trainer profile information.
    
    Includes all profile fields and notification preferences.
    """
    avatar_url = serializers.SerializerMethodField()
    notification_preferences = serializers.JSONField(required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'bio', 'expertise', 'avatar', 'avatar_url',
            'notification_preferences'
        ]
        read_only_fields = ['id', 'username', 'avatar_url']
    
    def get_avatar_url(self, obj):
        """Get avatar URL if exists"""
        if hasattr(obj, 'avatar') and obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    def validate_notification_preferences(self, value):
        """Validate notification preferences structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError('Notification preferences must be a JSON object.')
        
        # Ensure expected keys exist
        valid_keys = [
            'discussion_notifications',
            'progress_notifications',
            'assessment_notifications',
            'auto_publish_courses'
        ]
        
        for key in value.keys():
            if key not in valid_keys:
                raise serializers.ValidationError(f'Invalid preference key: {key}')
        
        return value


class StudentListSerializer(serializers.Serializer):
    """
    Serializer for student list in trainer's courses.
    
    Provides student information with enrollment count and overall progress.
    """
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    enrolled_course_count = serializers.IntegerField()
    overall_progress = serializers.FloatField()
    
    def to_representation(self, instance):
        """Format the student data"""
        return {
            'id': instance['id'],
            'username': instance['username'],
            'email': instance['email'],
            'first_name': instance['first_name'],
            'last_name': instance['last_name'],
            'enrolled_course_count': instance['enrolled_course_count'],
            'overall_progress': round(instance['overall_progress'], 2)
        }


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user data.
    
    Returns access token, refresh token, and user profile information on successful login.
    Accepts email for authentication (standard modern approach).
    """
    # Override default username field to accept email
    username_field = 'email'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove username field and add email field
        self.fields.pop('username', None)
        self.fields['email'] = serializers.EmailField(required=True)
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['is_student'] = user.is_student
        token['is_instructor'] = user.is_instructor
        return token

    def validate(self, attrs):
        # Log outcomes without the submitted email address: these lines land in
        # aggregated logs, and recording the identifier on every attempt turns
        # the log into a credential-adjacent PII store.
        logger = logging.getLogger(__name__)

        email = (attrs.get('email') or '').lower().strip()
        password = attrs.get('password')

        user = User.objects.filter(email__iexact=email).first()

        # Always run a password hash comparison, even when no user matched, so
        # response timing does not disclose whether the address is registered.
        if user is None:
            User().set_password(password)
            logger.info("Login failed: no account for submitted address")
            raise serializers.ValidationError('Invalid credentials')

        if not user.check_password(password):
            logger.info("Login failed: bad password for user id=%s", user.pk)
            raise serializers.ValidationError('Invalid credentials')

        if not user.is_active:
            logger.info("Login failed: inactive account id=%s", user.pk)
            raise serializers.ValidationError('Invalid credentials')

        logger.info("Login succeeded for user id=%s", user.pk)

        # Generate tokens
        refresh = self.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }

        return data


class StudentDetailSerializer(serializers.Serializer):
    """
    Serializer for detailed student information.

    Provides comprehensive student data including course-by-course progress
    and assessment history.
    """
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    avatar_url = serializers.SerializerMethodField()
    bio = serializers.CharField(allow_null=True)
    phone = serializers.CharField(allow_null=True)
    location = serializers.CharField(allow_null=True)
    enrolled_course_count = serializers.IntegerField()
    overall_progress = serializers.FloatField()
    enrolled_courses = serializers.ListField(child=serializers.DictField())
    assessment_history = serializers.DictField()

    def get_avatar_url(self, obj):
        """Get avatar URL if exists"""
        if obj.get('avatar'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj['avatar'])
            return obj['avatar']
        return None


class LessonProgressSerializer(serializers.Serializer):
    """
    Serializer for lesson progress within a course.
    """
    lesson_id = serializers.IntegerField()
    lesson_title = serializers.CharField()
    lesson_order = serializers.IntegerField()
    completed = serializers.BooleanField()
    completed_at = serializers.DateTimeField(allow_null=True)
    time_spent_seconds = serializers.IntegerField(allow_null=True)
    time_spent_formatted = serializers.CharField(allow_null=True)


class CourseProgressSerializer(serializers.Serializer):
    """
    Serializer for course progress details.
    """
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    course_thumbnail = serializers.URLField(allow_null=True)
    enrolled_at = serializers.DateTimeField()
    progress_percentage = serializers.FloatField()
    total_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    lessons = serializers.ListField(child=serializers.DictField())
    quiz_attempts = serializers.ListField(child=serializers.DictField())
    total_time_spent_seconds = serializers.IntegerField()
    total_time_spent_formatted = serializers.CharField()


class StudentProgressSerializer(serializers.Serializer):
    """
    Serializer for detailed student progress across all courses.
    """
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    student_email = serializers.EmailField()
    courses = serializers.ListField(child=serializers.DictField())


class BulkMessageSerializer(serializers.Serializer):
    """
    Serializer for bulk message to students.
    """
    student_ids = serializers.ListField(child=serializers.IntegerField(), required=True)
    subject = serializers.CharField(required=True, max_length=200)
    message = serializers.CharField(required=True)

    def validate_student_ids(self, value):
        """Validate that student IDs are not empty"""
        if not value:
            raise serializers.ValidationError("At least one student ID must be provided.")
        return value
