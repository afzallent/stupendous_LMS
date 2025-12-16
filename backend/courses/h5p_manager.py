"""
H5P Content Manager

Manages H5P interactive content packages including validation, extraction,
embedding, xAPI statement processing, and state management.

Requirements: 12.1, 12.2, 12.3
"""
import os
import json
import zipfile
import shutil
import uuid
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from django.conf import settings
from django.utils import timezone


@dataclass
class ValidationResult:
    """Result of H5P package validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


@dataclass
class H5PMetadata:
    """Metadata extracted from H5P package"""
    title: str
    library_name: str
    library_version: str
    main_library: str
    embed_types: List[str]
    language: str
    license: str
    authors: List[Dict[str, str]]
    content_type: str
    raw_metadata: Dict[str, Any]


class H5PContentManager:
    """
    Manages H5P interactive content packages.
    
    Provides functionality for:
    - Validating H5P package structure
    - Extracting H5P packages and parsing h5p.json
    - Generating iframe embed code
    - Processing xAPI statements from H5P content
    - Managing student content state
    
    Requirements: 12.1, 12.2, 12.3
    """
    
    # Required files in H5P package
    REQUIRED_FILES = ['h5p.json', 'content/content.json']
    
    # Default embed dimensions
    DEFAULT_WIDTH = '100%'
    DEFAULT_HEIGHT = '600px'
    
    # H5P content directory
    H5P_CONTENT_DIR = 'h5p_content'
    
    def __init__(self):
        """Initialize the H5P content manager."""
        self.media_root = getattr(settings, 'MEDIA_ROOT', '')
        self.h5p_base_url = getattr(settings, 'H5P_BASE_URL', '/h5p/content/')
    
    def validate_package(self, h5p_file) -> ValidationResult:
        """
        Validate H5P package structure.
        
        Checks that the package is a valid ZIP file containing required
        H5P files (h5p.json, content/content.json).
        
        Args:
            h5p_file: File object or path to H5P package
            
        Returns:
            ValidationResult with is_valid, errors, and warnings
            
        Requirements: 12.1
        """
        errors = []
        warnings = []
        
        try:
            # Check if it's a valid ZIP file
            if not zipfile.is_zipfile(h5p_file):
                errors.append("File is not a valid ZIP archive")
                return ValidationResult(is_valid=False, errors=errors, warnings=warnings)
            
            with zipfile.ZipFile(h5p_file, 'r') as zf:
                # Get list of files in archive
                file_list = zf.namelist()
                
                # Check for required files
                if 'h5p.json' not in file_list:
                    errors.append("Missing required file: h5p.json")
                
                # Check for content directory
                has_content = any(f.startswith('content/') for f in file_list)
                if not has_content:
                    errors.append("Missing content directory")
                
                # Validate h5p.json if present
                if 'h5p.json' in file_list:
                    try:
                        h5p_json_content = zf.read('h5p.json').decode('utf-8')
                        h5p_data = json.loads(h5p_json_content)
                        
                        # Check required fields in h5p.json
                        required_fields = ['mainLibrary']
                        for field in required_fields:
                            if field not in h5p_data:
                                errors.append(f"h5p.json missing required field: {field}")
                        
                        # Check for preloadedDependencies
                        if 'preloadedDependencies' not in h5p_data:
                            warnings.append("h5p.json missing preloadedDependencies")
                        
                    except json.JSONDecodeError as e:
                        errors.append(f"Invalid JSON in h5p.json: {str(e)}")
                    except UnicodeDecodeError:
                        errors.append("h5p.json is not valid UTF-8")
                
                # Check for content.json
                content_json_path = 'content/content.json'
                if content_json_path not in file_list:
                    # Some H5P packages have content.json at root
                    if 'content.json' not in file_list:
                        warnings.append("content.json not found in expected location")
                
                # Check for potentially dangerous files
                dangerous_extensions = ['.exe', '.bat', '.cmd', '.sh', '.php']
                for filename in file_list:
                    ext = os.path.splitext(filename)[1].lower()
                    if ext in dangerous_extensions:
                        warnings.append(f"Potentially dangerous file type: {filename}")
                
        except zipfile.BadZipFile:
            errors.append("Corrupted ZIP file")
        except Exception as e:
            errors.append(f"Error validating package: {str(e)}")
        
        # Reset file pointer if it's a file object
        if hasattr(h5p_file, 'seek'):
            h5p_file.seek(0)
        
        is_valid = len(errors) == 0
        return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
    
    def extract_package(self, h5p_file, destination: str = None) -> Tuple[H5PMetadata, str]:
        """
        Extract H5P package and parse h5p.json metadata.
        
        Args:
            h5p_file: File object or path to H5P package
            destination: Optional destination directory (auto-generated if not provided)
            
        Returns:
            Tuple of (H5PMetadata, content_path)
            
        Raises:
            ValueError: If package is invalid
            
        Requirements: 12.1
        """
        # Validate first
        validation = self.validate_package(h5p_file)
        if not validation.is_valid:
            raise ValueError(f"Invalid H5P package: {'; '.join(validation.errors)}")
        
        # Generate destination if not provided
        if destination is None:
            unique_id = str(uuid.uuid4())[:8]
            destination = os.path.join(
                self.media_root,
                self.H5P_CONTENT_DIR,
                unique_id
            )
        
        # Create destination directory
        os.makedirs(destination, exist_ok=True)
        
        try:
            with zipfile.ZipFile(h5p_file, 'r') as zf:
                # Extract all files
                zf.extractall(destination)
                
                # Parse h5p.json
                h5p_json_path = os.path.join(destination, 'h5p.json')
                with open(h5p_json_path, 'r', encoding='utf-8') as f:
                    h5p_data = json.load(f)
                
                # Extract metadata
                metadata = self._parse_h5p_metadata(h5p_data)
                
                return metadata, destination
                
        except Exception as e:
            # Clean up on failure
            if os.path.exists(destination):
                shutil.rmtree(destination, ignore_errors=True)
            raise ValueError(f"Failed to extract H5P package: {str(e)}")
    
    def _parse_h5p_metadata(self, h5p_data: Dict[str, Any]) -> H5PMetadata:
        """
        Parse H5P metadata from h5p.json data.
        
        Args:
            h5p_data: Parsed h5p.json dictionary
            
        Returns:
            H5PMetadata instance
        """
        # Extract main library info
        main_library = h5p_data.get('mainLibrary', '')
        
        # Find library version from preloadedDependencies
        library_version = ''
        preloaded = h5p_data.get('preloadedDependencies', [])
        for dep in preloaded:
            if dep.get('machineName') == main_library:
                major = dep.get('majorVersion', 0)
                minor = dep.get('minorVersion', 0)
                library_version = f"{major}.{minor}"
                break
        
        # Extract authors
        authors = []
        for author in h5p_data.get('authors', []):
            authors.append({
                'name': author.get('name', ''),
                'role': author.get('role', '')
            })
        
        return H5PMetadata(
            title=h5p_data.get('title', 'Untitled'),
            library_name=main_library,
            library_version=library_version,
            main_library=main_library,
            embed_types=h5p_data.get('embedTypes', ['iframe']),
            language=h5p_data.get('language', 'en'),
            license=h5p_data.get('license', ''),
            authors=authors,
            content_type=main_library,
            raw_metadata=h5p_data
        )
    
    def get_embed_code(
        self,
        h5p_package,
        student=None,
        include_state: bool = True
    ) -> Dict[str, Any]:
        """
        Generate embed code for H5P player.
        
        Args:
            h5p_package: H5PPackage model instance
            student: Optional User model instance for state restoration
            include_state: Whether to include previous state
            
        Returns:
            Dictionary with embed_url, iframe_html, width, height, state
            
        Requirements: 12.2
        """
        # Build embed URL
        embed_url = f"{self.h5p_base_url}{h5p_package.pk}/"
        
        # Get dimensions
        width = h5p_package.embed_width or self.DEFAULT_WIDTH
        height = h5p_package.embed_height or self.DEFAULT_HEIGHT
        
        # Build iframe HTML
        sandbox_attrs = 'allow-scripts allow-same-origin allow-forms'
        fullscreen_attr = 'allowfullscreen' if h5p_package.allow_fullscreen else ''
        
        iframe_html = (
            f'<iframe src="{embed_url}" '
            f'width="{width}" height="{height}" '
            f'frameborder="0" '
            f'sandbox="{sandbox_attrs}" '
            f'{fullscreen_attr}>'
            f'</iframe>'
        )
        
        # Get previous state if student provided
        state = None
        if student and include_state:
            state = self.restore_content_state(student, h5p_package)
        
        # Build xAPI listener script for capturing H5P xAPI statements
        xapi_listener_script = self._generate_xapi_listener_script(h5p_package.pk)
        
        return {
            'embed_url': embed_url,
            'iframe_html': iframe_html,
            'width': width,
            'height': height,
            'state': state,
            'xapi_listener_script': xapi_listener_script,
            'track_xapi': h5p_package.track_xapi
        }

    
    def _generate_xapi_listener_script(self, h5p_id: int) -> str:
        """
        Generate JavaScript for capturing xAPI statements from H5P content.
        
        Args:
            h5p_id: H5P package ID
            
        Returns:
            JavaScript code string
        """
        return f'''
<script>
(function() {{
    // Listen for xAPI statements from H5P content via postMessage
    window.addEventListener('message', function(event) {{
        // Validate message structure
        if (!event.data || typeof event.data !== 'object') return;
        
        // Check if it's an xAPI statement
        if (event.data.statement || event.data.context === 'h5p') {{
            var statement = event.data.statement || event.data;
            
            // Send to backend
            fetch('/api/h5p/{h5p_id}/xapi/', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
                }},
                body: JSON.stringify({{ statement: statement }}),
                credentials: 'same-origin'
            }}).catch(function(err) {{
                console.error('Failed to send H5P xAPI statement:', err);
            }});
        }}
    }});
}})();
</script>
'''
    
    def process_xapi_statement(
        self,
        statement: Dict[str, Any],
        student,
        h5p_package
    ):
        """
        Process xAPI statement from H5P content.
        
        Validates the statement, stores it in the LRS, and updates
        progress/state as needed.
        
        Args:
            statement: xAPI statement dictionary from H5P
            student: User model instance
            h5p_package: H5PPackage model instance
            
        Returns:
            Stored XAPIStatement instance or None if invalid
            
        Requirements: 12.2, 12.3
        """
        from xapi.statement_store import XAPIStatementStore
        from xapi.validators import ValidationError
        from .content_models import H5PContentState, ContentInteraction
        
        # Enrich statement with actor info if not present
        statement = self._enrich_statement(statement, student, h5p_package)
        
        # Store in LRS
        store = XAPIStatementStore()
        try:
            statement_id = store.store_statement(statement)
        except ValidationError as e:
            # Log but don't fail - H5P statements may not be fully compliant
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"H5P xAPI statement validation failed: {e}")
            return None
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to store H5P xAPI statement: {e}")
            return None
        
        # Get the stored statement
        from xapi.models.statement import XAPIStatement
        xapi_statement = XAPIStatement.objects.filter(statement_id=statement_id).first()
        
        # Update H5P content state based on statement
        self._update_state_from_statement(statement, student, h5p_package)
        
        # Record content interaction
        interaction_data = {
            'verb': statement.get('verb', {}).get('id', ''),
            'statement_id': str(statement_id)
        }
        
        # Extract score if present
        result = statement.get('result', {})
        if 'score' in result:
            interaction_data['score'] = result['score']
        
        if h5p_package.lesson:
            ContentInteraction.record_interaction(
                student=student,
                lesson=h5p_package.lesson,
                data=interaction_data
            )
        
        return xapi_statement
    
    def _enrich_statement(
        self,
        statement: Dict[str, Any],
        student,
        h5p_package
    ) -> Dict[str, Any]:
        """
        Enrich xAPI statement with actor and context information.
        
        Args:
            statement: Original xAPI statement
            student: User model instance
            h5p_package: H5PPackage model instance
            
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
        
        # Add context with H5P package info
        if 'context' not in enriched:
            enriched['context'] = {}
        
        enriched['context']['extensions'] = enriched['context'].get('extensions', {})
        enriched['context']['extensions']['http://lms.local/h5p/package_id'] = h5p_package.pk
        enriched['context']['extensions']['http://lms.local/h5p/library'] = h5p_package.library_name
        
        return enriched
    
    def _update_state_from_statement(
        self,
        statement: Dict[str, Any],
        student,
        h5p_package
    ):
        """
        Update H5P content state based on xAPI statement.
        
        Args:
            statement: xAPI statement dictionary
            student: User model instance
            h5p_package: H5PPackage model instance
        """
        from .content_models import H5PContentState
        from .models import Progress
        
        # Get or create content state
        state, created = H5PContentState.objects.get_or_create(
            student=student,
            h5p_package=h5p_package
        )
        
        # Mark as started if new
        if created or state.completion_status == 'not_started':
            state.mark_started()
        
        # Increment interaction count
        state.interaction_count += 1
        
        # Extract verb
        verb_id = statement.get('verb', {}).get('id', '')
        
        # Check for completion verbs
        completion_verbs = [
            'http://adlnet.gov/expapi/verbs/completed',
            'http://adlnet.gov/expapi/verbs/passed',
            'http://adlnet.gov/expapi/verbs/mastered'
        ]
        
        if verb_id in completion_verbs:
            state.mark_completed()
            
            # Update Progress model if lesson is linked
            if h5p_package.lesson:
                progress, _ = Progress.objects.get_or_create(
                    student=student,
                    lesson=h5p_package.lesson
                )
                if not progress.completed:
                    progress.completed = True
                    progress.completed_at = timezone.now()
                    progress.save()
        
        # Extract and update score if present
        result = statement.get('result', {})
        score = result.get('score', {})
        
        if 'scaled' in score:
            # Convert scaled score (0-1) to percentage (0-100)
            state.update_score(
                score=float(score['scaled']) * 100,
                max_score=100
            )
        elif 'raw' in score:
            max_score = score.get('max', 100)
            state.update_score(
                score=float(score['raw']),
                max_score=float(max_score)
            )
        
        state.save()
    
    def save_content_state(
        self,
        student,
        h5p_package,
        state_data: Dict[str, Any]
    ):
        """
        Save student's content state for H5P content.
        
        Args:
            student: User model instance
            h5p_package: H5PPackage model instance
            state_data: State data dictionary from H5P
            
        Returns:
            H5PContentState instance
            
        Requirements: 12.4
        """
        from .content_models import H5PContentState
        
        state, created = H5PContentState.objects.get_or_create(
            student=student,
            h5p_package=h5p_package
        )
        
        # Update state data
        state.state_data = state_data
        
        # Mark as started if new
        if created or state.completion_status == 'not_started':
            state.completion_status = 'in_progress'
            state.started_at = timezone.now()
        
        state.save()
        return state
    
    def restore_content_state(
        self,
        student,
        h5p_package
    ) -> Optional[Dict[str, Any]]:
        """
        Restore student's previous state for H5P content.
        
        Args:
            student: User model instance
            h5p_package: H5PPackage model instance
            
        Returns:
            State data dictionary or None if no previous state
            
        Requirements: 12.4
        """
        from .content_models import H5PContentState
        
        try:
            state = H5PContentState.objects.get(
                student=student,
                h5p_package=h5p_package
            )
            return state.state_data if state.state_data else None
        except H5PContentState.DoesNotExist:
            return None
    
    def get_student_progress(
        self,
        student,
        h5p_package
    ) -> Dict[str, Any]:
        """
        Get student's progress for H5P content.
        
        Args:
            student: User model instance
            h5p_package: H5PPackage model instance
            
        Returns:
            Dictionary with progress information
        """
        from .content_models import H5PContentState
        
        try:
            state = H5PContentState.objects.get(
                student=student,
                h5p_package=h5p_package
            )
            
            return {
                'completion_status': state.completion_status,
                'score': float(state.score) if state.score else None,
                'max_score': float(state.max_score) if state.max_score else None,
                'score_percentage': (
                    float(state.score) / float(state.max_score) * 100
                    if state.score and state.max_score else None
                ),
                'started_at': state.started_at.isoformat() if state.started_at else None,
                'completed_at': state.completed_at.isoformat() if state.completed_at else None,
                'last_accessed': state.last_accessed.isoformat() if state.last_accessed else None,
                'interaction_count': state.interaction_count,
                'total_time_spent': state.total_time_spent
            }
        except H5PContentState.DoesNotExist:
            return {
                'completion_status': 'not_started',
                'score': None,
                'max_score': None,
                'score_percentage': None,
                'started_at': None,
                'completed_at': None,
                'last_accessed': None,
                'interaction_count': 0,
                'total_time_spent': 0
            }
    
    def delete_package(self, h5p_package) -> bool:
        """
        Delete H5P package and its extracted content.
        
        Args:
            h5p_package: H5PPackage model instance
            
        Returns:
            True if successful
        """
        # Delete extracted content directory
        if h5p_package.content_path and os.path.exists(h5p_package.content_path):
            try:
                shutil.rmtree(h5p_package.content_path)
            except Exception:
                pass
        
        # Delete package file
        if h5p_package.package_file:
            try:
                h5p_package.package_file.delete(save=False)
            except Exception:
                pass
        
        # Delete model instance
        h5p_package.delete()
        return True
    
    def create_h5p_package(
        self,
        lesson,
        h5p_file,
        uploaded_by,
        title: str = None,
        description: str = ''
    ):
        """
        Create H5P package from uploaded file.
        
        Args:
            lesson: Lesson model instance
            h5p_file: Uploaded file object
            uploaded_by: User who uploaded the package
            title: Optional title (extracted from package if not provided)
            description: Optional description
            
        Returns:
            H5PPackage model instance
            
        Requirements: 12.1
        """
        from .content_models import H5PPackage
        
        # Validate and extract package
        metadata, content_path = self.extract_package(h5p_file)
        
        # Use provided title or extracted title
        package_title = title or metadata.title
        
        # Create H5P package record
        h5p_package = H5PPackage.objects.create(
            lesson=lesson,
            title=package_title,
            description=description,
            library_name=metadata.library_name,
            library_version=metadata.library_version,
            package_file=h5p_file,
            content_path=content_path,
            h5p_json=metadata.raw_metadata,
            uploaded_by=uploaded_by
        )
        
        # Update lesson content type
        from .models import Lesson
        lesson.content_type = Lesson.CONTENT_TYPE_H5P
        lesson.save()
        
        return h5p_package
