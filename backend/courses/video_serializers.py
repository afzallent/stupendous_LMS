"""
Serializers for video interaction tracking.

Requirements: 4.5, 15.1
"""
from rest_framework import serializers


class VideoInteractionSerializer(serializers.Serializer):
    """
    Serializer for video interaction requests.
    
    Fields:
        - interaction_type: 'played', 'paused', 'seeked', or 'completed'
        - position: Video position in seconds (required for seeked)
        - duration: ISO 8601 duration string (optional)
    
    Requirements: 4.5
    """
    INTERACTION_TYPE_CHOICES = [
        ('played', 'Played'),
        ('paused', 'Paused'),
        ('seeked', 'Seeked'),
        ('completed', 'Completed'),
    ]
    
    interaction_type = serializers.ChoiceField(
        choices=INTERACTION_TYPE_CHOICES,
        help_text="Type of video interaction"
    )
    position = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Video position in seconds (required for seeked action)"
    )
    duration = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="ISO 8601 duration string (e.g., PT1H30M)"
    )
    
    def validate(self, data):
        """Validate that seeked action has position."""
        interaction_type = data.get('interaction_type')
        position = data.get('position')
        
        if interaction_type == 'seeked' and position is None:
            raise serializers.ValidationError(
                "position is required for seeked action"
            )
        
        return data


class VideoInteractionResponseSerializer(serializers.Serializer):
    """
    Serializer for video interaction responses.
    
    Fields:
        - success: Boolean indicating success
        - xapi_statement_id: UUID of generated xAPI statement
        - interaction_id: ID of recorded ContentInteraction
        - message: Success message
    
    Requirements: 4.5, 15.1
    """
    success = serializers.BooleanField()
    xapi_statement_id = serializers.CharField()
    interaction_id = serializers.IntegerField()
    message = serializers.CharField()
