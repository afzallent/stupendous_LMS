from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from datetime import timedelta
from activity.models import ActivityLog, DailyActivitySummary, LessonTimeTracking

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate daily activity summaries for all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Date to generate summary for (YYYY-MM-DD). Default is yesterday.',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=1,
            help='Number of days to generate summaries for (going backwards from date)',
        )

    def handle(self, *args, **options):
        if options['date']:
            from datetime import datetime
            end_date = datetime.strptime(options['date'], '%Y-%m-%d').date()
        else:
            end_date = (timezone.now() - timedelta(days=1)).date()
        
        days = options['days']
        
        for day_offset in range(days):
            target_date = end_date - timedelta(days=day_offset)
            self.generate_summaries_for_date(target_date)
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully generated summaries for {days} day(s)')
        )

    def generate_summaries_for_date(self, target_date):
        """Generate daily summaries for all active users on a specific date"""
        start_datetime = timezone.make_aware(
            timezone.datetime.combine(target_date, timezone.datetime.min.time())
        )
        end_datetime = start_datetime + timedelta(days=1)
        
        # Get all users who had activity on this date
        active_users = ActivityLog.objects.filter(
            timestamp__gte=start_datetime,
            timestamp__lt=end_datetime,
            user__isnull=False
        ).values_list('user', flat=True).distinct()
        
        for user_id in active_users:
            self.generate_user_summary(user_id, target_date, start_datetime, end_datetime)
        
        self.stdout.write(f'Generated summaries for {len(active_users)} users on {target_date}')

    def generate_user_summary(self, user_id, target_date, start_datetime, end_datetime):
        """Generate summary for a specific user and date"""
        
        # Count activities by type
        activities = ActivityLog.objects.filter(
            user_id=user_id,
            timestamp__gte=start_datetime,
            timestamp__lt=end_datetime
        )
        
        login_count = activities.filter(action_type='login').count()
        courses_viewed = activities.filter(action_type='course_view').count()
        lessons_viewed = activities.filter(action_type='lesson_view').count()
        lessons_completed = activities.filter(action_type='lesson_complete').count()
        
        # Get time spent from lesson tracking
        time_stats = LessonTimeTracking.objects.filter(
            student_id=user_id,
            started_at__gte=start_datetime,
            started_at__lt=end_datetime
        ).aggregate(total_time=Sum('time_spent'))
        
        total_time_spent = time_stats['total_time'] or 0
        
        # Calculate engagement score (0-100)
        engagement_score = self.calculate_engagement_score(
            login_count, courses_viewed, lessons_viewed, 
            lessons_completed, total_time_spent
        )
        
        # Create or update summary
        DailyActivitySummary.objects.update_or_create(
            user_id=user_id,
            date=target_date,
            defaults={
                'login_count': login_count,
                'courses_viewed': courses_viewed,
                'lessons_viewed': lessons_viewed,
                'lessons_completed': lessons_completed,
                'total_time_spent': total_time_spent,
                'engagement_score': engagement_score,
            }
        )

    def calculate_engagement_score(self, logins, courses_viewed, lessons_viewed, 
                                   lessons_completed, time_spent):
        """
        Calculate engagement score based on various metrics.
        Score is 0-100.
        """
        score = 0
        
        # Login activity (max 10 points)
        score += min(logins * 5, 10)
        
        # Course viewing (max 15 points)
        score += min(courses_viewed * 3, 15)
        
        # Lesson viewing (max 25 points)
        score += min(lessons_viewed * 5, 25)
        
        # Lesson completion (max 30 points)
        score += min(lessons_completed * 10, 30)
        
        # Time spent (max 20 points) - 1 point per 5 minutes
        score += min((time_spent // 300), 20)
        
        return min(score, 100)
