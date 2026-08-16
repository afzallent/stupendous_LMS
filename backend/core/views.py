import logging

from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.views.generic import TemplateView
from django.http import JsonResponse
from .forms import CustomUserCreationForm

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.parsers import MultiPartParser, FormParser

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from lms_project.throttles import (
    LoginRateThrottle, RegisterRateThrottle, PasswordResetRateThrottle,
    UploadRateThrottle,
)
from .upload_validation import validate_image_upload
from .serializers import (
    UserSerializer, 
    RegisterSerializer, 
    CustomTokenObtainPairSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer
)

User = get_user_model()

logger = logging.getLogger(__name__)


def revoke_all_refresh_tokens(user):
    """
    Blacklist every outstanding refresh token for `user`.

    Called after a password change or reset so those actions actually end
    existing sessions. Requires the token_blacklist app (now installed);
    degrades to a no-op rather than erroring if it is ever removed.
    """
    try:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken, OutstandingToken,
        )
    except ImportError:  # pragma: no cover - blacklist app not installed
        return

    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Simple health check endpoint for frontend connectivity testing"""
    return Response({
        'status': 'ok',
        'message': 'Backend is running'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def branding(request):
    """
    Public white-label branding endpoint.

    The frontend (header, auth pages, SEO metadata, certificates, copyright
    lines) reads the brand name, tagline and logo from here so a deployment
    can be rebranded entirely from the Django admin without a code change.
    """
    from core.models import SiteSettings

    site_settings = SiteSettings.load()
    return Response({
        'site_name': site_settings.site_name,
        'tagline': site_settings.tagline or None,
        'site_url': site_settings.site_url,
        'logo_url': (
            request.build_absolute_uri(site_settings.logo.url)
            if site_settings.logo else None
        ),
    })


def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('home')
    else:
        form = CustomUserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


class HomeView(TemplateView):
    template_name = 'core/home.html'


class AuthViewSet(viewsets.ViewSet):
    """ViewSet for authentication endpoints"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], throttle_classes=[RegisterRateThrottle])
    def register(self, request):
        """Register a new user"""
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], throttle_classes=[LoginRateThrottle])
    def login(self, request):
        """Login user and return tokens"""
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Log out by blacklisting the supplied refresh token.

        This only works because 'rest_framework_simplejwt.token_blacklist' is
        now installed. Without that app RefreshToken has no blacklist() method,
        so this handler always raised and logout silently did nothing — a
        stolen refresh token stayed valid for its full 7-day lifetime.
        See PRODUCTION_READINESS.md (P1-2).
        """
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'A refresh token is required to log out.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            # Already blacklisted, malformed or expired: the caller's intent
            # (end this session) is satisfied either way.
            pass

        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='request-password-reset',
            throttle_classes=[PasswordResetRateThrottle])
    def request_password_reset(self, request):
        """Request password reset - generates token and sends email"""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail
        from django.conf import settings
        from core.models import SiteSettings
        
        email = request.data.get('email')
        if not email:
            return Response(
                {'email': ['Email is required.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response(
                {'detail': 'If an account with that email exists, a password reset link has been sent.'},
                status=status.HTTP_200_OK
            )
        
        # Generate token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Load site settings
        site_settings = SiteSettings.load()
        
        # Create reset link using configured site URL
        reset_link = f"{site_settings.site_url}/auth/reset-password?uid={uid}&token={token}"
        
        # Dispatch the email.
        #
        # Queued via Celery so a slow or unreachable SMTP host cannot hold a
        # request thread (there are only workers x threads of them). With no
        # broker configured this runs inline, exactly as before.
        #
        # Django's PASSWORD_RESET_TIMEOUT is what actually governs expiry, so
        # the copy below reads it rather than hardcoding "24 hours", which was
        # wrong — the default is 3 days.
        from .tasks import send_password_reset_email

        expiry_hours = int(settings.PASSWORD_RESET_TIMEOUT / 3600)

        try:
            send_password_reset_email.delay(
                recipient=user.email,
                subject=f'Password Reset Request - {site_settings.site_name}',
                message=(
                    f'Hello,\n\nYou requested to reset your password for '
                    f'{site_settings.site_name}.\n\n'
                    f'Click the link below to reset your password:\n\n{reset_link}\n\n'
                    f'This link will expire in {expiry_hours} hours.\n\n'
                    f'If you did not request this, please ignore this email.\n\n'
                    f'Best regards,\n{site_settings.site_name} Team'
                ),
                from_email=site_settings.default_from_email,
                connection_kwargs={
                    'backend': site_settings.email_backend,
                    'host': site_settings.email_host,
                    'port': site_settings.email_port,
                    'username': site_settings.email_host_user,
                    'password': site_settings.email_host_password,
                    'use_tls': site_settings.email_use_tls,
                    'use_ssl': site_settings.email_use_ssl,
                },
            )
        except Exception:
            # Never surface delivery failure to the caller: the response is
            # deliberately identical whether or not the address exists, and
            # differentiating here would reintroduce user enumeration.
            logger.exception("Failed to dispatch password reset email")

        return Response(
            {'detail': 'If an account with that email exists, a password reset link has been sent.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], url_path='reset-password',
            throttle_classes=[PasswordResetRateThrottle])
    def reset_password(self, request):
        """Reset password using token"""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str

        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not all([uid, token, new_password]):
            return Response(
                {'detail': 'uid, token, and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'detail': 'Invalid reset link.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify token
        if not default_token_generator.check_token(user, token):
            return Response(
                {'detail': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Run the configured AUTH_PASSWORD_VALIDATORS. Previously this endpoint
        # checked only len() >= 8, so 'password' or '12345678' were accepted
        # here even though registration rejected them.
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {'new_password': list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        # A password reset must terminate every existing session, otherwise an
        # attacker who already holds a refresh token keeps access for up to 7
        # days after the legitimate owner recovers the account.
        revoke_all_refresh_tokens(user)

        return Response(
            {'detail': 'Password has been reset successfully.'},
            status=status.HTTP_200_OK
        )


class UserProfileViewSet(viewsets.ViewSet):
    """ViewSet for user profile endpoints"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch', 'put'])
    def me(self, request):
        """Get or update current user profile"""
        if request.method == 'GET':
            serializer = UserSerializer(request.user, context={'request': request})
            return Response(serializer.data)
        
        # PATCH or PUT - update profile
        serializer = UserProfileUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            # Return updated user data
            user_serializer = UserSerializer(request.user, context={'request': request})
            return Response(user_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """
        Change the current user's password.

        This endpoint used to return HTTP 400 on every call: the serializer was
        built without the `user` context its validate() requires, and the view
        then read validated_data['old_password'] while the declared field is
        'current_password'. See PRODUCTION_READINESS.md (P1-8).
        """
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user},
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # The serializer's validate() already confirmed the current password.
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()

        # Invalidate other sessions so a changed password actually locks out
        # anyone holding a previously issued refresh token.
        revoke_all_refresh_tokens(request.user)

        return Response(
            {'detail': 'Password changed successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser],
            permission_classes=[IsAuthenticated], throttle_classes=[UploadRateThrottle])
    def upload_avatar(self, request):
        """Upload user avatar image"""
        if 'avatar' not in request.FILES:
            return Response(
                {'avatar': ['No file was submitted.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        avatar_file = request.FILES['avatar']

        # Validate file size (max 5MB)
        if avatar_file.size > 5 * 1024 * 1024:
            return Response(
                {'avatar': ['File size must be less than 5MB.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the file really is an image by decoding it, rather than
        # trusting the client-supplied Content-Type header, which is trivially
        # spoofed. See PRODUCTION_READINESS.md (P2-3).
        is_valid, error, safe_name = validate_image_upload(avatar_file)
        if not is_valid:
            return Response({'avatar': [error]}, status=status.HTTP_400_BAD_REQUEST)

        # Save avatar under a server-generated name so the stored path can
        # never be influenced by the uploaded filename.
        request.user.avatar.save(safe_name, avatar_file, save=True)
        
        return Response({
            'detail': 'Avatar uploaded successfully.',
            'avatar_url': request.user.avatar.url if request.user.avatar else None
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_avatar(self, request):
        """Delete user avatar image"""
        if request.user.avatar:
            # Delete the file from storage
            if request.user.avatar.storage.exists(request.user.avatar.name):
                request.user.avatar.storage.delete(request.user.avatar.name)
            
            # Clear the avatar field
            request.user.avatar = None
            request.user.save()
            
            return Response({
                'detail': 'Avatar deleted successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'detail': 'No avatar to delete.'
        }, status=status.HTTP_200_OK)


class UserManagementViewSet(viewsets.ModelViewSet):
    """ViewSet for admin user management"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only admins can access user management"""
        if not self.request.user.is_staff:
            return User.objects.none()
        return User.objects.all()
    
    def list(self, request, *args, **kwargs):
        """List all users (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """Get user details (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().retrieve(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update user (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        # Allow updating user roles and status
        if 'is_student' in request.data:
            user.is_student = request.data['is_student']
        if 'is_instructor' in request.data:
            user.is_instructor = request.data['is_instructor']
        if 'is_staff' in request.data:
            user.is_staff = request.data['is_staff']
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can access user management.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        # Prevent deleting the current user
        if user.id == request.user.id:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def create_user(self, request):
        """Create a new user (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can create users.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')
            first_name = request.data.get('first_name', '')
            last_name = request.data.get('last_name', '')
            is_student = request.data.get('is_student', False)
            is_instructor = request.data.get('is_instructor', False)
            is_staff = request.data.get('is_staff', False)
            
            if not username or not email or not password:
                return Response(
                    {'detail': 'username, email, and password are required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if User.objects.filter(username=username).exists():
                return Response(
                    {'detail': 'Username already exists.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if User.objects.filter(email=email).exists():
                return Response(
                    {'detail': 'Email already exists.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_student=is_student,
                is_instructor=is_instructor,
                is_staff=is_staff
            )
            
            serializer = self.get_serializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can reset passwords.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        new_password = request.data.get('password')
        
        if not new_password:
            return Response(
                {'detail': 'Password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {'detail': 'Password must be at least 8 characters long.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        return Response({
            'detail': f'Password reset successfully for {user.username}.'
        }, status=status.HTTP_200_OK)
