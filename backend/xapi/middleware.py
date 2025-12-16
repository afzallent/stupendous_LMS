"""
xAPI audit logging middleware
Logs all xAPI statement access for compliance and security
"""
import logging
from django.utils import timezone
from xapi.models import XAPIAuditLog

logger = logging.getLogger(__name__)


class XAPIAuditMiddleware:
    """
    Middleware to log all xAPI statement access
    
    Logs read and write operations on xAPI endpoints for audit purposes.
    
    Validates: Requirements 10.5
    """
    
    # xAPI endpoints to monitor
    MONITORED_PATHS = [
        '/xapi/statements/',
        '/api/xapi/statements/',
        '/api/xapi/my-data/',
        '/api/xapi/export/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        """Process the request and log xAPI access"""
        # Check if this is an xAPI endpoint
        should_log = any(request.path.startswith(path) for path in self.MONITORED_PATHS)
        
        if should_log:
            # Determine operation type based on HTTP method
            operation_type = self._get_operation_type(request.method)
            
            # Get resource information
            resource_type, resource_id = self._get_resource_info(request)
            
            # Get client IP
            ip_address = self._get_client_ip(request)
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Process the request
            response = self.get_response(request)
            
            # Log the access
            self._log_access(
                request=request,
                operation_type=operation_type,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                response_status=response.status_code
            )
            
            return response
        else:
            # Not an xAPI endpoint, just process normally
            return self.get_response(request)
    
    def _get_operation_type(self, method):
        """Map HTTP method to operation type"""
        method_to_operation = {
            'GET': 'read',
            'POST': 'write',
            'PUT': 'write',
            'DELETE': 'delete',
            'HEAD': 'read',
            'OPTIONS': 'read',
        }
        return method_to_operation.get(method, 'read')
    
    def _get_resource_info(self, request):
        """Extract resource type and ID from request"""
        path = request.path
        
        # Determine resource type based on path
        if '/my-data/' in path:
            resource_type = 'student_data'
            resource_id = f'user_{request.user.id}' if request.user.is_authenticated else 'anonymous'
        elif '/export/' in path:
            resource_type = 'export'
            resource_id = f'user_{request.user.id}' if request.user.is_authenticated else 'anonymous'
        elif '/statements/' in path:
            resource_type = 'statement'
            # Try to get statement ID from query params
            statement_id = request.GET.get('statementId', '')
            resource_id = statement_id if statement_id else 'bulk'
        else:
            resource_type = 'unknown'
            resource_id = ''
        
        return resource_type, resource_id
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        # Check for IP in X-Forwarded-For header (for proxied requests)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        
        return ip
    
    def _log_access(self, request, operation_type, resource_type, resource_id, 
                    ip_address, user_agent, response_status):
        """Log the xAPI access"""
        try:
            # Determine if operation was successful
            success = 200 <= response_status < 300
            error_message = '' if success else f'HTTP {response_status}'
            
            # Create audit log entry
            XAPIAuditLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                operation_type=operation_type,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                details={
                    'path': request.path,
                    'method': request.method,
                    'status_code': response_status,
                    'timestamp': timezone.now().isoformat(),
                },
                success=success,
                error_message=error_message
            )
        except Exception as e:
            # Log error but don't fail the request
            logger.error(f'Failed to log xAPI access: {str(e)}')
