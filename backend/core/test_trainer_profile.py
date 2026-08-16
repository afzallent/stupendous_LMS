"""
Unit tests for trainer profile endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from io import BytesIO
from PIL import Image

User = get_user_model()


class TrainerProfileUploadTests(TestCase):
    """Test cases for trainer profile avatar upload endpoint"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        # Create a trainer user
        self.trainer = User.objects.create_user(
            username='trainer_test',
            email='trainer@test.com',
            password='testpass123',
            is_instructor=True
        )
        
        # Create a student user
        self.student = User.objects.create_user(
            username='student_test',
            email='student@test.com',
            password='testpass123',
            is_student=True
        )
    
    def create_test_image(self, format='JPEG', size=(100, 100)):
        """Helper to create a test image file"""
        image = Image.new('RGB', size, color='red')
        file = BytesIO()
        image.save(file, format=format)
        file.seek(0)
        return file
    
    def test_upload_valid_jpeg(self):
        """Test uploading a valid JPEG image"""
        self.client.force_authenticate(user=self.trainer)
        
        image_file = self.create_test_image(format='JPEG')
        uploaded_file = SimpleUploadedFile(
            "test_avatar.jpg",
            image_file.read(),
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': uploaded_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)
        self.assertIn('profile', response.data)
        self.assertIsNotNone(response.data['profile']['avatar_url'])
    
    def test_upload_valid_png(self):
        """Test uploading a valid PNG image"""
        self.client.force_authenticate(user=self.trainer)
        
        image_file = self.create_test_image(format='PNG')
        uploaded_file = SimpleUploadedFile(
            "test_avatar.png",
            image_file.read(),
            content_type="image/png"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': uploaded_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_upload_valid_gif(self):
        """Test uploading a valid GIF image"""
        self.client.force_authenticate(user=self.trainer)
        
        image_file = self.create_test_image(format='GIF')
        uploaded_file = SimpleUploadedFile(
            "test_avatar.gif",
            image_file.read(),
            content_type="image/gif"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': uploaded_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_upload_file_too_large(self):
        """Test that files larger than 5MB are rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        # Create a file larger than 5MB
        large_file = SimpleUploadedFile(
            "large_avatar.jpg",
            b"x" * (6 * 1024 * 1024),  # 6MB
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': large_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('avatar', response.data)
        self.assertIn('5MB', str(response.data['avatar']))
    
    def test_upload_invalid_file_type(self):
        """Test that non-image files are rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        invalid_file = SimpleUploadedFile(
            "test.txt",
            b"This is not an image",
            content_type="text/plain"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': invalid_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('avatar', response.data)
    
    def test_upload_without_file(self):
        """Test that uploading without a file is rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('avatar', response.data)
    
    def test_non_trainer_cannot_upload(self):
        """Test that non-trainers cannot access the upload endpoint"""
        self.client.force_authenticate(user=self.student)
        
        image_file = self.create_test_image(format='JPEG')
        uploaded_file = SimpleUploadedFile(
            "test_avatar.jpg",
            image_file.read(),
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': uploaded_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_unauthenticated_cannot_upload(self):
        """Test that unauthenticated users cannot access the upload endpoint"""
        image_file = self.create_test_image(format='JPEG')
        uploaded_file = SimpleUploadedFile(
            "test_avatar.jpg",
            image_file.read(),
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': uploaded_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_trainer_profile(self):
        """Test getting trainer profile"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.get('/api/trainer/profile/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'trainer_test')
        self.assertEqual(response.data['email'], 'trainer@test.com')
    
    def test_avatar_persists_after_upload(self):
        """Test that avatar is saved to user model"""
        self.client.force_authenticate(user=self.trainer)
        
        image_file = self.create_test_image(format='JPEG')
        uploaded_file = SimpleUploadedFile(
            "test_avatar.jpg",
            image_file.read(),
            content_type="image/jpeg"
        )
        
        response = self.client.post(
            '/api/trainer/profile/upload_avatar/',
            {'avatar': uploaded_file},
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh user from database
        self.trainer.refresh_from_db()
        
        # Verify avatar field is set
        self.assertIsNotNone(self.trainer.avatar)
        self.assertTrue(self.trainer.avatar.name.startswith('avatars/'))


class TrainerPasswordChangeTests(TestCase):
    """Test cases for trainer password change endpoint"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        
        # Create a trainer user
        self.trainer = User.objects.create_user(
            username='trainer_test',
            email='trainer@test.com',
            password='OldPass123',
            is_instructor=True
        )
        
        # Create a student user
        self.student = User.objects.create_user(
            username='student_test',
            email='student@test.com',
            password='testpass123',
            is_student=True
        )
    
    def test_change_password_success(self):
        """Test successful password change with valid data"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'OldPass123',
                'new_password': 'NewPass456'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)
        self.assertEqual(response.data['detail'], 'Password changed successfully.')
        
        # Verify password was actually changed
        self.trainer.refresh_from_db()
        self.assertTrue(self.trainer.check_password('NewPass456'))
        self.assertFalse(self.trainer.check_password('OldPass123'))
    
    def test_change_password_incorrect_current(self):
        """Test that incorrect current password is rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'WrongPassword',
                'new_password': 'NewPass456'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_password', response.data)
        
        # Verify password was not changed
        self.trainer.refresh_from_db()
        self.assertTrue(self.trainer.check_password('OldPass123'))
    
    def test_change_password_too_short(self):
        """Test that passwords shorter than 8 characters are rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'OldPass123',
                'new_password': 'Short1'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
    
    def test_change_password_no_uppercase(self):
        """Test that passwords without uppercase letters are rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'OldPass123',
                'new_password': 'newpass456'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
        self.assertIn('uppercase', str(response.data['new_password']))
    
    def test_change_password_no_lowercase(self):
        """Test that passwords without lowercase letters are rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'OldPass123',
                'new_password': 'NEWPASS456'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
        self.assertIn('lowercase', str(response.data['new_password']))
    
    def test_change_password_no_digit(self):
        """Test that passwords without digits are rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'OldPass123',
                'new_password': 'XylophoneQuartz'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
        self.assertIn('digit', str(response.data['new_password']))
    
    def test_change_password_missing_current(self):
        """Test that missing current_password is rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'new_password': 'NewPass456'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('current_password', response.data)
    
    def test_change_password_missing_new(self):
        """Test that missing new_password is rejected"""
        self.client.force_authenticate(user=self.trainer)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'OldPass123'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('new_password', response.data)
    
    def test_non_trainer_cannot_change_password(self):
        """Test that non-trainers cannot access the password change endpoint"""
        self.client.force_authenticate(user=self.student)
        
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'testpass123',
                'new_password': 'NewPass456'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_unauthenticated_cannot_change_password(self):
        """Test that unauthenticated users cannot access the password change endpoint"""
        response = self.client.post(
            '/api/trainer/profile/change_password/',
            {
                'current_password': 'OldPass123',
                'new_password': 'NewPass456'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
