"""
Management command to clear quiz attempts for testing
"""
from django.core.management.base import BaseCommand
from quizzes.models import QuizAttempt


class Command(BaseCommand):
    help = 'Clear quiz attempts for a specific user or all users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username to clear attempts for (leave empty for all users)',
        )
        parser.add_argument(
            '--quiz',
            type=int,
            help='Quiz ID to clear attempts for (leave empty for all quizzes)',
        )

    def handle(self, *args, **options):
        username = options.get('user')
        quiz_id = options.get('quiz')
        
        queryset = QuizAttempt.objects.all()
        
        if username:
            queryset = queryset.filter(student__username=username)
        
        if quiz_id:
            queryset = queryset.filter(quiz_id=quiz_id)
        
        count = queryset.count()
        
        if count == 0:
            self.stdout.write(self.style.WARNING('No quiz attempts found to delete'))
            return
        
        # Show what will be deleted
        self.stdout.write(self.style.WARNING(f'About to delete {count} quiz attempt(s):'))
        for attempt in queryset[:10]:  # Show first 10
            self.stdout.write(f'  - {attempt.student.username} - {attempt.quiz.title} - Attempt #{attempt.attempt_number}')
        
        if count > 10:
            self.stdout.write(f'  ... and {count - 10} more')
        
        # Confirm deletion
        confirm = input('\nAre you sure you want to delete these attempts? (yes/no): ')
        
        if confirm.lower() == 'yes':
            queryset.delete()
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} quiz attempt(s)'))
        else:
            self.stdout.write(self.style.WARNING('Operation cancelled'))
