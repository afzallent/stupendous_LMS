"""
Django management command to set a user as an instructor.
Usage: python manage.py set_instructor <username_or_email>
"""
from django.core.management.base import BaseCommand, CommandError
from core.models import User


class Command(BaseCommand):
    help = 'Set a user as an instructor'

    def add_arguments(self, parser):
        parser.add_argument(
            'identifier',
            type=str,
            help='Username or email of the user to set as instructor'
        )
        parser.add_argument(
            '--remove',
            action='store_true',
            help='Remove instructor role instead of adding it'
        )

    def handle(self, *args, **options):
        identifier = options['identifier']
        remove = options.get('remove', False)
        
        try:
            # Try to find user by username first
            try:
                user = User.objects.get(username=identifier)
            except User.DoesNotExist:
                # Try by email
                user = User.objects.get(email=identifier)
            
            # Set or remove instructor flag
            if remove:
                user.is_instructor = False
                action = "removed from"
            else:
                user.is_instructor = True
                action = "set as"
            
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Successfully {action} instructor: {user.username} ({user.email})'
                )
            )
            self.stdout.write(f'   - is_instructor: {user.is_instructor}')
            self.stdout.write(f'   - is_student: {user.is_student}')
            self.stdout.write(f'   - is_staff: {user.is_staff}')
            
        except User.DoesNotExist:
            raise CommandError(f'User not found: {identifier}')
        except Exception as e:
            raise CommandError(f'Error: {str(e)}')
