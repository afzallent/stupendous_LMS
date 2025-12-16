"""
API Views for video interaction tracking.

Provides endpoints for:
- POST /api/lessons/{id}/video/interaction/ - Track video interactions

Requirements: 4.5, 15.1
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Lesson, Enrollment
from .content_models import ContentInteraction
from xapi.statement_generator import XAPIStatementGenerator


class VideoInteractionView(APIView):
    """
    API view for tracking video interactions.
    
    POST /api/lessons/{lesson_id}/video/interaction/
        Track video interactions (played, paused, seeked, completed).
        Generates xAPI statements and records ContentInteraction.
        Requires enrollment.
    
    Requirements: 4.5, 15.1
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, lesson_id):
        """
        Track a video interaction.
        
        Request body:
            - interaction_type: 'played', 'paused', 'seeked', or 'completed' (required)
            - position: Video position in seconds (required for seeked, optional for others)
            - duration: ISO 8601 duration string (optional, for completed action)
        
        Returns:
            - success: Boolean
            - xapi_statement_id: UUID of generated xAPI statement
            - interaction_id: ID of recorded ContentInteraction
            - message: Success message
        
        Requirements: 4.5, 15.1
        """
        lesson = get_object_or_404(Lesson, pk=lesson_id)
        
        # Check if user is enrolled
        if not Enrollment.objects.filter(student=request.user, course=lesson.course).exists():
            return Response(
                {'error': 'You must be enrolled in this course to track video interactions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate request data
        interaction_type = request.data.get('interaction_type')
        position = request.data.get('position')
        duration = request.data.get('duration')
        
        # Validate interaction type
        valid_types = ['played', 'paused', 'seeked', 'completed']
        if not interaction_type or interaction_type not in valid_types:
            return Response(
                {'error': f'interaction_type must be one of: {", ".join(valid_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate position for seeked action
        if interaction_type == 'seeked' and position is None:
            return Response(
                {'error': 'position is required for seeked action'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Generate xAPI statement
            generator = XAPIStatementGenerator()
            statement = generator.generate_video_interaction(
                student=request.user,
                lesson=lesson,
                action=interaction_type,
                position=position,
                duration=duration
            )
            
            # Record ContentInteraction
            interaction_data = {
                'action': interaction_type,
            }
            if position is not None:
                interaction_data['position'] = position
            if duration:
                interaction_data['duration'] = duration
            
            interaction = ContentInteraction.objects.create(
                student=request.user,
                lesson=lesson,
                interaction_type=ContentInteraction.INTERACTION_INTERACTED,
                interaction_data=interaction_data,
                xapi_statement=statement
            )
            
            response_data = {
                'success': True,
                'xapi_statement_id': str(statement.statement_id),
                'interaction_id': interaction.id,
                'message': f'Video interaction tracked: {interaction_type}'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to track video interaction: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
