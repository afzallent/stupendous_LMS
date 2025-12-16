"""
xAPI Analytics Engine
Provides analytics and reporting capabilities based on xAPI statement data
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Count, Avg, Q, F
from django.utils import timezone

from xapi.models.statement import XAPIStatement
from courses.models import Course, Lesson, Enrollment


class XAPIAnalytics:
    """
    Analytics engine for xAPI statements
    Provides aggregated insights on learner activity and content performance
    """
    
    @staticmethod
    def get_learner_summary(user_id: int, course_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get comprehensive summary of learner activity
        
        Args:
            user_id: The learner's user ID
            course_id: Optional course ID to filter by
            
        Returns:
            Dictionary with learner statistics
        """
        filters = Q(actor_id=user_id)
        if course_id:
            filters &= Q(context__contains={'course_id': course_id})
        
        statements = XAPIStatement.objects.filter(filters)
        
        # Count by verb
        verb_counts = statements.values('verb_id').annotate(count=Count('id'))
        
        # Calculate time spent (sum of durations)
        total_duration = sum(
            (s.result.get('duration', 0) if s.result else 0)
            for s in statements
        )
        
        # Get completion rate
        completed = statements.filter(verb_id='http://adlnet.gov/expapi/verbs/completed').count()
        attempted = statements.filter(verb_id='http://adlnet.gov/expapi/verbs/attempted').count()
        
        return {
            'total_statements': statements.count(),
            'verb_breakdown': {v['verb_id']: v['count'] for v in verb_counts},
            'total_duration_seconds': total_duration,
            'completed_count': completed,
            'attempted_count': attempted,
            'completion_rate': (completed / attempted * 100) if attempted > 0 else 0
        }
    
    @staticmethod
    def get_course_analytics(course_id: int) -> Dict[str, Any]:
        """
        Get analytics for a specific course
        
        Args:
            course_id: The course ID
            
        Returns:
            Dictionary with course analytics
        """
        statements = XAPIStatement.objects.filter(
            context__contains={'course_id': course_id}
        )
        
        # Unique learners
        unique_learners = statements.values('actor_id').distinct().count()
        
        # Engagement metrics
        total_interactions = statements.count()
        avg_score = statements.filter(
            result__isnull=False
        ).aggregate(
            avg=Avg('result__score__scaled')
        )['avg'] or 0
        
        # Completion metrics
        completed = statements.filter(
            verb_id='http://adlnet.gov/expapi/verbs/completed'
        ).values('actor_id').distinct().count()
        
        return {
            'course_id': course_id,
            'unique_learners': unique_learners,
            'total_interactions': total_interactions,
            'average_score': float(avg_score) if avg_score else 0,
            'completion_count': completed,
            'completion_rate': (completed / unique_learners * 100) if unique_learners > 0 else 0
        }
    
    @staticmethod
    def get_content_performance(lesson_id: int) -> Dict[str, Any]:
        """
        Get performance metrics for specific content
        
        Args:
            lesson_id: The lesson ID
            
        Returns:
            Dictionary with content performance metrics
        """
        statements = XAPIStatement.objects.filter(
            object_id__contains=str(lesson_id)
        )
        
        # Engagement
        views = statements.filter(
            verb_id='http://adlnet.gov/expapi/verbs/experienced'
        ).count()
        
        completions = statements.filter(
            verb_id='http://adlnet.gov/expapi/verbs/completed'
        ).count()
        
        # Average score
        scored_statements = statements.filter(result__isnull=False)
        avg_score = scored_statements.aggregate(
            avg=Avg('result__score__scaled')
        )['avg'] or 0
        
        return {
            'lesson_id': lesson_id,
            'total_views': views,
            'total_completions': completions,
            'completion_rate': (completions / views * 100) if views > 0 else 0,
            'average_score': float(avg_score) if avg_score else 0,
            'total_statements': statements.count()
        }
    
    @staticmethod
    def get_activity_timeline(
        user_id: Optional[int] = None,
        course_id: Optional[int] = None,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get activity timeline for visualization
        
        Args:
            user_id: Optional user ID to filter by
            course_id: Optional course ID to filter by
            days: Number of days to look back
            
        Returns:
            List of daily activity summaries
        """
        start_date = timezone.now() - timedelta(days=days)
        
        filters = Q(timestamp__gte=start_date)
        if user_id:
            filters &= Q(actor_id=user_id)
        if course_id:
            filters &= Q(context__contains={'course_id': course_id})
        
        statements = XAPIStatement.objects.filter(filters)
        
        # Group by date
        timeline = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            day_statements = statements.filter(
                timestamp__date=date.date()
            )
            
            timeline.append({
                'date': date.date().isoformat(),
                'statement_count': day_statements.count(),
                'unique_users': day_statements.values('actor_id').distinct().count()
            })
        
        return timeline