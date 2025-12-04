from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin
from .models import SessionActivity


class ActivityTrackingMiddleware(MiddlewareMixin):
    """
    Middleware to track user sessions and update activity timestamps.
    """
    
    def process_request(self, request):
        if request.user.is_authenticated:
            session_key = request.session.session_key
            
            if session_key:
                # Get or create session activity
                session_activity, created = SessionActivity.objects.get_or_create(
                    session_key=session_key,
                    defaults={
                        'user': request.user,
                        'ip_address': self.get_client_ip(request),
                        'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
                        'device_type': self.detect_device_type(request),
                    }
                )
                
                if not created:
                    # Update last activity
                    session_activity.last_activity = timezone.now()
                    session_activity.page_views += 1
                    session_activity.save(update_fields=['last_activity', 'page_views'])
                
                # Attach to request for easy access
                request.session_activity = session_activity
    
    def get_client_ip(self, request):
        """Extract client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def detect_device_type(self, request):
        """Detect device type from user agent"""
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        
        if 'mobile' in user_agent or 'android' in user_agent:
            return 'mobile'
        elif 'tablet' in user_agent or 'ipad' in user_agent:
            return 'tablet'
        elif 'mozilla' in user_agent or 'chrome' in user_agent:
            return 'desktop'
        
        return 'unknown'
