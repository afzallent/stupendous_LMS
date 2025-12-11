from rest_framework import serializers
from django.contrib.auth import get_user_model
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
            'is_student', 'is_instructor', 'is_staff', 'avatar_url'
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
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'bio', 'phone', 
            'location', 'website', 'notification_preferences'
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
        
        Requirements:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        """
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long.')
        
        # Check for complexity requirements
        has_upper = any(c.isupper() for c in value)
        has_lower = any(c.islower() for c in value)
        has_digit = any(c.isdigit() for c in value)
        
        if not has_upper:
            raise serializers.ValidationError('Password must contain at least one uppercase letter.')
        
        if not has_lower:
            raise serializers.ValidationError('Password must contain at least one lowercase letter.')
        
        if not has_digit:
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
    Serializer for user registration with password validation.
    
    Validates that passwords match and ensures at least one role is selected.
    """
    password = serializers.CharField(write_only=True, min_length=8, help_text="Password must be at least 8 characters")
    password_confirm = serializers.CharField(write_only=True, min_length=8, help_text="Confirm password")
    is_student = serializers.BooleanField(default=False, help_text="Register as a student")
    is_instructor = serializers.BooleanField(default=False, help_text="Register as an instructor")

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'is_student', 'is_instructor']

    def validate(self, data):
        """Validate that passwords match"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        
        # Ensure at least one role is selected
        if not data.get('is_student') and not data.get('is_instructor'):
            raise serializers.ValidationError({'roles': 'User must be either a student or instructor.'})
        
        return data

    def create(self, validated_data):
        """Create user with validated data"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
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
    Accepts both username and email for authentication.
    """
    
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
        # Support both username and email login
        username = attrs.get('username')
        password = attrs.get('password')
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"🔐 Login attempt: username={username}")
        
        # Try to find user by username first, then by email
        user = None
        try:
            user = User.objects.get(username=username)
            logger.info(f"✅ Found user by username: {user.username}")
        except User.DoesNotExist:
            logger.info(f"❌ User not found by username, trying email...")
            try:
                user = User.objects.get(email=username)
                logger.info(f"✅ Found user by email: {user.username}")
            except User.DoesNotExist:
                logger.error(f"❌ User not found by username or email: {username}")
                raise serializers.ValidationError('Invalid credentials')
        
        # Verify password
        if not user.check_password(password):
            logger.error(f"❌ Invalid password for user: {user.username}")
            raise serializers.ValidationError('Invalid credentials')
        
        # Check if user is active
        if not user.is_active:
            logger.error(f"❌ User account disabled: {user.username}")
            raise serializers.ValidationError('User account is disabled')
        
        logger.info(f"✅ Login successful for user: {user.username}")
        
        # Generate tokens
        refresh = self.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }
        
        return data
