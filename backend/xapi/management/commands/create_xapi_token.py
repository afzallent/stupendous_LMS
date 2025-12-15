"""
Management command to create xAPI authentication tokens for users
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()


class Command(BaseCommand):
    help = 'Create or retrieve an xAPI authentication token for a user'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Username of the user to create token for'
        )
        parser.add_argument(
            '--recreate',
            action='store_true',
            help='Delete existing token and create a new one'
        )
    
    def handle(self, *args, **options):
        username = options['username']
        recreate = options['recreate']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" does not exist')
        
        if recreate:
            # Delete existing token if it exists
            Token.objects.filter(user=user).delete()
            token, created = Token.objects.get_or_create(user=user)
            self.stdout.write(
                self.style.SUCCESS(
                    f'New token created for user "{username}": {token.key}'
                )
            )
        else:
            # Get or create token
            token, created = Token.objects.get_or_create(user=user)
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Token created for user "{username}": {token.key}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Existing token for user "{username}": {token.key}'
                    )
                )
        
        self.stdout.write('')
        self.stdout.write('Usage examples:')
        self.stdout.write(f'  Token Auth: Authorization: Token {token.key}')
        self.stdout.write(f'  Bearer Auth: Authorization: Bearer {token.key}')
