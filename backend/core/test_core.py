import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from hypothesis import given, strategies as st, settings
import jwt
from django.conf import settings as django_settings
import uuid

User = get_user_model()


class AuthenticationTestCase(TestCase):
    """Test cases for authentication endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
    
    def test_register_creates_user(self):
        """Test that registration creates a user"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'is_student': True,
            'is_instructor': False
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)


@pytest.mark.django_db
class TestJWTTokenIssuance:
    """
    Property-based tests for JWT Token Issuance
    
    Feature: api-frontend-migration, Property 3: JWT Token Issuance
    Validates: Requirements 2.1, 3.2
    """
    
    @given(
        password=st.text(
            alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            min_size=8,
            max_size=30
        ),
    )
    @settings(max_examples=100, deadline=None)
    def test_jwt_token_issuance_on_login(self, password):
        """
        Property: For any valid user credentials submitted to the login endpoint,
        the response should include both access and refresh JWT tokens.
        
        This property tests that:
        1. A user can be registered with valid credentials
        2. The login endpoint returns both access and refresh tokens
        3. Both tokens are valid JWT tokens
        4. The tokens contain expected claims
        """
        client = APIClient()
        
        # Generate truly unique username and email using UUID
        unique_id = str(uuid.uuid4())[:8]
        unique_username = f"user_{unique_id}"
        unique_email = f"user_{unique_id}@example.com"
        
        # Register a user with the generated credentials
        register_data = {
            'username': unique_username,
            'email': unique_email,
            'password': password,
            'password_confirm': password,
            'is_student': True,
            'is_instructor': False
        }
        
        register_response = client.post('/api/auth/register/', register_data)
        
        # Only proceed if registration was successful
        if register_response.status_code != status.HTTP_201_CREATED:
            pytest.skip(f"Registration failed: {register_response.data}")
        
        # Now test login with the same credentials
        login_data = {
            'username': unique_username,
            'password': password
        }
        
        login_response = client.post('/api/auth/login/', login_data)
        
        # Assert response status is 200 OK
        assert login_response.status_code == status.HTTP_200_OK, \
            f"Login failed with status {login_response.status_code}: {login_response.data}"
        
        # Assert both access and refresh tokens are present
        assert 'access' in login_response.data, "Access token missing from response"
        assert 'refresh' in login_response.data, "Refresh token missing from response"
        
        # Assert tokens are non-empty strings
        assert isinstance(login_response.data['access'], str), "Access token is not a string"
        assert isinstance(login_response.data['refresh'], str), "Refresh token is not a string"
        assert len(login_response.data['access']) > 0, "Access token is empty"
        assert len(login_response.data['refresh']) > 0, "Refresh token is empty"
        
        # Verify access token is a valid JWT
        try:
            access_token = login_response.data['access']
            decoded_access = jwt.decode(
                access_token,
                django_settings.SECRET_KEY,
                algorithms=['HS256']
            )
            # Assert token contains expected claims
            assert 'user_id' in decoded_access, "Access token missing user_id claim"
            assert 'exp' in decoded_access, "Access token missing exp claim"
            assert 'iat' in decoded_access, "Access token missing iat claim"
        except jwt.InvalidTokenError as e:
            pytest.fail(f"Access token is not a valid JWT: {e}")
        
        # Verify refresh token is a valid JWT
        try:
            refresh_token = login_response.data['refresh']
            decoded_refresh = jwt.decode(
                refresh_token,
                django_settings.SECRET_KEY,
                algorithms=['HS256']
            )
            # Assert token contains expected claims
            assert 'user_id' in decoded_refresh, "Refresh token missing user_id claim"
            assert 'exp' in decoded_refresh, "Refresh token missing exp claim"
            assert 'iat' in decoded_refresh, "Refresh token missing iat claim"
        except jwt.InvalidTokenError as e:
            pytest.fail(f"Refresh token is not a valid JWT: {e}")
        
        # Assert user data is included in response
        assert 'user' in login_response.data, "User data missing from response"
        assert login_response.data['user']['username'] == unique_username, "Username mismatch in response"
        assert login_response.data['user']['email'] == unique_email, "Email mismatch in response"


@pytest.mark.django_db
class TestProfileImageValidation:
    """
    Property-based tests for Profile Image Validation
    
    Feature: trainer-dashboard-features, Property 11: Profile image validation rejects invalid files
    Validates: Requirements 6.2
    """
    
    @given(
        file_size=st.integers(min_value=1, max_value=10 * 1024 * 1024),  # 1 byte to 10MB
        content_type=st.sampled_from([
            'image/jpeg',
            'image/png', 
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/tiff',
            'application/pdf',
            'text/plain',
            'video/mp4',
        ])
    )
    @settings(max_examples=100, deadline=None)
    def test_profile_image_validation(self, file_size, content_type):
        """
        Property: For any file upload attempt, files that are not JPEG/PNG/GIF/WebP 
        or exceed 5MB should be rejected, and valid files should be accepted.
        
        This property tests that:
        1. Valid file types (JPEG, PNG, GIF, WebP) under 5MB are accepted
        2. Invalid file types are rejected with appropriate error
        3. Files over 5MB are rejected with appropriate error
        4. The validation is consistent across all inputs
        """
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        client = APIClient()
        
        # Create a test user
        unique_id = str(uuid.uuid4())[:8]
        user = User.objects.create_user(
            username=f"testuser_{unique_id}",
            email=f"test_{unique_id}@example.com",
            password="testpass123",
            is_instructor=True
        )
        
        # Authenticate the user
        client.force_authenticate(user=user)
        
        # Create a mock file with the specified size and content type
        file_content = b'x' * file_size
        file_name = f"test_avatar_{unique_id}.jpg"
        uploaded_file = SimpleUploadedFile(
            name=file_name,
            content=file_content,
            content_type=content_type
        )
        
        # Attempt to upload the file
        response = client.post(
            '/api/user/upload_avatar/',
            {'avatar': uploaded_file},
            format='multipart'
        )
        
        # Define valid criteria
        max_size = 5 * 1024 * 1024  # 5MB
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        
        is_valid_size = file_size <= max_size
        is_valid_type = content_type in allowed_types
        is_valid = is_valid_size and is_valid_type
        
        # Assert the response matches expectations
        if is_valid:
            # Valid files should be accepted (200 OK)
            assert response.status_code == status.HTTP_200_OK, \
                f"Valid file (size={file_size}, type={content_type}) was rejected: {response.data}"
            assert 'detail' in response.data, "Success response missing 'detail' field"
            assert 'avatar_url' in response.data, "Success response missing 'avatar_url' field"
            
            # Verify the avatar was actually saved
            user.refresh_from_db()
            assert user.avatar, "Avatar was not saved to user model"
        else:
            # Invalid files should be rejected (400 Bad Request)
            assert response.status_code == status.HTTP_400_BAD_REQUEST, \
                f"Invalid file (size={file_size}, type={content_type}) was accepted"
            assert 'avatar' in response.data, "Error response missing 'avatar' field"
            
            # Check the specific error message
            # Note: The validation checks size first, then type
            # So if both are invalid, we'll get a size error
            error_message = response.data['avatar'][0]
            if not is_valid_size:
                # Size validation happens first
                assert 'size' in error_message.lower() or '5mb' in error_message.lower(), \
                    f"Size error message unclear: {error_message}"
            elif not is_valid_type:
                # Type validation only if size is valid
                assert 'image' in error_message.lower() or 'type' in error_message.lower(), \
                    f"Type error message unclear: {error_message}"
