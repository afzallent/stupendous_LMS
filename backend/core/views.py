from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.views.generic import TemplateView
from .forms import CustomUserCreationForm

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser

from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    CustomTokenObtainPairSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer
)

User = get_user_model()


def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('home')
    else:
        form = CustomUserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


class HomeView(TemplateView):
    template_name = 'core/home.html'


class AuthViewSet(viewsets.ViewSet):
    """ViewSet for authentication endpoints"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new user"""
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """Login user and return tokens"""
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """Logout user by invalidating refresh token"""
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileViewSet(viewsets.ViewSet):
    """ViewSet for user profile endpoints"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch', 'put'])
    def me(self, request):
        """Get or update current user profile"""
        if request.method == 'GET':
            serializer = UserSerializer(request.user, context={'request': request})
            return Response(serializer.data)
        
        # PATCH or PUT - update profile
        serializer = UserProfileUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            # Return updated user data
            user_serializer = UserSerializer(request.user, context={'request': request})
            return Response(user_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password"""
        serializer = ChangePasswordSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify old password
        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Current password is incorrect.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        
        return Response(
            {'detail': 'Password changed successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser], permission_classes=[IsAuthenticated])
    def upload_avatar(self, request):
        """Upload user avatar image"""
        if 'avatar' not in request.FILES:
            return Response(
                {'avatar': ['No file was submitted.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        avatar_file = request.FILES['avatar']
        
        # Validate file size (max 5MB)
        if avatar_file.size > 5 * 1024 * 1024:
            return Response(
                {'avatar': ['File size must be less than 5MB.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {'avatar': ['File must be an image (JPEG, PNG, GIF, or WebP).']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save avatar
        request.user.avatar = avatar_file
        request.user.save()
        
        return Response({
            'detail': 'Avatar uploaded successfully.',
            'avatar_url': request.user.avatar.url if request.user.avatar else None
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_avatar(self, request):
        """Delete user avatar image"""
        if request.user.avatar:
            # Delete the file from storage
            if request.user.avatar.storage.exists(request.user.avatar.name):
                request.user.avatar.storage.delete(request.user.avatar.name)
            
            # Clear the avatar field
            request.user.avatar = None
            request.user.save()
            
            return Response({
                'detail': 'Avatar deleted successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'detail': 'No avatar to delete.'
        }, status=status.HTTP_200_OK)


class UserManagementViewSet(viewsets.ModelViewSet):
    """ViewSet for admin user management"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only admins can access user management"""
        if not self.request.user.is_staff:
            return User.objects.none()
        return User.objects.all()
    
    def list(self, request, *args, **kwargs):
        """List all users (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """Get user details (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().retrieve(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update user (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        # Allow updating user roles and status
        if 'is_student' in request.data:
            user.is_student = request.data['is_student']
        if 'is_instructor' in request.data:
            user.is_instructor = request.data['is_instructor']
        if 'is_staff' in request.data:
            user.is_staff = request.data['is_staff']
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        # Prevent deleting the current user
        if user.id == request.user.id:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def create_user(self, request):
        """Create a new user (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can create users.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')
            first_name = request.data.get('first_name', '')
            last_name = request.data.get('last_name', '')
            is_student = request.data.get('is_student', False)
            is_instructor = request.data.get('is_instructor', False)
            is_staff = request.data.get('is_staff', False)
            
            if not username or not email or not password:
                return Response(
                    {'detail': 'username, email, and password are required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if User.objects.filter(username=username).exists():
                return Response(
                    {'detail': 'Username already exists.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if User.objects.filter(email=email).exists():
                return Response(
                    {'detail': 'Email already exists.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_student=is_student,
                is_instructor=is_instructor,
                is_staff=is_staff
            )
            
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
