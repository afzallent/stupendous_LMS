from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user data.
    
    Provides user profile information including username, email, and role flags.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_student', 'is_instructor']
        read_only_fields = ['id']


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


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user data.
    
    Returns access token, refresh token, and user profile information on successful login.
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
        data = super().validate(attrs)
        # Add user data to response
        user = self.user
        data['user'] = UserSerializer(user).data
        return data
