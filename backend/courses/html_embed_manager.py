"""
HTML Embed Content Manager

Manages HTML embed content including configuration, iframe generation,
xAPI message validation, and postMessage handling.

Requirements: 13.2, 13.3, 13.4
"""
import re
import html
import json
import uuid
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from urllib.parse import urlparse
from django.utils import timezone
from django.conf import settings


@dataclass
class ValidationResult:
    """Result of validation operations"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class HTMLEmbedManager:
    """
    Manages HTML embed content.
    
    Provides functionality for:
    - Creating and configuring HTML embed content
    - Generating secure iframe HTML with sandbox attributes
    - Validating xAPI messages from embedded content
    - Processing postMessage xAPI statements
    - Sanitizing inline HTML to prevent XSS attacks
    
    Requirements: 13.2, 13.3, 13.4
    """
    
    # Default iframe dimensions
    DEFAULT_WIDTH = '100%'
    DEFAULT_HEIGHT = '600px'
    
    # Dangerous HTML tags to remove
    DANGEROUS_TAGS = [
        'script', 'iframe', 'object', 'embed', 'form', 'input',
        'button', 'select', 'textarea', 'meta', 'link', 'base',
        'applet', 'frame', 'frameset', 'layer', 'ilayer', 'bgsound'
    ]
    
    # Dangerous attributes to remove
    DANGEROUS_ATTRS = [
        'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
        'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup',
        'onload', 'onunload', 'onerror', 'onabort', 'onblur', 'onchange',
        'onfocus', 'onreset', 'onselect', 'onsubmit', 'onresize', 'onscroll',
        'javascript:', 'vbscript:', 'data:'
    ]
    
    def __init__(self):
        """Initialize the HTML embed manager."""
        self.lms_base_url = getattr(settings, 'LMS_BASE_URL', 'http://localhost:8000')
    
    def create_embed(
        self,
        lesson,
        embed_type: str,
        external_url: str = '',
        inline_html: str = '',
        width: str = None,
        height: str = None,
        allow_scripts: bool = False,
        allow_forms: bool = False,
        allow_popups: bool = False,
        allow_same_origin: bool = False,
        allow_top_navigation: bool = False,
        custom_sandbox_attrs: str = '',
        enable_xapi_messaging: bool = False,
        allowed_origins: List[str] = None
    ):
        """
        Create HTML embed configuration for a lesson.
        
        Args:
            lesson: Lesson model instance
            embed_type: 'url' or 'inline'
            external_url: External URL to embed (for URL type)
            inline_html: Inline HTML content (for inline type)
            width: Iframe width (px or %)
            height: Iframe height (px or %)
            allow_scripts: Allow JavaScript execution
            allow_forms: Allow form submission
            allow_popups: Allow popups
            allow_same_origin: Allow same-origin access
            allow_top_navigation: Allow top-level navigation
            custom_sandbox_attrs: Additional sandbox attributes
            enable_xapi_messaging: Enable xAPI via postMessage
            allowed_origins: List of allowed origins for xAPI messaging
            
        Returns:
            HTMLEmbed model instance
            
        Requirements: 13.1, 13.2
        """
        from .content_models import HTMLEmbed
        from .models import Lesson
        
        # Validate embed type
        if embed_type not in [HTMLEmbed.EMBED_TYPE_URL, HTMLEmbed.EMBED_TYPE_INLINE]:
            raise ValueError(f"Invalid embed_type: {embed_type}. Must be 'url' or 'inline'")
        
        # Validate URL if URL type
        if embed_type == HTMLEmbed.EMBED_TYPE_URL:
            if not external_url:
                raise ValueError("external_url is required for URL embed type")
            validation = self._validate_url(external_url)
            if not validation.is_valid:
                raise ValueError(f"Invalid URL: {'; '.join(validation.errors)}")
        
        # Sanitize inline HTML if inline type
        sanitized_html = ''
        if embed_type == HTMLEmbed.EMBED_TYPE_INLINE:
            if not inline_html:
                raise ValueError("inline_html is required for inline embed type")
            sanitized_html = self.sanitize_html(inline_html)
        
        # Get or create HTMLEmbed
        try:
            html_embed = lesson.html_embed
            # Update existing
            html_embed.embed_type = embed_type
            html_embed.external_url = external_url if embed_type == HTMLEmbed.EMBED_TYPE_URL else ''
            html_embed.inline_html = sanitized_html if embed_type == HTMLEmbed.EMBED_TYPE_INLINE else ''
        except HTMLEmbed.DoesNotExist:
            # Create new
            html_embed = HTMLEmbed(
                lesson=lesson,
                embed_type=embed_type,
                external_url=external_url if embed_type == HTMLEmbed.EMBED_TYPE_URL else '',
                inline_html=sanitized_html if embed_type == HTMLEmbed.EMBED_TYPE_INLINE else ''
            )
        
        # Set dimensions
        html_embed.width = width or self.DEFAULT_WIDTH
        html_embed.height = height or self.DEFAULT_HEIGHT
        
        # Set sandbox permissions
        html_embed.allow_scripts = allow_scripts
        html_embed.allow_forms = allow_forms
        html_embed.allow_popups = allow_popups
        html_embed.allow_same_origin = allow_same_origin
        html_embed.allow_top_navigation = allow_top_navigation
        html_embed.custom_sandbox_attrs = custom_sandbox_attrs
        
        # Set xAPI messaging configuration
        html_embed.enable_xapi_messaging = enable_xapi_messaging
        html_embed.allowed_origins = allowed_origins or []
        
        html_embed.save()
        
        # Update lesson content type
        lesson.content_type = Lesson.CONTENT_TYPE_HTML_EMBED
        lesson.save()
        
        return html_embed
    
    def generate_iframe_html(
        self,
        embed,
        student=None,
        include_xapi_listener: bool = True
    ) -> Dict[str, Any]:
        """
        Generate secure iframe HTML with sandbox attributes.
        
        Args:
            embed: HTMLEmbed model instance
            student: Optional User model instance
            include_xapi_listener: Whether to include xAPI listener script
            
        Returns:
            Dictionary with iframe_html, xapi_listener_script, and metadata
            
        Requirements: 13.2, 13.3
        """
        # Build sandbox attribute string
        sandbox_attrs = embed.get_sandbox_attributes()
        
        # Determine iframe source
        if embed.embed_type == embed.EMBED_TYPE_URL:
            src = embed.external_url
            iframe_html = self._build_url_iframe(embed, sandbox_attrs)
        else:
            # For inline HTML, we use srcdoc attribute
            iframe_html = self._build_inline_iframe(embed, sandbox_attrs)
        
        # Generate xAPI listener script if enabled
        xapi_listener_script = ''
        if embed.enable_xapi_messaging and include_xapi_listener:
            xapi_listener_script = self._generate_xapi_listener_script(
                embed.lesson.pk,
                embed.allowed_origins
            )
        
        return {
            'iframe_html': iframe_html,
            'xapi_listener_script': xapi_listener_script,
            'embed_type': embed.embed_type,
            'width': embed.width,
            'height': embed.height,
            'sandbox_attributes': sandbox_attrs,
            'enable_xapi_messaging': embed.enable_xapi_messaging,
            'allowed_origins': embed.allowed_origins
        }
    
    def _build_url_iframe(self, embed, sandbox_attrs: str) -> str:
        """Build iframe HTML for URL embed type."""
        attrs = [
            f'src="{html.escape(embed.external_url)}"',
            f'width="{html.escape(embed.width)}"',
            f'height="{html.escape(embed.height)}"',
            'frameborder="0"',
        ]
        
        if sandbox_attrs:
            attrs.append(f'sandbox="{html.escape(sandbox_attrs)}"')
        else:
            # Always include sandbox for security, even if empty
            attrs.append('sandbox=""')
        
        attrs.append('loading="lazy"')
        attrs.append('referrerpolicy="no-referrer-when-downgrade"')
        
        return f'<iframe {" ".join(attrs)}></iframe>'
    
    def _build_inline_iframe(self, embed, sandbox_attrs: str) -> str:
        """Build iframe HTML for inline HTML embed type."""
        # Escape the HTML for srcdoc attribute
        escaped_html = html.escape(embed.inline_html)
        
        attrs = [
            f'srcdoc="{escaped_html}"',
            f'width="{html.escape(embed.width)}"',
            f'height="{html.escape(embed.height)}"',
            'frameborder="0"',
        ]
        
        if sandbox_attrs:
            attrs.append(f'sandbox="{html.escape(sandbox_attrs)}"')
        else:
            attrs.append('sandbox=""')
        
        attrs.append('loading="lazy"')
        
        return f'<iframe {" ".join(attrs)}></iframe>'
    
    def _generate_xapi_listener_script(
        self,
        lesson_id: int,
        allowed_origins: List[str]
    ) -> str:
        """
        Generate JavaScript for capturing xAPI statements via postMessage.
        
        Args:
            lesson_id: Lesson ID for the API endpoint
            allowed_origins: List of allowed origins
            
        Returns:
            JavaScript code string
            
        Requirements: 13.3, 13.4
        """
        # Convert allowed origins to JSON for JavaScript
        origins_json = json.dumps(allowed_origins)
        
        return f'''
<script>
(function() {{
    var allowedOrigins = {origins_json};
    
    // Listen for xAPI statements from embedded content via postMessage
    window.addEventListener('message', function(event) {{
        // Validate origin if origins are specified
        if (allowedOrigins.length > 0 && allowedOrigins.indexOf(event.origin) === -1) {{
            console.warn('xAPI message from unauthorized origin:', event.origin);
            return;
        }}
        
        // Validate message structure
        if (!event.data || typeof event.data !== 'object') return;
        
        // Check if it's an xAPI statement
        var statement = null;
        if (event.data.statement) {{
            statement = event.data.statement;
        }} else if (event.data.verb && event.data.actor && event.data.object) {{
            // Direct statement format
            statement = event.data;
        }} else {{
            return; // Not an xAPI statement
        }}
        
        // Send to backend
        fetch('/api/lessons/{lesson_id}/html-embed/xapi/', {{
            method: 'POST',
            headers: {{
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
            }},
            body: JSON.stringify({{
                statement: statement,
                origin: event.origin
            }}),
            credentials: 'same-origin'
        }}).then(function(response) {{
            if (!response.ok) {{
                console.error('Failed to send xAPI statement:', response.status);
            }}
        }}).catch(function(err) {{
            console.error('Failed to send xAPI statement:', err);
        }});
    }});
    
    console.log('xAPI listener initialized for lesson {lesson_id}');
}})();
</script>
'''

    
    def validate_xapi_message(
        self,
        message: Dict[str, Any],
        embed
    ) -> ValidationResult:
        """
        Validate xAPI message from embedded content.
        
        Checks that:
        - The message contains a valid xAPI statement structure
        - The origin is allowed (if origins are configured)
        - The statement has required fields
        
        Args:
            message: Message dictionary containing statement and origin
            embed: HTMLEmbed model instance
            
        Returns:
            ValidationResult with is_valid, errors, and warnings
            
        Requirements: 13.3, 13.4
        """
        errors = []
        warnings = []
        
        # Check if xAPI messaging is enabled
        if not embed.enable_xapi_messaging:
            errors.append("xAPI messaging is not enabled for this embed")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # Validate origin if specified
        origin = message.get('origin', '')
        if embed.allowed_origins and origin:
            if not embed.is_origin_allowed(origin):
                errors.append(f"Origin '{origin}' is not in the allowed origins list")
                return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # Extract statement
        statement = message.get('statement')
        if not statement:
            errors.append("Message does not contain a statement")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        if not isinstance(statement, dict):
            errors.append("Statement must be an object")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # Validate basic xAPI structure
        required_fields = ['actor', 'verb', 'object']
        for field in required_fields:
            if field not in statement:
                errors.append(f"Statement missing required field: {field}")
        
        if errors:
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        # Validate verb has id
        verb = statement.get('verb', {})
        if not isinstance(verb, dict) or 'id' not in verb:
            errors.append("Verb must have an 'id' field")
        
        # Validate object has id
        obj = statement.get('object', {})
        if not isinstance(obj, dict) or 'id' not in obj:
            warnings.append("Object should have an 'id' field")
        
        is_valid = len(errors) == 0
        return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
    
    def process_postmessage(
        self,
        message: Dict[str, Any],
        student,
        embed
    ):
        """
        Process postMessage xAPI statement from embedded content.
        
        Validates the message, enriches the statement with actor info,
        stores it in the LRS, and updates progress.
        
        Args:
            message: Message dictionary containing statement and origin
            student: User model instance
            embed: HTMLEmbed model instance
            
        Returns:
            Stored XAPIStatement instance or None if invalid
            
        Requirements: 13.4
        """
        from xapi.statement_store import XAPIStatementStore
        from xapi.validators import ValidationError
        from .content_models import ContentInteraction
        
        # Validate the message
        validation = self.validate_xapi_message(message, embed)
        if not validation.is_valid:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Invalid xAPI message from embed: {validation.errors}")
            return None
        
        statement = message.get('statement')
        
        # Enrich statement with actor info
        statement = self._enrich_statement(statement, student, embed)
        
        # Store in LRS
        store = XAPIStatementStore()
        try:
            statement_id = store.store_statement(statement)
        except ValidationError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"HTML embed xAPI statement validation failed: {e}")
            return None
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to store HTML embed xAPI statement: {e}")
            return None
        
        # Get the stored statement
        from xapi.models.statement import XAPIStatement
        xapi_statement = XAPIStatement.objects.filter(statement_id=statement_id).first()
        
        # Update progress based on statement
        self._update_progress_from_statement(statement, student, embed)
        
        # Record content interaction
        interaction_data = {
            'verb': statement.get('verb', {}).get('id', ''),
            'statement_id': str(statement_id),
            'origin': message.get('origin', '')
        }
        
        # Extract score if present
        result = statement.get('result', {})
        if 'score' in result:
            interaction_data['score'] = result['score']
        
        ContentInteraction.record_interaction(
            student=student,
            lesson=embed.lesson,
            data=interaction_data
        )
        
        return xapi_statement
    
    def _enrich_statement(
        self,
        statement: Dict[str, Any],
        student,
        embed
    ) -> Dict[str, Any]:
        """
        Enrich xAPI statement with actor and context information.
        
        Args:
            statement: Original xAPI statement
            student: User model instance
            embed: HTMLEmbed model instance
            
        Returns:
            Enriched statement dictionary
        """
        # Make a copy to avoid modifying original
        enriched = dict(statement)
        
        # Add/update actor if not present or incomplete
        if 'actor' not in enriched or not enriched['actor'].get('mbox'):
            enriched['actor'] = {
                'objectType': 'Agent',
                'name': student.get_full_name() or student.username,
                'mbox': f'mailto:{student.email}' if student.email else f'mailto:{student.username}@lms.local'
            }
        
        # Add timestamp if not present
        if 'timestamp' not in enriched:
            enriched['timestamp'] = timezone.now().isoformat()
        
        # Add context with embed info
        if 'context' not in enriched:
            enriched['context'] = {}
        
        enriched['context']['extensions'] = enriched['context'].get('extensions', {})
        enriched['context']['extensions']['http://lms.local/html-embed/lesson_id'] = embed.lesson.pk
        enriched['context']['extensions']['http://lms.local/html-embed/embed_type'] = embed.embed_type
        
        if embed.embed_type == embed.EMBED_TYPE_URL:
            enriched['context']['extensions']['http://lms.local/html-embed/source_url'] = embed.external_url
        
        return enriched
    
    def _update_progress_from_statement(
        self,
        statement: Dict[str, Any],
        student,
        embed
    ):
        """
        Update progress based on xAPI statement.
        
        Args:
            statement: xAPI statement dictionary
            student: User model instance
            embed: HTMLEmbed model instance
        """
        from .models import Progress
        
        # Extract verb
        verb_id = statement.get('verb', {}).get('id', '')
        
        # Check for completion verbs
        completion_verbs = [
            'http://adlnet.gov/expapi/verbs/completed',
            'http://adlnet.gov/expapi/verbs/passed',
            'http://adlnet.gov/expapi/verbs/mastered'
        ]
        
        if verb_id in completion_verbs:
            # Update Progress model
            progress, _ = Progress.objects.get_or_create(
                student=student,
                lesson=embed.lesson
            )
            if not progress.completed:
                progress.completed = True
                progress.completed_at = timezone.now()
                progress.save()
    
    def sanitize_html(self, html_content: str) -> str:
        """
        Sanitize inline HTML to prevent XSS attacks.
        
        Removes dangerous tags (including their content) and attributes 
        while preserving safe content.
        
        Args:
            html_content: Raw HTML content
            
        Returns:
            Sanitized HTML string
            
        Requirements: 13.2
        """
        if not html_content:
            return ''
        
        sanitized = html_content
        
        # Remove dangerous tags WITH their content (for tags that contain executable code)
        content_dangerous_tags = ['script', 'style', 'object', 'embed', 'applet']
        for tag in content_dangerous_tags:
            # Remove tag and everything between opening and closing tags
            pattern = re.compile(f'<{tag}[^>]*>.*?</{tag}>', re.IGNORECASE | re.DOTALL)
            sanitized = pattern.sub('', sanitized)
            # Also remove self-closing versions
            pattern = re.compile(f'<{tag}[^>]*/>', re.IGNORECASE)
            sanitized = pattern.sub('', sanitized)
        
        # Remove other dangerous tags (but keep their content)
        other_dangerous_tags = [
            'iframe', 'form', 'input', 'button', 'select', 'textarea', 
            'meta', 'link', 'base', 'frame', 'frameset', 'layer', 
            'ilayer', 'bgsound'
        ]
        for tag in other_dangerous_tags:
            # Remove opening tags with attributes
            pattern = re.compile(f'<{tag}[^>]*>', re.IGNORECASE)
            sanitized = pattern.sub('', sanitized)
            # Remove closing tags
            pattern = re.compile(f'</{tag}>', re.IGNORECASE)
            sanitized = pattern.sub('', sanitized)
        
        # Remove dangerous attributes from remaining tags
        for attr in self.DANGEROUS_ATTRS:
            if attr.endswith(':'):
                # Protocol handlers (javascript:, vbscript:, data:)
                pattern = re.compile(f'{attr}[^"\'\\s>]*', re.IGNORECASE)
                sanitized = pattern.sub('', sanitized)
            else:
                # Event handlers (onclick, onload, etc.)
                # Handle double-quoted attributes
                pattern = re.compile(f'\\s*{attr}\\s*=\\s*"[^"]*"', re.IGNORECASE)
                sanitized = pattern.sub('', sanitized)
                # Handle single-quoted attributes
                pattern = re.compile(f"\\s*{attr}\\s*=\\s*'[^']*'", re.IGNORECASE)
                sanitized = pattern.sub('', sanitized)
                # Handle unquoted attributes
                pattern = re.compile(f'\\s*{attr}\\s*=\\s*[^\\s>]+', re.IGNORECASE)
                sanitized = pattern.sub('', sanitized)
        
        # Remove any remaining javascript: or data: URLs in href/src
        sanitized = re.sub(
            r'(href|src)\s*=\s*["\']?\s*(javascript|vbscript|data):[^"\'>\s]*["\']?',
            '',
            sanitized,
            flags=re.IGNORECASE
        )
        
        return sanitized.strip()
    
    def validate_allowed_origins(self, origins: List[str]) -> ValidationResult:
        """
        Validate a list of allowed origins for postMessage.
        
        Args:
            origins: List of origin URLs
            
        Returns:
            ValidationResult with is_valid, errors, and warnings
        """
        errors = []
        warnings = []
        
        if not origins:
            return ValidationResult(is_valid=True, errors=errors, warnings=warnings)
        
        for origin in origins:
            validation = self._validate_origin(origin)
            if not validation.is_valid:
                errors.extend([f"Origin '{origin}': {e}" for e in validation.errors])
            warnings.extend([f"Origin '{origin}': {w}" for w in validation.warnings])
        
        is_valid = len(errors) == 0
        return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
    
    def _validate_origin(self, origin: str) -> ValidationResult:
        """Validate a single origin URL."""
        errors = []
        warnings = []
        
        if not origin:
            errors.append("Origin cannot be empty")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        try:
            parsed = urlparse(origin)
            
            # Must have scheme
            if not parsed.scheme:
                errors.append("Origin must include scheme (http:// or https://)")
            elif parsed.scheme not in ['http', 'https']:
                warnings.append(f"Unusual scheme: {parsed.scheme}")
            
            # Must have netloc (domain)
            if not parsed.netloc:
                errors.append("Origin must include domain")
            
            # Should not have path (origins are scheme + host + port only)
            if parsed.path and parsed.path != '/':
                warnings.append("Origin should not include path")
            
            # Check for localhost in production
            if 'localhost' in origin or '127.0.0.1' in origin:
                warnings.append("Localhost origin may not work in production")
            
        except Exception as e:
            errors.append(f"Invalid URL format: {str(e)}")
        
        is_valid = len(errors) == 0
        return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
    
    def _validate_url(self, url: str) -> ValidationResult:
        """Validate an external URL for embedding."""
        errors = []
        warnings = []
        
        if not url:
            errors.append("URL cannot be empty")
            return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
        
        try:
            parsed = urlparse(url)
            
            # Must have scheme
            if not parsed.scheme:
                errors.append("URL must include scheme (http:// or https://)")
            elif parsed.scheme not in ['http', 'https']:
                errors.append(f"URL scheme must be http or https, got: {parsed.scheme}")
            
            # Must have netloc (domain)
            if not parsed.netloc:
                errors.append("URL must include domain")
            
            # Check for potentially dangerous URLs
            dangerous_domains = ['localhost', '127.0.0.1', '0.0.0.0']
            for domain in dangerous_domains:
                if domain in parsed.netloc:
                    warnings.append(f"URL contains {domain}, which may not work in production")
            
        except Exception as e:
            errors.append(f"Invalid URL format: {str(e)}")
        
        is_valid = len(errors) == 0
        return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
    
    def get_embed_info(self, embed) -> Dict[str, Any]:
        """
        Get information about an HTML embed.
        
        Args:
            embed: HTMLEmbed model instance
            
        Returns:
            Dictionary with embed information
        """
        return {
            'id': embed.pk,
            'lesson_id': embed.lesson.pk,
            'embed_type': embed.embed_type,
            'external_url': embed.external_url if embed.embed_type == embed.EMBED_TYPE_URL else None,
            'has_inline_html': bool(embed.inline_html) if embed.embed_type == embed.EMBED_TYPE_INLINE else False,
            'width': embed.width,
            'height': embed.height,
            'sandbox_attributes': embed.get_sandbox_attributes(),
            'allow_scripts': embed.allow_scripts,
            'allow_forms': embed.allow_forms,
            'allow_popups': embed.allow_popups,
            'allow_same_origin': embed.allow_same_origin,
            'allow_top_navigation': embed.allow_top_navigation,
            'enable_xapi_messaging': embed.enable_xapi_messaging,
            'allowed_origins': embed.allowed_origins,
            'created_at': embed.created_at.isoformat(),
            'updated_at': embed.updated_at.isoformat()
        }
    
    def delete_embed(self, embed) -> bool:
        """
        Delete an HTML embed.
        
        Args:
            embed: HTMLEmbed model instance
            
        Returns:
            True if successful
        """
        embed.delete()
        return True
