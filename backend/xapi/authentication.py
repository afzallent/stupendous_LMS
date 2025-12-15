"""
xAPI Authentication
Implements HTTP Basic Auth and Token-based authentication for xAPI endpoints
"""
import base64
from typing import Optional, Tuple

from django.contrib.auth import authenticate, get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import authentication, exceptions
from rest_framework.authtoken.models import Token

User = get_user_model()


class XAPIAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication for xAPI endpoints
    
    Supports:
    1. HTTP Basic Authentication (username:password in Authorization header)
    2. Token-based authentication (Token in Authorization header)
    3. Django session authentication (for browser-based access)
    
    Per xAPI specification, authentication is required for all LRS operations.
    """
    
    www_authenticate_realm = 'xAPI'
    
    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, auth).
        
        Returns None if authentication is not attempted.
        Raises AuthenticationFailed if authentication fails.
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header:
            # No authentication provided
            return None
        
        # Try different authentication methods
        auth_parts = auth_header.split()
        
        if len(auth_parts) == 0:
            return None
        
        auth_method = auth_parts[0].lower()
        
        if auth_method == 'basic':
            # HTTP Basic Authentication
            return self._authenticate_basic(auth_parts)
        
        elif auth_method == 'token':
            # Token-based authentication
            return self._authenticate_token(auth_parts)
        
        elif auth_method == 'bearer':
            # Bearer token (OAuth-style)
            return self._authenticate_bearer(auth_parts)
        
        else:
            # Unknown authentication method
            raise exceptions.AuthenticationFailed(
                _('Unsupported authentication method: {}').format(auth_method)
            )
    
    def _authenticate_basic(self, auth_parts: list) -> Tuple[User, str]:
        """
        Authenticate using HTTP Basic Auth
        
        Args:
            auth_parts: List of authorization header parts
            
        Returns:
            Tuple of (user, 'Basic')
            
        Raises:
            AuthenticationFailed: If authentication fails
        """
        if len(auth_parts) != 2:
            raise exceptions.AuthenticationFailed(
                _('Invalid basic authentication header')
            )
        
        try:
            # Decode base64 credentials
            auth_decoded = base64.b64decode(auth_parts[1]).decode('utf-8')
            username, password = auth_decoded.split(':', 1)
        except (TypeError, UnicodeDecodeError, ValueError):
            raise exceptions.AuthenticationFailed(
                _('Invalid basic authentication credentials')
            )
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if user is None:
            raise exceptions.AuthenticationFailed(
                _('Invalid username or password')
            )
        
        if not user.is_active:
            raise exceptions.AuthenticationFailed(
                _('User account is disabled')
            )
        
        return (user, 'Basic')
    
    def _authenticate_token(self, auth_parts: list) -> Tuple[User, Token]:
        """
        Authenticate using Token-based auth
        
        Args:
            auth_parts: List of authorization header parts
            
        Returns:
            Tuple of (user, token)
            
        Raises:
            AuthenticationFailed: If authentication fails
        """
        if len(auth_parts) != 2:
            raise exceptions.AuthenticationFailed(
                _('Invalid token authentication header')
            )
        
        token_key = auth_parts[1]
        
        try:
            token = Token.objects.select_related('user').get(key=token_key)
        except Token.DoesNotExist:
            raise exceptions.AuthenticationFailed(_('Invalid token'))
        
        if not token.user.is_active:
            raise exceptions.AuthenticationFailed(
                _('User account is disabled')
            )
        
        return (token.user, token)
    
    def _authenticate_bearer(self, auth_parts: list) -> Tuple[User, Token]:
        """
        Authenticate using Bearer token (OAuth-style)
        
        Args:
            auth_parts: List of authorization header parts
            
        Returns:
            Tuple of (user, token)
            
        Raises:
            AuthenticationFailed: If authentication fails
        """
        # For now, treat Bearer tokens the same as Token auth
        # In the future, this could be extended to support OAuth 2.0
        return self._authenticate_token(auth_parts)
    
    def authenticate_header(self, request):
        """
        Return a string to be used as the value of the WWW-Authenticate
        header in a 401 Unauthenticated response.
        """
        return f'Basic realm="{self.www_authenticate_realm}"'


class XAPIBasicAuthentication(authentication.BasicAuthentication):
    """
    HTTP Basic Authentication for xAPI endpoints
    
    This is a simpler alternative that only supports Basic Auth.
    Use XAPIAuthentication for multi-method support.
    """
    
    www_authenticate_realm = 'xAPI'


class XAPITokenAuthentication(authentication.TokenAuthentication):
    """
    Token-based authentication for xAPI endpoints
    
    This is a simpler alternative that only supports Token auth.
    Use XAPIAuthentication for multi-method support.
    """
    
    keyword = 'Token'
