from django.core.management.base import BaseCommand
from django.utils import timezone
from courses.models import Coupon


class Command(BaseCommand):
    help = 'Create coupon codes for the LMS'

    def add_arguments(self, parser):
        parser.add_argument(
            '--code',
            type=str,
            default='PRERELEASE',
            help='Coupon code (default: PRERELEASE)'
        )
        parser.add_argument(
            '--discount',
            type=int,
            default=100,
            help='Discount percentage (default: 100)'
        )
        parser.add_argument(
            '--description',
            type=str,
            default='Pre-release coupon - 100% discount for early adopters',
            help='Coupon description'
        )
        parser.add_argument(
            '--max-uses',
            type=int,
            default=None,
            help='Maximum number of uses (default: unlimited)'
        )

    def handle(self, *args, **options):
        code = options['code'].upper()
        discount = options['discount']
        description = options['description']
        max_uses = options['max_uses']

        # Check if coupon already exists
        if Coupon.objects.filter(code=code).exists():
            self.stdout.write(
                self.style.WARNING(f'Coupon "{code}" already exists.')
            )
            return

        # Create coupon
        coupon = Coupon.objects.create(
            code=code,
            description=description,
            discount_percentage=discount,
            is_active=True,
            max_uses=max_uses,
            valid_from=timezone.now()
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created coupon "{code}" with {discount}% discount'
            )
        )
        self.stdout.write(f'  Description: {description}')
        self.stdout.write(f'  Max Uses: {max_uses if max_uses else "Unlimited"}')
        self.stdout.write(f'  Valid From: {coupon.valid_from}')
