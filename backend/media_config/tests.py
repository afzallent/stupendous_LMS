"""
Tests for media_config app.
"""
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from .models import MediaStorageConfig
from .utils import (
    generate_unique_filename,
    validate_file_size,
    validate_file_type,
    save_uploaded_file,
)
from .image_processing import ImageTranscoder, validate_image
from .storage import LocalStorageBackend, get_storage_backend
from io import BytesIO
from PIL import Image


class MediaStorageConfigTests(TestCase):
    """Test MediaStorageConfig model"""
    
    def test_singleton_pattern(self):
        """Test that only one config instance can exist"""
        config1 = MediaStorageConfig.get_config()
        config2 = MediaStorageConfig.get_config()
        self.assertEqual(config1.pk, config2.pk)
    
    def test_default_values(self):
        """Test default configuration values"""
        config = MediaStorageConfig.get_config()
        self.assertEqual(config.video_storage_type, 'local')
        self.assertEqual(config.thumbnail_storage_type, 'local')
        self.assertEqual(config.avatar_storage_type, 'local')
        self.assertTrue(config.enable_image_transcoding)
        self.assertEqual(config.image_output_format, 'webp')


class UtilityFunctionTests(TestCase):
    """Test utility functions"""
    
    def test_generate_unique_filename(self):
        """Test unique filename generation"""
        filename1 = generate_unique_filename('test.jpg', 'avatar')
        filename2 = generate_unique_filename('test.jpg', 'avatar')
        
        # Should be different
        self.assertNotEqual(filename1, filename2)
        
        # Should preserve extension
        self.assertTrue(filename1.endswith('.jpg'))
        self.assertTrue(filename1.startswith('avatar_'))
    
    def test_validate_file_size_valid(self):
        """Test file size validation with valid file"""
        # Create a small file (1 KB)
        small_file = SimpleUploadedFile("test.jpg", b"x" * 1024)
        
        # Should not raise exception
        try:
            validate_file_size(small_file, 'avatar')
        except ValidationError:
            self.fail("validate_file_size raised ValidationError unexpectedly")
    
    def test_validate_file_size_invalid(self):
        """Test file size validation with oversized file"""
        # Create a large file (20 MB)
        large_file = SimpleUploadedFile("test.jpg", b"x" * (20 * 1024 * 1024))
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError):
            validate_file_size(large_file, 'avatar')
    
    def test_validate_file_type_valid(self):
        """Test file type validation with valid types"""
        valid_video = SimpleUploadedFile("test.mp4", b"fake video")
        valid_image = SimpleUploadedFile("test.jpg", b"fake image")
        
        try:
            validate_file_type(valid_video, 'video')
            validate_file_type(valid_image, 'avatar')
        except ValidationError:
            self.fail("validate_file_type raised ValidationError unexpectedly")
    
    def test_validate_file_type_invalid(self):
        """Test file type validation with invalid types"""
        invalid_file = SimpleUploadedFile("test.exe", b"fake executable")
        
        with self.assertRaises(ValidationError):
            validate_file_type(invalid_file, 'video')


class ImageTranscoderTests(TestCase):
    """Test image transcoding functionality"""
    
    def setUp(self):
        """Set up test configuration"""
        self.config = MediaStorageConfig.get_config()
        self.transcoder = ImageTranscoder(self.config)
    
    def create_test_image(self, format='JPEG', size=(100, 100)):
        """Helper to create a test image"""
        img = Image.new('RGB', size, color='red')
        buffer = BytesIO()
        img.save(buffer, format=format)
        buffer.seek(0)
        return buffer
    
    def test_is_valid_image(self):
        """Test image validation"""
        valid_image = self.create_test_image()
        self.assertTrue(validate_image(valid_image))
        
        invalid_image = BytesIO(b"not an image")
        self.assertFalse(validate_image(invalid_image))
    
    def test_transcode_image(self):
        """Test basic image transcoding"""
        original_image = self.create_test_image()
        
        # Transcode
        transcoded = self.transcoder.transcode(original_image)
        
        # Should return BytesIO
        self.assertIsInstance(transcoded, BytesIO)
        
        # Should be valid image
        transcoded.seek(0)
        self.assertTrue(validate_image(transcoded))
    
    def test_image_resize(self):
        """Test that oversized images are resized"""
        # Create large image
        large_image = self.create_test_image(size=(3000, 3000))
        
        # Transcode
        transcoded = self.transcoder.transcode(large_image)
        
        # Open transcoded image
        transcoded.seek(0)
        img = Image.open(transcoded)
        
        # Should be resized
        self.assertLessEqual(img.width, self.config.max_image_width)
        self.assertLessEqual(img.height, self.config.max_image_height)
    
    def test_get_output_extension(self):
        """Test output extension determination"""
        # WebP format
        self.config.image_output_format = 'webp'
        self.assertEqual(self.transcoder.get_output_extension(), '.webp')
        
        # AVIF format
        self.config.image_output_format = 'avif'
        transcoder = ImageTranscoder(self.config)
        self.assertEqual(transcoder.get_output_extension(), '.avif')


class LocalStorageBackendTests(TestCase):
    """Test local storage backend"""
    
    def setUp(self):
        """Set up test configuration"""
        self.config = MediaStorageConfig.get_config()
        self.backend = LocalStorageBackend(self.config)
    
    def test_save_and_retrieve(self):
        """Test saving and retrieving a file"""
        test_content = b"test file content"
        filename = "test_file.txt"
        
        # Save file
        saved_path = self.backend.save(filename, test_content, 'video')
        
        # Should return a path
        self.assertIsNotNone(saved_path)
        self.assertIn(filename, saved_path)
        
        # Get URL
        url = self.backend.url(filename, 'video')
        self.assertIsNotNone(url)
        
        # Clean up
        self.backend.delete(filename, 'video')
    
    def test_delete(self):
        """Test file deletion"""
        test_content = b"test file content"
        filename = "test_delete.txt"
        
        # Save file
        self.backend.save(filename, test_content, 'video')
        
        # Delete file
        result = self.backend.delete(filename, 'video')
        self.assertTrue(result)
        
        # Try to delete again (should return False)
        result = self.backend.delete(filename, 'video')
        self.assertFalse(result)


class StorageBackendFactoryTests(TestCase):
    """Test storage backend factory function"""
    
    def test_get_local_backend(self):
        """Test getting local storage backend"""
        config = MediaStorageConfig.get_config()
        config.video_storage_type = 'local'
        config.save()
        
        backend = get_storage_backend('video')
        self.assertIsInstance(backend, LocalStorageBackend)
    
    def test_get_backend_for_different_media_types(self):
        """Test getting backends for different media types"""
        video_backend = get_storage_backend('video')
        thumbnail_backend = get_storage_backend('thumbnail')
        avatar_backend = get_storage_backend('avatar')
        
        # All should be valid backends
        self.assertIsNotNone(video_backend)
        self.assertIsNotNone(thumbnail_backend)
        self.assertIsNotNone(avatar_backend)


class IntegrationTests(TestCase):
    """Integration tests for the complete workflow"""
    
    def create_test_image_file(self):
        """Create a test image file"""
        img = Image.new('RGB', (200, 200), color='blue')
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        buffer.seek(0)
        return SimpleUploadedFile("test.jpg", buffer.read(), content_type="image/jpeg")
    
    def test_complete_upload_workflow(self):
        """Test the complete file upload workflow"""
        # Create test image
        test_file = self.create_test_image_file()
        
        # Upload using utility function
        result = save_uploaded_file(test_file, media_type='avatar', transcode_images=True)
        
        # Should return result dictionary
        self.assertIn('filename', result)
        self.assertIn('url', result)
        self.assertIn('size', result)
        self.assertIn('transcoded', result)
        
        # Should be transcoded
        self.assertTrue(result['transcoded'])
        
        # Filename should be WebP (default format)
        self.assertTrue(result['filename'].endswith('.webp'))
        
        # Clean up
        from .utils import delete_file
        delete_file(result['filename'], 'avatar')
