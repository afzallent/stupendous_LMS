from django.core.management.base import BaseCommand
from media_config.models import MediaStorageConfig


class Command(BaseCommand):
    help = 'Initialize media storage configuration with default values'

    def handle(self, *args, **options):
        config, created = MediaStorageConfig.objects.get_or_create(pk=1)
        
        if created:
            self.stdout.write(
                self.style.SUCCESS('Successfully created media storage configuration with default values')
            )
            self.stdout.write('\nDefault Configuration:')
            self.stdout.write(f'  Video Storage: {config.video_storage_type}')
            self.stdout.write(f'  Thumbnail Storage: {config.thumbnail_storage_type}')
            self.stdout.write(f'  Avatar Storage: {config.avatar_storage_type}')
            self.stdout.write(f'  Image Transcoding: {"Enabled" if config.enable_image_transcoding else "Disabled"}')
            self.stdout.write(f'  Image Format: {config.image_output_format}')
            self.stdout.write('\nYou can modify these settings in the Django admin panel.')
        else:
            self.stdout.write(
                self.style.WARNING('Media storage configuration already exists')
            )
            self.stdout.write('\nCurrent Configuration:')
            self.stdout.write(f'  Video Storage: {config.video_storage_type}')
            self.stdout.write(f'  Thumbnail Storage: {config.thumbnail_storage_type}')
            self.stdout.write(f'  Avatar Storage: {config.avatar_storage_type}')
            self.stdout.write(f'  Image Transcoding: {"Enabled" if config.enable_image_transcoding else "Disabled"}')
            self.stdout.write(f'  Image Format: {config.image_output_format}')
