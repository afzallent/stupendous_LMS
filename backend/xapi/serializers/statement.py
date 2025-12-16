"""
Serializers for xAPI Statement model
"""
from rest_framework import serializers
from xapi.models import XAPIStatement


class XAPIStatementSerializer(serializers.ModelSerializer):
    """Serializer for XAPIStatement model"""
    
    class Meta:
        model = XAPIStatement
        fields = [
            'statement_id',
            'actor_type',
            'actor_name',
            'actor_mbox',
            'actor_account_name',
            'actor_account_homepage',
            'actor_json',
            'verb_id',
            'verb_display',
            'object_type',
            'object_id',
            'object_json',
            'result_score_scaled',
            'result_score_raw',
            'result_score_min',
            'result_score_max',
            'result_success',
            'result_completion',
            'result_duration',
            'result_json',
            'context_json',
            'timestamp',
            'stored',
            'authority_json',
            'statement_json',
            'voided',
            'user',
            'course',
            'lesson',
            'quiz',
        ]
        read_only_fields = [
            'statement_id',
            'stored',
        ]
