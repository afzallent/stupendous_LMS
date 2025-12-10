from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404

from .models import DiscussionThread, DiscussionReply
from .serializers import (
    DiscussionThreadSerializer, ThreadDetailSerializer, DiscussionReplySerializer
)
from courses.models import Course, Enrollment


class DiscussionThreadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for discussion thread CRUD operations.
    
    Provides list, create, retrieve, update, and destroy actions for discussion threads.
    Filters threads by course_id query parameter and orders by last_activity_at descending.
    """
    queryset = DiscussionThread.objects.filter(is_deleted=False)
    serializer_class = DiscussionThreadSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return ThreadDetailSerializer
        return DiscussionThreadSerializer
    
    def get_queryset(self):
        """
        Filter threads by course_id query parameter.
        Order by last_activity_at descending (most recent first).
        Only return non-deleted threads.
        """
        queryset = DiscussionThread.objects.filter(is_deleted=False)
        
        # Filter by course_id if provided
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # Order by pinned status first, then by last activity
        queryset = queryset.order_by('-is_pinned', '-last_activity_at')
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Create a new discussion thread.
        Verify enrollment for students, ownership for trainers.
        """
        course = serializer.validated_data.get('course')
        user = self.request.user
        
        # Check permissions based on user role
        if user.is_instructor:
            # Trainers can only create threads in their own courses
            if course.instructor != user:
                raise PermissionDenied("You can only create threads in your own courses.")
        else:
            # Students must be enrolled in the course
            if not Enrollment.objects.filter(student=user, course=course).exists():
                raise PermissionDenied("You must be enrolled in this course to create threads.")
        
        # Save with current user as author
        serializer.save(author=self.request.user)
    
    def perform_update(self, serializer):
        """
        Update a discussion thread.
        Only the author or course instructor can update.
        """
        thread = self.get_object()
        user = self.request.user
        
        # Check if user is author or course instructor
        if thread.author != user and thread.course.instructor != user:
            raise PermissionDenied("You can only update your own threads or threads in your courses.")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Soft delete a discussion thread.
        Only the author or course instructor can delete.
        """
        user = self.request.user
        
        # Check if user is author or course instructor
        if instance.author != user and instance.course.instructor != user:
            raise PermissionDenied("You can only delete your own threads or threads in your courses.")
        
        # Soft delete
        instance.is_deleted = True
        instance.save()
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a discussion thread with all replies.
        Verify enrollment for students, ownership for trainers.
        """
        thread = self.get_object()
        user = request.user
        
        # Check permissions based on user role
        if user.is_instructor:
            # Trainers can only view threads in their own courses
            if thread.course.instructor != user:
                raise PermissionDenied("You can only view threads in your own courses.")
        else:
            # Students must be enrolled in the course
            if not Enrollment.objects.filter(student=user, course=thread.course).exists():
                raise PermissionDenied("You must be enrolled in this course to view threads.")
        
        serializer = self.get_serializer(thread)
        return Response(serializer.data)
    
    def list(self, request, *args, **kwargs):
        """
        List discussion threads.
        Verify enrollment for students, ownership for trainers.
        """
        course_id = request.query_params.get('course_id')
        
        if course_id:
            # Verify access to the course
            try:
                course = Course.objects.get(id=course_id)
            except Course.DoesNotExist:
                raise PermissionDenied("Course not found.")
            
            user = request.user
            
            # Check permissions based on user role
            if user.is_instructor:
                # Trainers can only view threads in their own courses
                if course.instructor != user:
                    raise PermissionDenied("You can only view threads in your own courses.")
            else:
                # Students must be enrolled in the course
                if not Enrollment.objects.filter(student=user, course=course).exists():
                    raise PermissionDenied("You must be enrolled in this course to view threads.")
        
        return super().list(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], url_path='replies')
    def add_reply(self, request, pk=None):
        """
        Add a reply to a discussion thread.
        POST /api/discussions/{id}/replies/
        
        Updates thread's last_activity_at timestamp.
        Verifies user has access to the course.
        """
        thread = self.get_object()
        user = request.user
        
        # Check if thread is locked
        if thread.is_locked:
            return Response(
                {"error": "This thread is locked and cannot receive new replies."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions based on user role
        if user.is_instructor:
            # Trainers can only reply in their own courses
            if thread.course.instructor != user:
                raise PermissionDenied("You can only reply to threads in your own courses.")
        else:
            # Students must be enrolled in the course
            if not Enrollment.objects.filter(student=user, course=thread.course).exists():
                raise PermissionDenied("You must be enrolled in this course to reply.")
        
        # Create the reply
        serializer = DiscussionReplySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Save reply with current user as author and the thread
            reply = serializer.save(author=user, thread=thread)
            
            # Update thread's last_activity_at (handled in model save method)
            # But we'll explicitly update it here to ensure it's set to now
            from django.utils import timezone
            thread.last_activity_at = timezone.now()
            thread.save(update_fields=['last_activity_at'])
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put', 'patch', 'delete'], url_path='replies/(?P<reply_id>[^/.]+)')
    def manage_reply(self, request, pk=None, reply_id=None):
        """
        Update or delete a reply in a discussion thread.
        PUT /api/discussions/{id}/replies/{reply_id}/ - Update reply
        PATCH /api/discussions/{id}/replies/{reply_id}/ - Partial update reply
        DELETE /api/discussions/{id}/replies/{reply_id}/ - Delete reply
        
        Only the reply author can update their reply.
        Only the reply author or course instructor can delete replies.
        """
        thread = self.get_object()
        user = request.user
        
        # Get the reply
        reply = get_object_or_404(DiscussionReply, id=reply_id, thread=thread, is_deleted=False)
        
        if request.method == 'DELETE':
            # Check if user is reply author or course instructor
            if reply.author != user and thread.course.instructor != user:
                raise PermissionDenied("You can only delete your own replies or replies in your courses.")
            
            # Soft delete the reply
            reply.is_deleted = True
            reply.save()
            
            return Response(
                {"message": "Reply deleted successfully."},
                status=status.HTTP_204_NO_CONTENT
            )
        else:  # PUT or PATCH
            # Check if user is the reply author
            if reply.author != user:
                raise PermissionDenied("You can only update your own replies.")
            
            # Update the reply
            serializer = DiscussionReplySerializer(reply, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='replies/(?P<reply_id>[^/.]+)/mark_solution')
    def mark_solution(self, request, pk=None, reply_id=None):
        """
        Mark a reply as the solution to the thread.
        POST /api/discussions/{id}/replies/{reply_id}/mark_solution/
        
        Only the course instructor can mark solutions.
        """
        thread = self.get_object()
        user = request.user
        
        # Only course instructor can mark solutions
        if thread.course.instructor != user:
            raise PermissionDenied("Only the course instructor can mark solutions.")
        
        # Get the reply
        reply = get_object_or_404(DiscussionReply, id=reply_id, thread=thread, is_deleted=False)
        
        # Unmark any existing solutions in this thread
        DiscussionReply.objects.filter(thread=thread, is_solution=True).update(is_solution=False)
        
        # Mark this reply as solution
        reply.is_solution = True
        reply.save()
        
        serializer = DiscussionReplySerializer(reply, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='pin')
    def pin(self, request, pk=None):
        """
        Pin or unpin a discussion thread.
        POST /api/discussions/{id}/pin/
        
        Only the course instructor can pin threads.
        Pinned threads appear at the top of the discussion list.
        """
        thread = self.get_object()
        user = request.user
        
        # Only course instructor can pin threads
        if thread.course.instructor != user:
            raise PermissionDenied("Only the course instructor can pin threads.")
        
        # Toggle pin status
        thread.is_pinned = not thread.is_pinned
        thread.save(update_fields=['is_pinned'])
        
        serializer = self.get_serializer(thread)
        return Response({
            'message': f"Thread {'pinned' if thread.is_pinned else 'unpinned'} successfully.",
            'thread': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='lock')
    def lock(self, request, pk=None):
        """
        Lock or unlock a discussion thread.
        POST /api/discussions/{id}/lock/
        
        Only the course instructor can lock threads.
        Locked threads cannot receive new replies.
        """
        thread = self.get_object()
        user = request.user
        
        # Only course instructor can lock threads
        if thread.course.instructor != user:
            raise PermissionDenied("Only the course instructor can lock threads.")
        
        # Toggle lock status
        thread.is_locked = not thread.is_locked
        thread.save(update_fields=['is_locked'])
        
        serializer = self.get_serializer(thread)
        return Response({
            'message': f"Thread {'locked' if thread.is_locked else 'unlocked'} successfully.",
            'thread': serializer.data
        })
