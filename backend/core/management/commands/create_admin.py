from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create an admin user'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='afzal@lms.com', help='Admin username/email')
        parser.add_argument('--password', type=str, default='hMdoeBos6zhrhdOVDeCawZ', help='Admin password')
        parser.add_argument('--email', type=str, help='Admin email (defaults to username if not provided)')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email'] or username

        self.stdout.write("\n" + "="*70)
        self.stdout.write("CREATING ADMIN USER")
        self.stdout.write("="*70 + "\n")

        try:
            admin, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': 'Admin',
                    'last_name': 'User',
                    'is_staff': True,
                    'is_superuser': True,
                    'is_instructor': False,
                    'is_student': False,
                }
            )

            if created:
                admin.set_password(password)
                admin.save()
                self.stdout.write(self.style.SUCCESS(f"✓ Admin user created successfully!"))
                self.stdout.write(f"\n📋 Admin Credentials:")
                self.stdout.write(f"  • Username: {username}")
                self.stdout.write(f"  • Email: {email}")
                self.stdout.write(f"  • Password: {password}")
                self.stdout.write(f"\n🔗 Access:")
                self.stdout.write(f"  • Admin Panel: http://localhost:8000/admin/")
            else:
                self.stdout.write(self.style.WARNING(f"⚠️  Admin user already exists: {username}"))
                self.stdout.write(f"\n📋 Existing Admin:")
                self.stdout.write(f"  • Username: {admin.username}")
                self.stdout.write(f"  • Email: {admin.email}")
                
                # Ask if user wants to update password
                response = input("\nDo you want to update the password? (y/n): ").strip().lower()
                if response == 'y':
                    admin.set_password(password)
                    admin.save()
                    self.stdout.write(self.style.SUCCESS(f"✓ Password updated!"))
                    self.stdout.write(f"  • New Password: {password}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Error creating admin user: {str(e)}"))

        self.stdout.write("\n" + "="*70 + "\n")
