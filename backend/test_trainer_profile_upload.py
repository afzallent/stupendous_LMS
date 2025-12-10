"""
Test script for trainer profile avatar upload endpoint.
"""
import os
import sys
import django
from io import BytesIO
from PIL import Image

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework import status
from django.conf import settings

# Add testserver to ALLOWED_HOSTS
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

User = get_user_model()


def create_test_image(format='JPEG', size=(100, 100)):
    """Create a test image file"""
    image = Image.new('RGB', size, color='red')
    file = BytesIO()
    image.save(file, format=format)
    file.seek(0)
    return file


def test_trainer_profile_upload():
    """Test the trainer profile avatar upload endpoint"""
    print("\n" + "="*60)
    print("Testing Trainer Profile Avatar Upload Endpoint")
    print("="*60)
    
    # Create a test trainer user
    print("\n1. Creating test trainer user...")
    # Delete existing test users if they exist
    User.objects.filter(username='test_trainer_upload').delete()
    User.objects.filter(username='test_student_upload').delete()
    
    trainer = User.objects.create_user(
        username='test_trainer_upload',
        email='trainer_upload@test.com',
        password='testpass123',
        is_instructor=True
    )
    print(f"✅ Created trainer: {trainer.username}")
    
    # Create API client and authenticate
    client = APIClient()
    client.force_authenticate(user=trainer)
    print("✅ Authenticated as trainer")
    
    # Test 1: Upload valid JPEG image
    print("\n2. Testing valid JPEG upload...")
    image_file = create_test_image(format='JPEG')
    uploaded_file = SimpleUploadedFile(
        "test_avatar.jpg",
        image_file.read(),
        content_type="image/jpeg"
    )
    
    response = client.post(
        '/api/trainer/profile/upload_avatar/',
        {'avatar': uploaded_file},
        format='multipart'
    )
    
    print(f"   Status Code: {response.status_code}")
    if hasattr(response, 'data'):
        print(f"   Response: {response.data}")
    
    if response.status_code == 200:
        print("✅ Valid JPEG upload successful")
        if hasattr(response, 'data'):
            assert 'detail' in response.data
            assert 'profile' in response.data
            assert response.data['profile']['avatar_url'] is not None
    else:
        if hasattr(response, 'data'):
            print(f"❌ Valid JPEG upload failed: {response.data}")
        else:
            print(f"❌ Valid JPEG upload failed with status {response.status_code}")
    
    # Test 2: Upload valid PNG image
    print("\n3. Testing valid PNG upload...")
    image_file = create_test_image(format='PNG')
    uploaded_file = SimpleUploadedFile(
        "test_avatar.png",
        image_file.read(),
        content_type="image/png"
    )
    
    response = client.post(
        '/api/trainer/profile/upload_avatar/',
        {'avatar': uploaded_file},
        format='multipart'
    )
    
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 200:
        print("✅ Valid PNG upload successful")
    else:
        if hasattr(response, 'data'):
            print(f"❌ Valid PNG upload failed: {response.data}")
        else:
            print(f"❌ Valid PNG upload failed with status {response.status_code}")
    
    # Test 3: Upload file that's too large (simulate)
    print("\n4. Testing file size validation (>5MB)...")
    # Create a large file by setting size attribute
    large_file = SimpleUploadedFile(
        "large_avatar.jpg",
        b"x" * (6 * 1024 * 1024),  # 6MB
        content_type="image/jpeg"
    )
    
    response = client.post(
        '/api/trainer/profile/upload_avatar/',
        {'avatar': large_file},
        format='multipart'
    )
    
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 400:
        print("✅ File size validation working")
        if hasattr(response, 'data'):
            print(f"   Error: {response.data}")
    else:
        print(f"❌ File size validation failed")
    
    # Test 4: Upload invalid file type
    print("\n5. Testing file type validation (invalid type)...")
    invalid_file = SimpleUploadedFile(
        "test.txt",
        b"This is not an image",
        content_type="text/plain"
    )
    
    response = client.post(
        '/api/trainer/profile/upload_avatar/',
        {'avatar': invalid_file},
        format='multipart'
    )
    
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 400:
        print("✅ File type validation working")
        if hasattr(response, 'data'):
            print(f"   Error: {response.data}")
    else:
        print(f"❌ File type validation failed")
    
    # Test 5: Upload without file
    print("\n6. Testing upload without file...")
    response = client.post(
        '/api/trainer/profile/upload_avatar/',
        {},
        format='multipart'
    )
    
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 400:
        print("✅ Missing file validation working")
        if hasattr(response, 'data'):
            print(f"   Error: {response.data}")
    else:
        print(f"❌ Missing file validation failed")
    
    # Test 6: Get trainer profile
    print("\n7. Testing get trainer profile...")
    response = client.get('/api/trainer/profile/')
    
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 200:
        print("✅ Get profile successful")
        if hasattr(response, 'data'):
            print(f"   Profile data: {response.data}")
    else:
        if hasattr(response, 'data'):
            print(f"❌ Get profile failed: {response.data}")
        else:
            print(f"❌ Get profile failed with status {response.status_code}")
    
    # Test 7: Non-trainer cannot access
    print("\n8. Testing non-trainer access restriction...")
    student = User.objects.create_user(
        username='test_student_upload',
        email='student_upload@test.com',
        password='testpass123',
        is_student=True
    )
    client.force_authenticate(user=student)
    
    response = client.get('/api/trainer/profile/')
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 403:
        print("✅ Non-trainer access properly restricted")
    else:
        print(f"❌ Non-trainer access restriction failed")
    
    # Cleanup
    print("\n9. Cleaning up test data...")
    trainer.delete()
    student.delete()
    print("✅ Test data cleaned up")
    
    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60 + "\n")


if __name__ == '__main__':
    test_trainer_profile_upload()
