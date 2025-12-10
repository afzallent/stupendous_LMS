"""
Trainer-specific API views for profile and settings management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model

from .serializers import TrainerProfileSerializer, ChangePasswordSerializer
from .permissions import IsInstructor

User = get_user_model()


class TrainerProfileViewSet(viewsets.ViewSet):
    """
    ViewSet for trainer profile management.
    
    Provides endpoints for trainers to manage their profile information,
    upload avatar images, and configure notification preferences.
    """
    permission_classes = [IsAuthenticated, IsInstructor]
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Get trainer profile information.
        
        GET /api/trainer/profile/
        """
        serializer = TrainerProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """
        Update trainer profile information.
        
        PUT/PATCH /api/trainer/profile/update_profile/
        """
        serializer = TrainerProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(
        detail=False,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_avatar(self, request):
        """
        Upload trainer profile avatar image.
        
        POST /api/trainer/profile/upload_avatar/
        
        Validates:
        - File type: JPEG, PNG, GIF, WebP
        - File size: Max 5MB
        
        Returns updated profile data with avatar URL.
        """
        if 'avatar' not in request.FILES:
            return Response(
                {'avatar': ['No file was submitted.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        avatar_file = request.FILES['avatar']
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB in bytes
        if avatar_file.size > max_size:
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
        
        # Save avatar to user profile
        request.user.avatar = avatar_file
        request.user.save()
        
        # Return updated profile data
        serializer = TrainerProfileSerializer(request.user, context={'request': request})
        return Response({
            'detail': 'Avatar uploaded successfully.',
            'profile': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['delete'])
    def delete_avatar(self, request):
        """
        Delete trainer profile avatar image.
        
        DELETE /api/trainer/profile/delete_avatar/
        """
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
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """
        Change trainer password.
        
        POST /api/trainer/profile/change_password/
        
        Request body:
        {
            "current_password": "current_password",
            "new_password": "new_password"
        }
        
        Validates:
        - Current password is correct
        - New password meets strength requirements:
          * Minimum 8 characters
          * At least one uppercase letter
          * At least one lowercase letter
          * At least one digit
        
        Returns success message on successful password change.
        """
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if serializer.is_valid():
            # Update password using set_password to properly hash it
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            return Response({
                'detail': 'Password changed successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
