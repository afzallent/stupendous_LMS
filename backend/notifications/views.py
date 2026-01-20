from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for notification management.

    Provides list, retrieve, and custom actions for managing notifications.
    All notifications are filtered by recipient=current_user and ordered by
    created_at descending (most recent first).
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter notifications by current user.
        Order by created_at descending (most recent first).
        """
        user = self.request.user
        return Notification.objects.filter(
            recipient=user
        ).select_related(
            'related_course__instructor',
            'related_user'
        ).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        """
        List all notifications for the current user.
        Returns notifications ordered by created_at descending.
        """
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a specific notification.
        Only returns notifications belonging to the current user.
        """
        return super().retrieve(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """
        Get all unread notifications for the current user.

        Returns:
            200: List of unread notifications ordered by created_at descending
        """
        unread_notifications = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response({
            'count': unread_notifications.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Mark a specific notification as read.

        Args:
            pk: Notification ID

        Returns:
            200: Notification marked as read successfully
            404: Notification not found or doesn't belong to user
        """
        notification = self.get_object()

        # Check if notification belongs to current user
        if notification.recipient != request.user:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.save(update_fields=['is_read'])

        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        Mark all unread notifications as read for the current user.

        Returns:
            200: Count of notifications marked as read
        """
        count = self.get_queryset().filter(is_read=False).update(is_read=True)

        return Response({
            'detail': f'{count} notification(s) marked as read.',
            'count': count
        })
