# SCORM/xAPI Compliance Design Document

## Overview

This design document outlines the architecture and implementation strategy for adding SCORM (Sharable Content Object Reference Model) and xAPI (Experience API) compliance to the Learning Management System, along with support for multiple lesson content types. The implementation will enable the LMS to:

1. Import and deliver SCORM 1.2 and SCORM 2004 content packages
2. Track learner interactions using the SCORM runtime API
3. Function as a complete xAPI Learning Record Store (LRS)
4. Automatically generate xAPI statements for all learning activities
5. Provide analytics dashboards powered by xAPI data
6. Expose standard xAPI endpoints for external integrations
7. Support multiple lesson content types: Video, Markdown, HTML Embed (H5P), PhET simulations, and SCORM
8. Track interactions across all content types with xAPI

The design maintains backward compatibility with existing progress tracking while adding industry-standard compliance layers and expanding content type support.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SCORM Player │  │ xAPI Tracker │  │  Analytics   │      │
│  │  Component   │  │  Component   │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Django Backend Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SCORM API    │  │  xAPI LRS    │  │  Analytics   │      │
│  │  Endpoints   │  │  Endpoints   │  │  Endpoints   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SCORM Engine │  │ xAPI Engine  │  │ Sync Manager │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SCORM Models │  │  xAPI Models │  │   Existing   │      │
│  │              │  │     (LRS)    │  │    Models    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**SCORM Content Flow:**
1. Instructor uploads SCORM package → Backend validates and extracts
2. Backend parses manifest → Creates lesson entries
3. Student launches content → SCORM player initializes
4. Player communicates via SCORM API → Backend stores CMI data
5. Backend generates xAPI statements → Stored in LRS
6. Backend updates Progress models → Maintains sync

**xAPI Statement Flow:**
1. Learning activity occurs → Frontend/Backend detects event
2. xAPI statement generated → Validated against spec
3. Statement stored in LRS → Assigned UUID and timestamp
4. Related models updated → Progress, QuizAttempt, etc.
5. Analytics aggregated → Available via dashboard

## Components and Interfaces

### 1. SCORM Package Manager

**Purpose:** Handle SCORM package upload, validation, and extraction.

**Key Classes:**

```python
class ScormPackageManager:
    """Manages SCORM package lifecycle"""
    
    def validate_package(self, zip_file) -> ValidationResult:
        """Validate SCORM package structure"""
        
    def extract_manifest(self, zip_file) -> Manifest:
        """Parse imsmanifest.xml"""
        
    def extract_content(self, zip_file, destination) -> List[str]:
        """Extract content files to storage"""
        
    def create_lesson_from_sco(self, sco_data, course) -> Lesson:
        """Create lesson entry from SCO"""
```

**Interfaces:**

```python
# API Endpoint
POST /api/scorm/upload/
Content-Type: multipart/form-data
{
    "course_id": int,
    "scorm_package": file,
    "settings": {
        "completion_criteria": "status|score|time",
        "passing_score": int,
        "allow_retry": bool
    }
}

Response:
{
    "success": bool,
    "lesson_id": int,
    "scorm_version": "1.2|2004",
    "scos": [{"id": str, "title": str}]
}
```

### 2. SCORM Runtime API

**Purpose:** Implement SCORM API adapter for content communication.

**Key Classes:**

```python
class ScormAPIAdapter:
    """SCORM 1.2 and 2004 API implementation"""
    
    def initialize(self, student_id, sco_id) -> str:
        """Initialize SCORM session"""
        
    def get_value(self, element) -> str:
        """Get CMI data model value"""
        
    def set_value(self, element, value) -> str:
        """Set CMI data model value"""
        
    def commit(self) -> str:
        """Persist data to database"""
        
    def terminate(self) -> str:
        """End SCORM session"""
```

**Interfaces:**

```python
# JavaScript API (exposed to SCORM content)
window.API = {
    LMSInitialize: function(param) {},
    LMSGetValue: function(element) {},
    LMSSetValue: function(element, value) {},
    LMSCommit: function(param) {},
    LMSFinish: function(param) {},
    LMSGetLastError: function() {},
    LMSGetErrorString: function(errorCode) {},
    LMSGetDiagnostic: function(errorCode) {}
};

# Backend API Endpoints
POST /api/scorm/runtime/initialize/
POST /api/scorm/runtime/get-value/
POST /api/scorm/runtime/set-value/
POST /api/scorm/runtime/commit/
POST /api/scorm/runtime/terminate/
```

### 3. xAPI Learning Record Store (LRS)

**Purpose:** Store and retrieve xAPI statements per specification.

**Key Classes:**

```python
class XAPIStatementStore:
    """xAPI LRS implementation"""
    
    def store_statement(self, statement) -> UUID:
        """Store single statement"""
        
    def store_statements(self, statements) -> List[UUID]:
        """Store multiple statements"""
        
    def get_statement(self, statement_id) -> Statement:
        """Retrieve statement by ID"""
        
    def query_statements(self, filters) -> StatementResult:
        """Query statements with filters"""
```

**Interfaces:**

```python
# xAPI Endpoints (per specification)
POST /xapi/statements/
PUT /xapi/statements/?statementId={uuid}
GET /xapi/statements/?statementId={uuid}
GET /xapi/statements/?agent={json}&verb={iri}&activity={iri}

# Statement Format (JSON)
{
    "id": "uuid",
    "actor": {
        "objectType": "Agent",
        "name": "string",
        "mbox": "mailto:email"
    },
    "verb": {
        "id": "http://adlnet.gov/expapi/verbs/completed",
        "display": {"en-US": "completed"}
    },
    "object": {
        "objectType": "Activity",
        "id": "http://lms.example.com/course/123/lesson/456",
        "definition": {
            "name": {"en-US": "Lesson Title"},
            "type": "http://adlnet.gov/expapi/activities/lesson"
        }
    },
    "result": {
        "score": {"scaled": 0.95},
        "success": true,
        "completion": true,
        "duration": "PT1H30M"
    },
    "timestamp": "2025-12-15T10:30:00Z"
}
```

### 4. xAPI Statement Generator

**Purpose:** Automatically generate xAPI statements for learning activities.

**Key Classes:**

```python
class XAPIStatementGenerator:
    """Generate xAPI statements from learning events"""
    
    def generate_lesson_completed(self, student, lesson) -> Statement:
        """Generate statement for lesson completion"""
        
    def generate_quiz_passed(self, student, quiz, score) -> Statement:
        """Generate statement for quiz pass"""
        
    def generate_quiz_failed(self, student, quiz, score) -> Statement:
        """Generate statement for quiz fail"""
        
    def generate_course_registered(self, student, course) -> Statement:
        """Generate statement for course enrollment"""
        
    def generate_video_interaction(self, student, lesson, action, position) -> Statement:
        """Generate statement for video interaction"""
```

**Event Triggers:**

- Progress.save() with completed=True → lesson completed statement
- QuizAttempt.save() with completed_at → quiz passed/failed statement
- Enrollment.save() → course registered statement
- Video player events → video interaction statements

### 5. Analytics Engine

**Purpose:** Aggregate and analyze xAPI data for reporting.

**Key Classes:**

```python
class XAPIAnalytics:
    """Analytics powered by xAPI data"""
    
    def get_course_completion_rate(self, course_id) -> float:
        """Calculate completion rate from statements"""
        
    def get_average_quiz_scores(self, course_id) -> Dict:
        """Calculate average scores"""
        
    def get_student_activity_stream(self, student_id) -> List[Statement]:
        """Get student's learning timeline"""
        
    def get_time_spent_per_lesson(self, course_id) -> Dict:
        """Calculate time spent from duration data"""
        
    def export_statements(self, filters) -> str:
        """Export statements as JSON"""
```

**Interfaces:**

```python
# Analytics API Endpoints
GET /api/analytics/course/{course_id}/completion-rate/
GET /api/analytics/course/{course_id}/quiz-scores/
GET /api/analytics/student/{student_id}/activity-stream/
GET /api/analytics/course/{course_id}/time-spent/
GET /api/analytics/export/?course_id={id}&start_date={date}
```

### 6. Content Type Handlers

**Purpose:** Manage different lesson content types and their interactions.

**Key Classes:**

```python
class MarkdownRenderer:
    """Render and track markdown content"""
    
    def render_markdown(self, markdown_text, allow_html=False) -> str:
        """Render markdown to HTML with security"""
        
    def track_scroll_progress(self, student, lesson, percentage) -> ContentInteraction:
        """Track reading progress"""
        
    def generate_completion_statement(self, student, lesson, time_spent) -> Statement:
        """Generate xAPI statement for markdown completion"""


class HTMLEmbedHandler:
    """Handle HTML embed content (H5P, iframes)"""
    
    def generate_embed_code(self, embed_content) -> str:
        """Generate secure embed HTML"""
        
    def handle_h5p_xapi_statement(self, statement_data) -> Statement:
        """Process xAPI statements from H5P content"""
        
    def track_interaction(self, student, lesson, interaction_data) -> ContentInteraction:
        """Track embed interactions"""


class PhETHandler:
    """Handle PhET simulation content"""
    
    def generate_embed_code(self, phet_content) -> str:
        """Generate PhET embed HTML"""
        
    def track_simulation_interaction(self, student, lesson, interaction_data) -> ContentInteraction:
        """Track simulation interactions"""
        
    def check_completion_criteria(self, student, lesson) -> bool:
        """Check if completion criteria met"""
        
    def generate_interaction_statement(self, student, lesson, interaction_data) -> Statement:
        """Generate xAPI statement for simulation interaction"""


class ContentTypeRouter:
    """Route content rendering and tracking based on type"""
    
    def get_content_handler(self, content_type) -> ContentHandler:
        """Get appropriate handler for content type"""
        
    def render_content(self, lesson) -> str:
        """Render lesson content based on type"""
        
    def track_interaction(self, student, lesson, interaction_data) -> ContentInteraction:
        """Track interaction based on content type"""
```

**Interfaces:**

```python
# Content Rendering API
GET /api/lessons/{lesson_id}/content/
Response:
{
    "content_type": "markdown|html_embed|phet|scorm|video",
    "content_data": {
        # Type-specific content data
    },
    "tracking_config": {
        "track_interactions": bool,
        "completion_criteria": str
    }
}

# Interaction Tracking API
POST /api/lessons/{lesson_id}/track-interaction/
{
    "interaction_type": "viewed|scrolled|interacted|completed",
    "interaction_data": {
        # Type-specific interaction data
    }
}

# H5P xAPI Proxy
POST /api/h5p/xapi/
{
    # H5P xAPI statement
}
```

### 7. Markdown Content Manager

**Purpose:** Handle Markdown lesson creation, rendering, and tracking.

**Key Classes:**

```python
class MarkdownContentManager:
    """Manages Markdown lesson content"""
    
    def render_markdown(self, content: str) -> str:
        """Render Markdown to HTML with syntax highlighting"""
        
    def validate_markdown(self, content: str) -> ValidationResult:
        """Validate Markdown syntax"""
        
    def extract_toc(self, content: str) -> List[TocEntry]:
        """Extract table of contents from headings"""
        
    def track_completion(self, student, lesson) -> XAPIStatement:
        """Generate xAPI statement for Markdown lesson completion"""
```

**Interfaces:**

```python
# API Endpoints
POST /api/lessons/{lesson_id}/markdown/
{
    "content": "# Lesson Title\n\nContent here..."
}

GET /api/lessons/{lesson_id}/markdown/
Response:
{
    "content": "# Lesson Title...",
    "rendered_html": "<h1>Lesson Title</h1>...",
    "toc": [{"level": 1, "text": "Lesson Title", "id": "lesson-title"}]
}

POST /api/lessons/{lesson_id}/markdown/complete/
Response:
{
    "success": true,
    "xapi_statement_id": "uuid"
}
```

### 8. H5P Content Manager

**Purpose:** Handle H5P package upload, delivery, and xAPI integration.

**Key Classes:**

```python
class H5PContentManager:
    """Manages H5P interactive content"""
    
    def validate_package(self, h5p_file) -> ValidationResult:
        """Validate H5P package structure"""
        
    def extract_package(self, h5p_file, destination) -> H5PMetadata:
        """Extract H5P package and parse metadata"""
        
    def get_embed_code(self, h5p_package, student) -> str:
        """Generate embed code for H5P player"""
        
    def process_xapi_statement(self, statement, student, h5p_package) -> XAPIStatement:
        """Process xAPI statement from H5P content"""
        
    def save_content_state(self, student, h5p_package, state) -> H5PContentState:
        """Save student's content state"""
        
    def restore_content_state(self, student, h5p_package) -> dict:
        """Restore student's previous state"""
```

**Interfaces:**

```python
# API Endpoints
POST /api/h5p/upload/
Content-Type: multipart/form-data
{
    "course_id": int,
    "h5p_package": file,
    "title": str,
    "description": str
}

Response:
{
    "success": true,
    "h5p_id": int,
    "library": "H5P.InteractiveVideo",
    "version": "1.24"
}

GET /api/h5p/{h5p_id}/embed/
Response:
{
    "embed_url": "/h5p/content/{h5p_id}/",
    "width": "100%",
    "height": "600px",
    "state": {...}  # Previous state if exists
}

POST /api/h5p/{h5p_id}/xapi/
{
    "statement": {...}  # xAPI statement from H5P
}

POST /api/h5p/{h5p_id}/state/
{
    "state": {...}  # Content state to save
}
```

### 9. HTML Embed Manager

**Purpose:** Handle HTML embed configuration and xAPI message handling.

**Key Classes:**

```python
class HTMLEmbedManager:
    """Manages HTML embed content"""
    
    def create_embed(self, lesson, config) -> HTMLEmbed:
        """Create HTML embed configuration"""
        
    def generate_iframe_html(self, embed, student) -> str:
        """Generate secure iframe HTML"""
        
    def validate_xapi_message(self, message, embed) -> bool:
        """Validate xAPI message from embedded content"""
        
    def process_postmessage(self, message, student, embed) -> XAPIStatement:
        """Process postMessage xAPI statement"""
```

**Interfaces:**

```python
# API Endpoints
POST /api/lessons/{lesson_id}/html-embed/
{
    "embed_type": "url|inline",
    "external_url": "https://example.com/content",
    "inline_html": "<div>...</div>",
    "allow_scripts": true,
    "enable_xapi_messaging": true
}

GET /api/lessons/{lesson_id}/html-embed/
Response:
{
    "embed_type": "url",
    "iframe_html": "<iframe src='...' sandbox='...'>",
    "xapi_listener_script": "..."  # JS to inject for xAPI messaging
}

POST /api/lessons/{lesson_id}/html-embed/xapi/
{
    "statement": {...},  # xAPI statement from postMessage
    "origin": "https://example.com"
}
```

### 10. Synchronization Manager

**Purpose:** Keep SCORM/xAPI data synchronized with existing models.

**Key Classes:**

```python
class DataSyncManager:
    """Synchronize tracking data across systems"""
    
    def sync_scorm_to_progress(self, scorm_data) -> Progress:
        """Update Progress from SCORM data"""
        
    def sync_xapi_to_progress(self, statement) -> Progress:
        """Update Progress from xAPI statement"""
        
    def sync_xapi_to_quiz_attempt(self, statement) -> QuizAttempt:
        """Update QuizAttempt from xAPI statement"""
        
    def sync_content_interaction_to_progress(self, interaction) -> Progress:
        """Update Progress from content interaction"""
        
    def reconcile_discrepancies(self) -> List[Issue]:
        """Find and fix sync issues"""
```

## Data Models

### Lesson Content Type Models

```python
class LessonContentType(models.Model):
    """Defines available lesson content types"""
    VIDEO = 'video'
    MARKDOWN = 'markdown'
    HTML_EMBED = 'html_embed'
    PHET = 'phet'
    SCORM = 'scorm'
    
    CONTENT_TYPE_CHOICES = [
        (VIDEO, 'Video'),
        (MARKDOWN, 'Markdown Document'),
        (HTML_EMBED, 'HTML Embed (H5P)'),
        (PHET, 'PhET Simulation'),
        (SCORM, 'SCORM Package'),
    ]
    
    # Note: This is added to the existing Lesson model
    # Lesson.content_type = models.CharField(
    #     max_length=20,
    #     choices=CONTENT_TYPE_CHOICES,
    #     default=VIDEO
    # )


class MarkdownContent(models.Model):
    """Markdown lesson content"""
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='markdown_content')
    markdown_text = models.TextField(help_text="Markdown formatted content")
    rendered_html = models.TextField(blank=True, help_text="Cached rendered HTML")
    allow_html = models.BooleanField(default=False, help_text="Allow raw HTML in markdown")
    
    # Metadata
    word_count = models.IntegerField(default=0)
    estimated_reading_time = models.IntegerField(default=0, help_text="Estimated reading time in minutes")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Render markdown to HTML
        import markdown
        self.rendered_html = markdown.markdown(
            self.markdown_text,
            extensions=['extra', 'codehilite', 'toc']
        )
        # Calculate word count and reading time
        self.word_count = len(self.markdown_text.split())
        self.estimated_reading_time = max(1, self.word_count // 200)  # ~200 words per minute
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Markdown: {self.lesson.title}"


class HTMLEmbedContent(models.Model):
    """HTML embed content (H5P, iframes, etc.)"""
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='html_embed_content')
    
    # Embed types
    H5P = 'h5p'
    IFRAME = 'iframe'
    CUSTOM_HTML = 'custom_html'
    
    EMBED_TYPE_CHOICES = [
        (H5P, 'H5P Interactive Content'),
        (IFRAME, 'IFrame Embed'),
        (CUSTOM_HTML, 'Custom HTML'),
    ]
    
    embed_type = models.CharField(max_length=20, choices=EMBED_TYPE_CHOICES, default=H5P)
    
    # H5P specific
    h5p_content_id = models.CharField(max_length=255, blank=True, help_text="H5P content ID")
    h5p_embed_url = models.URLField(blank=True, help_text="H5P embed URL")
    
    # Generic embed
    embed_url = models.URLField(blank=True, help_text="URL to embed")
    embed_html = models.TextField(blank=True, help_text="Raw HTML to embed")
    
    # Settings
    width = models.CharField(max_length=20, default='100%', help_text="Width (px or %)")
    height = models.CharField(max_length=20, default='600px', help_text="Height (px or %)")
    allow_fullscreen = models.BooleanField(default=True)
    sandbox_attributes = models.CharField(
        max_length=500,
        blank=True,
        help_text="iframe sandbox attributes (space-separated)"
    )
    
    # xAPI tracking
    track_interactions = models.BooleanField(default=True, help_text="Track H5P interactions via xAPI")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"HTML Embed ({self.embed_type}): {self.lesson.title}"


class PhETContent(models.Model):
    """PhET simulation content"""
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='phet_content')
    
    # PhET simulation details
    simulation_name = models.CharField(max_length=255, help_text="PhET simulation name")
    simulation_url = models.URLField(help_text="PhET simulation URL")
    simulation_id = models.CharField(max_length=255, blank=True, help_text="PhET simulation ID")
    
    # Embed settings
    width = models.CharField(max_length=20, default='800px')
    height = models.CharField(max_length=20, default='600px')
    locale = models.CharField(max_length=10, default='en', help_text="Simulation language")
    
    # Metadata
    subject = models.CharField(max_length=100, blank=True, help_text="Subject area (Physics, Chemistry, etc.)")
    grade_level = models.CharField(max_length=100, blank=True, help_text="Recommended grade level")
    topics = models.JSONField(default=list, help_text="List of topics covered")
    
    # Tracking
    track_interactions = models.BooleanField(default=True, help_text="Track simulation interactions")
    completion_criteria = models.CharField(
        max_length=20,
        choices=[
            ('time', 'Time-based'),
            ('interaction', 'Interaction-based'),
            ('manual', 'Manual completion'),
        ],
        default='time'
    )
    required_time_minutes = models.IntegerField(default=10, help_text="Required time for time-based completion")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"PhET: {self.simulation_name}"


class ContentInteraction(models.Model):
    """Track interactions with non-video content"""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    
    # Interaction types
    VIEWED = 'viewed'
    SCROLLED = 'scrolled'
    INTERACTED = 'interacted'
    COMPLETED = 'completed'
    
    INTERACTION_TYPE_CHOICES = [
        (VIEWED, 'Viewed'),
        (SCROLLED, 'Scrolled'),
        (INTERACTED, 'Interacted'),
        (COMPLETED, 'Completed'),
    ]
    
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPE_CHOICES)
    
    # Interaction data
    interaction_data = models.JSONField(default=dict, help_text="Additional interaction data")
    # Examples:
    # - Markdown: {"scroll_percentage": 75, "time_spent": 120}
    # - H5P: {"score": 0.85, "max_score": 1.0, "interactions": 15}
    # - PhET: {"interactions": 25, "time_spent": 300, "parameters_changed": ["mass", "velocity"]}
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # xAPI statement reference
    xapi_statement = models.ForeignKey(
        'XAPIStatement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='content_interactions'
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['student', 'lesson', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.student.username} - {self.lesson.title} - {self.interaction_type}"


### SCORM Models

```python
class ScormPackage(models.Model):
    """SCORM package metadata"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='scorm_packages')
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='scorm_package', null=True)
    version = models.CharField(max_length=10, choices=[('1.2', 'SCORM 1.2'), ('2004', 'SCORM 2004')])
    identifier = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    manifest_data = models.JSONField()  # Parsed manifest
    content_path = models.CharField(max_length=500)  # Path to extracted content
    launch_url = models.CharField(max_length=500)  # Entry point URL
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # Settings
    completion_criteria = models.CharField(
        max_length=20,
        choices=[('status', 'Status'), ('score', 'Score'), ('time', 'Time')],
        default='status'
    )
    passing_score = models.IntegerField(null=True, blank=True)
    allow_retry = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.title} ({self.version})"


class ScormSCO(models.Model):
    """Sharable Content Object within a package"""
    package = models.ForeignKey(ScormPackage, on_delete=models.CASCADE, related_name='scos')
    identifier = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    launch_url = models.CharField(max_length=500)
    prerequisites = models.CharField(max_length=500, blank=True)
    max_time_allowed = models.CharField(max_length=50, blank=True)
    time_limit_action = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order']
        unique_together = ('package', 'identifier')
    
    def __str__(self):
        return f"{self.package.title} - {self.title}"


class ScormData(models.Model):
    """SCORM CMI data model storage"""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    sco = models.ForeignKey(ScormSCO, on_delete=models.CASCADE)
    
    # Core CMI elements
    lesson_status = models.CharField(
        max_length=20,
        choices=[
            ('not attempted', 'Not Attempted'),
            ('incomplete', 'Incomplete'),
            ('completed', 'Completed'),
            ('passed', 'Passed'),
            ('failed', 'Failed'),
            ('browsed', 'Browsed')
        ],
        default='not attempted'
    )
    lesson_location = models.CharField(max_length=255, blank=True)  # Bookmark
    suspend_data = models.TextField(blank=True)  # State data
    score_raw = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    score_min = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    score_max = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    session_time = models.CharField(max_length=50, blank=True)
    total_time = models.CharField(max_length=50, blank=True)
    
    # Additional data
    entry = models.CharField(max_length=20, blank=True)  # ab-initio, resume, ""
    exit = models.CharField(max_length=20, blank=True)  # time-out, suspend, logout, ""
    credit = models.CharField(max_length=20, default='credit')
    mode = models.CharField(max_length=20, default='normal')
    
    # Full CMI data as JSON for flexibility
    cmi_data = models.JSONField(default=dict)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('student', 'sco')
        ordering = ['-last_accessed']
    
    def __str__(self):
        return f"{self.student.username} - {self.sco.title} ({self.lesson_status})"
```

### xAPI Models

```python
class XAPIStatement(models.Model):
    """xAPI statement storage (LRS)"""
    # Statement ID
    statement_id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    
    # Actor (who)
    actor_type = models.CharField(max_length=20, default='Agent')
    actor_name = models.CharField(max_length=255)
    actor_mbox = models.EmailField(null=True, blank=True)
    actor_account_name = models.CharField(max_length=255, null=True, blank=True)
    actor_account_homepage = models.URLField(null=True, blank=True)
    actor_json = models.JSONField()  # Full actor object
    
    # Verb (did)
    verb_id = models.URLField()  # IRI
    verb_display = models.JSONField()  # Language map
    
    # Object (what)
    object_type = models.CharField(max_length=20, default='Activity')
    object_id = models.URLField()  # Activity IRI
    object_json = models.JSONField()  # Full object
    
    # Result (optional)
    result_score_scaled = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    result_score_raw = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    result_score_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    result_score_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    result_success = models.BooleanField(null=True, blank=True)
    result_completion = models.BooleanField(null=True, blank=True)
    result_duration = models.CharField(max_length=50, blank=True)  # ISO 8601 duration
    result_json = models.JSONField(null=True, blank=True)  # Full result
    
    # Context (optional)
    context_json = models.JSONField(null=True, blank=True)
    
    # Timestamp
    timestamp = models.DateTimeField()
    stored = models.DateTimeField(auto_now_add=True)
    
    # Authority (who recorded it)
    authority_json = models.JSONField(null=True, blank=True)
    
    # Full statement as JSON
    statement_json = models.JSONField()
    
    # Voided flag
    voided = models.BooleanField(default=False)
    
    # Relations to existing models (for sync)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, null=True, blank=True)
    quiz = models.ForeignKey('quizzes.Quiz', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['actor_mbox', 'timestamp']),
            models.Index(fields=['verb_id', 'timestamp']),
            models.Index(fields=['object_id', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.actor_name} {self.verb_display.get('en-US', 'interacted')} {self.object_id}"


class XAPIVerb(models.Model):
    """Registry of xAPI verbs used in the system"""
    iri = models.URLField(unique=True)
    display = models.JSONField()  # Language map
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['iri']
    
    def __str__(self):
        return self.display.get('en-US', self.iri)


class XAPIActivityType(models.Model):
    """Registry of xAPI activity types"""
    iri = models.URLField(unique=True)
    display = models.JSONField()
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['iri']
    
    def __str__(self):
        return self.display.get('en-US', self.iri)


class XAPIAttachment(models.Model):
    """xAPI statement attachments"""
    statement = models.ForeignKey(XAPIStatement, on_delete=models.CASCADE, related_name='attachments')
    usage_type = models.URLField()
    display = models.JSONField()
    content_type = models.CharField(max_length=255)
    length = models.IntegerField()
    sha2 = models.CharField(max_length=64)
    file_url = models.URLField(null=True, blank=True)
    file_data = models.BinaryField(null=True, blank=True)
    
    def __str__(self):
        return f"Attachment for {self.statement.statement_id}"
```

### Content Type Models

```python
class LessonContentType(models.TextChoices):
    """Supported lesson content types"""
    VIDEO = 'video', 'Video'
    MARKDOWN = 'markdown', 'Markdown'
    SCORM = 'scorm', 'SCORM Package'
    H5P = 'h5p', 'H5P Interactive'
    HTML_EMBED = 'html_embed', 'HTML Embed'


class MarkdownLesson(models.Model):
    """Markdown content for lessons"""
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='markdown_content')
    content = models.TextField(help_text="Markdown content")
    rendered_html = models.TextField(blank=True, help_text="Cached rendered HTML")
    enable_syntax_highlighting = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Render markdown to HTML on save
        import markdown
        self.rendered_html = markdown.markdown(
            self.content,
            extensions=['fenced_code', 'codehilite', 'tables', 'toc']
        )
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Markdown: {self.lesson.title}"


class H5PPackage(models.Model):
    """H5P interactive content package"""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='h5p_packages')
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='h5p_content', null=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    package_file = models.FileField(upload_to='h5p_packages/')
    content_path = models.CharField(max_length=500, blank=True)  # Extracted content path
    library_name = models.CharField(max_length=255, blank=True)  # Main library (e.g., H5P.InteractiveVideo)
    library_version = models.CharField(max_length=50, blank=True)
    metadata = models.JSONField(default=dict)  # H5P metadata from h5p.json
    
    # Settings
    embed_type = models.CharField(max_length=20, default='iframe')
    track_interactions = models.BooleanField(default=True)
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'H5P Package'
        verbose_name_plural = 'H5P Packages'
    
    def __str__(self):
        return f"{self.title} ({self.library_name})"


class H5PContentState(models.Model):
    """Student state for H5P content"""
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    h5p_package = models.ForeignKey(H5PPackage, on_delete=models.CASCADE)
    state_data = models.JSONField(default=dict)  # Content state
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    max_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('student', 'h5p_package')
    
    def __str__(self):
        return f"{self.student.username} - {self.h5p_package.title}"


class HTMLEmbed(models.Model):
    """HTML embed configuration for lessons"""
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='html_embed')
    
    # Content source
    EMBED_TYPE_CHOICES = [
        ('url', 'External URL'),
        ('inline', 'Inline HTML'),
    ]
    embed_type = models.CharField(max_length=10, choices=EMBED_TYPE_CHOICES, default='url')
    external_url = models.URLField(blank=True, null=True, help_text="URL to embed in iframe")
    inline_html = models.TextField(blank=True, help_text="Inline HTML content")
    
    # Iframe settings
    width = models.CharField(max_length=20, default='100%')
    height = models.CharField(max_length=20, default='600px')
    
    # Sandbox permissions (security)
    allow_scripts = models.BooleanField(default=True)
    allow_same_origin = models.BooleanField(default=False)
    allow_forms = models.BooleanField(default=True)
    allow_popups = models.BooleanField(default=False)
    
    # xAPI integration
    enable_xapi_messaging = models.BooleanField(default=True, help_text="Listen for xAPI statements via postMessage")
    allowed_origins = models.TextField(blank=True, help_text="Comma-separated list of allowed origins for postMessage")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def get_sandbox_attributes(self):
        """Generate sandbox attribute string"""
        attrs = []
        if self.allow_scripts:
            attrs.append('allow-scripts')
        if self.allow_same_origin:
            attrs.append('allow-same-origin')
        if self.allow_forms:
            attrs.append('allow-forms')
        if self.allow_popups:
            attrs.append('allow-popups')
        return ' '.join(attrs)
    
    def __str__(self):
        return f"HTML Embed: {self.lesson.title}"
```

### Configuration Model

```python
class XAPIConfiguration(models.Model):
    """xAPI/SCORM system configuration"""
    # LRS Settings
    lrs_endpoint = models.URLField(default='http://localhost:8000/xapi/')
    lrs_auth_enabled = models.BooleanField(default=True)
    lrs_basic_auth_enabled = models.BooleanField(default=True)
    lrs_oauth_enabled = models.BooleanField(default=False)
    
    # Statement Generation
    auto_generate_statements = models.BooleanField(default=True)
    track_video_interactions = models.BooleanField(default=True)
    track_quiz_attempts = models.BooleanField(default=True)
    track_lesson_completions = models.BooleanField(default=True)
    track_course_enrollments = models.BooleanField(default=True)
    
    # Privacy Settings
    use_pseudonymous_actors = models.BooleanField(default=False)
    include_pii_in_statements = models.BooleanField(default=True)
    allow_student_data_export = models.BooleanField(default=True)
    allow_student_data_deletion = models.BooleanField(default=True)
    
    # SCORM Settings
    scorm_12_enabled = models.BooleanField(default=True)
    scorm_2004_enabled = models.BooleanField(default=True)
    max_package_size_mb = models.IntegerField(default=100)
    
    # Singleton pattern
    class Meta:
        verbose_name = 'xAPI Configuration'
        verbose_name_plural = 'xAPI Configuration'
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SCORM package validation consistency
*For any* SCORM package file, the validation function should either accept it and successfully extract the manifest, or reject it with a specific error message describing the validation failure.
**Validates: Requirements 1.1, 1.4**

### Property 2: Manifest parsing completeness
*For any* valid SCORM manifest XML, parsing should extract all required metadata fields (title, description, organization structure) and the extracted data should match the source manifest content.
**Validates: Requirements 1.2**

### Property 3: SCORM upload creates lesson
*For any* successfully uploaded SCORM package, a corresponding Lesson entry should exist in the database with correct associations to the course and package metadata.
**Validates: Requirements 1.3**

### Property 4: SCORM version support
*For any* valid SCORM package of version 1.2 or 2004, the system should successfully process and store the package regardless of version.
**Validates: Requirements 1.5**

### Property 5: SCORM API initialization
*For any* student and SCORM content combination, launching the content should initialize the SCORM API adapter with the correct student and SCO identifiers.
**Validates: Requirements 2.1**

### Property 6: CMI data round-trip
*For any* CMI data model value set through the SCORM API, retrieving that value should return the exact same data that was stored.
**Validates: Requirements 2.2**

### Property 7: SCORM completion synchronization
*For any* SCORM content that reports completion status, the corresponding Progress model should be updated to reflect completion with matching timestamp.
**Validates: Requirements 2.3, 8.1**

### Property 8: SCORM score persistence
*For any* score reported by SCORM content, the score should be stored in ScormData and be retrievable for that student-SCO combination.
**Validates: Requirements 2.4**

### Property 9: SCORM session data persistence
*For any* SCORM session, all CMI data modified during the session should persist to the database after the session terminates.
**Validates: Requirements 2.5**

### Property 10: xAPI statement validation
*For any* xAPI statement submitted to the LRS, the system should validate it against the xAPI specification and either accept valid statements or reject invalid ones with specific error details.
**Validates: Requirements 3.2**

### Property 11: xAPI statement storage uniqueness
*For any* valid xAPI statement stored in the LRS, it should be assigned a unique UUID identifier and a timestamp, and be retrievable by that identifier.
**Validates: Requirements 3.3**

### Property 12: xAPI authentication enforcement
*For any* xAPI endpoint request without valid authentication credentials, the system should return a 401 Unauthorized response.
**Validates: Requirements 3.4**

### Property 13: xAPI query filtering correctness
*For any* set of stored xAPI statements and any valid query parameters (agent, verb, activity, since, until), the query should return exactly the statements matching all specified filters.
**Validates: Requirements 3.5, 6.2**

### Property 14: Lesson completion statement generation
*For any* lesson marked as completed by a student, an xAPI statement should be generated with verb "http://adlnet.gov/expapi/verbs/completed" and the correct actor and object identifiers.
**Validates: Requirements 4.1**

### Property 15: Quiz pass statement generation
*For any* quiz attempt where the student's score meets or exceeds the passing score, an xAPI statement should be generated with verb "http://adlnet.gov/expapi/verbs/passed" and include the score in the result.
**Validates: Requirements 4.2**

### Property 16: Quiz fail statement generation
*For any* quiz attempt where the student's score is below the passing score, an xAPI statement should be generated with verb "http://adlnet.gov/expapi/verbs/failed" and include the score in the result.
**Validates: Requirements 4.3**

### Property 17: Enrollment statement generation
*For any* new course enrollment, an xAPI statement should be generated with verb "http://adlnet.gov/expapi/verbs/registered" linking the student to the course.
**Validates: Requirements 4.4**

### Property 18: Video interaction statement generation
*For any* video player interaction (play, pause, seek, complete), an xAPI statement should be generated with the appropriate verb and include the video position in the result.
**Validates: Requirements 4.5**

### Property 19: Activity aggregation correctness
*For any* set of xAPI statements for a course, aggregating by verb type should produce counts that sum to the total number of statements for that course.
**Validates: Requirements 5.4**

### Property 20: xAPI export completeness
*For any* set of xAPI statements exported to JSON, the exported data should be valid JSON and contain all statement fields from the database.
**Validates: Requirements 5.5**

### Property 21: xAPI POST statement acceptance
*For any* valid xAPI statement or array of statements submitted via POST, the system should store all statements and return 200 OK with statement IDs.
**Validates: Requirements 6.3**

### Property 22: HTTP status code correctness
*For any* xAPI API request, the response status code should match the request outcome: 200 for success, 400 for invalid data, 401 for unauthorized, 404 for not found.
**Validates: Requirements 6.4**

### Property 23: SCORM configuration persistence
*For any* SCORM lesson configuration (completion criteria, passing score, retry settings), the configuration should be saved and applied when students interact with the content.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 24: xAPI to Progress synchronization
*For any* xAPI statement indicating lesson completion, the corresponding Progress record should be created or updated to reflect completion.
**Validates: Requirements 8.2**

### Property 25: xAPI to QuizAttempt synchronization
*For any* xAPI statement indicating quiz completion, the corresponding QuizAttempt record should be updated with the score and completion status from the statement.
**Validates: Requirements 8.3**

### Property 26: Progress calculation consistency
*For any* course, the progress percentage calculated from xAPI statements should equal the progress percentage calculated from the Progress model.
**Validates: Requirements 8.4**

### Property 27: Synchronization error logging
*For any* synchronization operation that fails, an error log entry should be created containing details of the failure.
**Validates: Requirements 8.5**

### Property 28: SCORM state restoration
*For any* SCORM content session that saves CMI data, relaunching the content should restore all previously saved CMI values exactly.
**Validates: Requirements 9.1, 9.2**

### Property 29: SCORM bookmark retrieval
*For any* saved lesson location (bookmark), requesting the bookmark should return the exact location value that was saved.
**Validates: Requirements 9.3**

### Property 30: SCORM state isolation
*For any* two different student-lesson combinations, modifying the SCORM state for one should not affect the state of the other.
**Validates: Requirements 9.4**

### Property 31: SCORM state reset completeness
*For any* SCORM content state, after a reset operation, all CMI data fields should return to their initial default values.
**Validates: Requirements 9.5**

### Property 32: Privacy mode pseudonymization
*For any* xAPI statement generated when privacy mode is enabled, the actor field should contain a pseudonymous identifier and not contain the student's real name or email.
**Validates: Requirements 10.2**

### Property 33: Student data export completeness
*For any* student requesting their xAPI data, the export should contain all and only the statements where that student is the actor.
**Validates: Requirements 10.3**

### Property 34: Student data deletion completeness
*For any* student requesting data deletion, after the operation completes, no xAPI statements should remain in the database where that student is the actor.
**Validates: Requirements 10.4**

### Property 35: xAPI access audit logging
*For any* access to xAPI data (read or write), an audit log entry should be created containing the timestamp, user, and operation type.
**Validates: Requirements 10.5**

### Property 36: Markdown rendering correctness
*For any* valid Markdown text, rendering should produce valid HTML that preserves the semantic structure of the markdown.
**Validates: Requirements 11.1**

### Property 37: Markdown scroll tracking
*For any* Markdown lesson viewed by a student, scroll progress and reading time should be tracked and stored.
**Validates: Requirements 11.3**

### Property 38: Markdown completion statement generation
*For any* Markdown lesson completed by a student, an xAPI statement should be generated with verb "http://adlnet.gov/expapi/verbs/completed".
**Validates: Requirements 11.4**

### Property 39: Reading time calculation
*For any* Markdown content, the estimated reading time should be proportional to word count (approximately 200 words per minute).
**Validates: Requirements 11.5**

### Property 40: H5P embed security
*For any* H5P content embedded, the iframe should include appropriate sandbox attributes to prevent security vulnerabilities.
**Validates: Requirements 12.1**

### Property 41: H5P xAPI statement capture
*For any* xAPI statement generated by H5P content, the statement should be captured and stored in the LRS.
**Validates: Requirements 12.2**

### Property 42: H5P completion synchronization
*For any* H5P content completion statement, the corresponding Progress record should be updated to reflect completion.
**Validates: Requirements 12.3**

### Property 43: H5P external provider support
*For any* valid H5P embed URL from an external provider, the content should be successfully embedded and functional.
**Validates: Requirements 12.4**

### Property 44: H5P score capture
*For any* H5P xAPI statement containing a score, the score should be stored and retrievable in analytics.
**Validates: Requirements 12.5**

### Property 45: PhET embed configuration
*For any* PhET simulation with configured dimensions, the embed should render with those exact dimensions.
**Validates: Requirements 13.1**

### Property 46: PhET interaction tracking
*For any* PhET simulation interaction by a student, an interaction record should be created and stored.
**Validates: Requirements 13.2**

### Property 47: PhET completion criteria evaluation
*For any* PhET simulation with completion criteria (time-based or interaction-based), completion should be determined correctly based on the configured criteria.
**Validates: Requirements 13.3**

### Property 48: PhET completion statement generation
*For any* PhET simulation completion, an xAPI statement should be generated with verb "http://adlnet.gov/expapi/verbs/completed".
**Validates: Requirements 13.4**

### Property 49: PhET metadata availability
*For any* PhET simulation, metadata (subject, grade level, topics) should be stored and retrievable.
**Validates: Requirements 13.5**

### Property 50: HTML sanitization security
*For any* HTML embed content including potentially malicious code, sanitization should remove all security threats while preserving safe content.
**Validates: Requirements 14.1**

### Property 51: Iframe sandbox configuration
*For any* iframe embed with sandbox attributes, the generated iframe should include exactly those attributes.
**Validates: Requirements 14.2**

### Property 52: Embed view tracking
*For any* HTML embed viewed by a student, a view event should be tracked and stored.
**Validates: Requirements 14.3**

### Property 53: Embed dimension configuration
*For any* HTML embed with configured width and height, the embed should render with those exact dimensions.
**Validates: Requirements 14.4**

### Property 54: Embed xAPI statement capture
*For any* xAPI statement generated by embedded content, the statement should be captured and stored in the LRS.
**Validates: Requirements 14.5**

### Property 55: Universal lesson completion tracking
*For any* lesson of any content type (video, markdown, HTML embed, PhET, SCORM), completion status should be trackable and stored.
**Validates: Requirements 15.1**

### Property 56: Multi-type progress calculation
*For any* course containing lessons of multiple content types, the progress percentage should include all lesson types in the calculation.
**Validates: Requirements 15.2**

### Property 57: Lesson type identification
*For any* lesson, the correct content type icon should be displayed to identify the lesson type.
**Validates: Requirements 15.3**

### Property 58: Multi-type interaction data retrieval
*For any* student and lesson combination, time spent and interaction data should be retrievable regardless of lesson type.
**Validates: Requirements 15.4**

### Property 59: Cross-type xAPI statement consistency
*For any* lesson completion regardless of content type, the generated xAPI statement should follow a consistent structure with the same core fields (actor, verb, object, result).
**Validates: Requirements 15.5**

## Error Handling

### SCORM Error Handling

**Package Upload Errors:**
- Invalid ZIP structure → Return 400 with "Invalid package structure" message
- Missing manifest → Return 400 with "imsmanifest.xml not found" message
- Invalid manifest XML → Return 400 with XML parsing error details
- Unsupported SCORM version → Return 400 with "Unsupported SCORM version" message
- Package too large → Return 413 with size limit message
- Storage failure → Return 500 with "Failed to store package" message

**Runtime API Errors:**
- Invalid CMI element → Return error code 401 (Not Implemented)
- Invalid CMI value → Return error code 405 (Incorrect Data Type)
- Element not initialized → Return error code 301 (Not Initialized)
- Element read-only → Return error code 403 (Element Is Read Only)
- Element write-only → Return error code 404 (Element Is Write Only)
- Database failure → Return error code 101 (General Exception)

**Session Errors:**
- Session expired → Restore last saved state, log warning
- Concurrent sessions → Use most recent data, log conflict
- Data corruption → Attempt recovery from backup, notify admin

### xAPI Error Handling

**Statement Validation Errors:**
- Missing required fields → Return 400 with field list
- Invalid IRI format → Return 400 with IRI validation error
- Invalid timestamp format → Return 400 with ISO 8601 format requirement
- Invalid score values → Return 400 with valid range information
- Statement too large → Return 413 with size limit

**Authentication Errors:**
- Missing credentials → Return 401 with WWW-Authenticate header
- Invalid credentials → Return 401 with "Invalid credentials" message
- Expired token → Return 401 with "Token expired" message
- Insufficient permissions → Return 403 with "Forbidden" message

**Query Errors:**
- Invalid query parameters → Return 400 with parameter validation errors
- Malformed agent JSON → Return 400 with JSON parsing error
- Invalid date format → Return 400 with ISO 8601 requirement
- Query timeout → Return 504 with "Query timeout" message

**Storage Errors:**
- Duplicate statement ID → Return 409 with "Statement ID already exists"
- Database connection failure → Return 503 with "Service temporarily unavailable"
- Storage quota exceeded → Return 507 with "Insufficient storage"

### Synchronization Error Handling

**Data Sync Errors:**
- Progress update failure → Log error, queue for retry, continue processing
- QuizAttempt update failure → Log error, queue for retry, continue processing
- Inconsistent data detected → Log warning, create reconciliation task
- Foreign key violation → Log error, attempt to create missing records

**Recovery Strategies:**
- Retry failed operations with exponential backoff
- Maintain sync queue for failed operations
- Run periodic reconciliation job to fix inconsistencies
- Alert administrators for persistent failures

## Testing Strategy

### Unit Testing

**SCORM Components:**
- Test manifest parser with various valid and invalid manifests
- Test CMI data model getters and setters
- Test SCORM API error code generation
- Test package validation logic
- Test content extraction and storage

**xAPI Components:**
- Test statement validation against xAPI spec
- Test statement serialization/deserialization
- Test query parameter parsing
- Test authentication mechanisms
- Test statement generator for each event type

**Synchronization:**
- Test Progress update from SCORM data
- Test Progress update from xAPI statements
- Test QuizAttempt update from xAPI statements
- Test reconciliation logic

### Property-Based Testing

The system will use **Hypothesis** (Python) for property-based testing. Each property-based test will run a minimum of 100 iterations with randomly generated inputs.

**Test Configuration:**
All property-based tests MUST include the following Hypothesis settings to prevent infinite test loops:
```python
@settings(max_examples=100, deadline=None)
```

- `max_examples=100`: Limits the number of test iterations to 100
- `deadline=None`: Disables per-test-case timeout (prevents false failures on slow systems)

**Alternative Configuration for Faster Tests:**
For tests that should complete quickly, use a deadline:
```python
@settings(max_examples=100, deadline=5000)  # 5 second timeout per example
```

**CRITICAL:** Never run property-based tests without explicit `@settings` decorator. This prevents:
- Infinite test loops from complex generators
- Excessive test execution time
- Resource exhaustion on CI/CD systems

**SCORM Property Tests:**
- Generate random valid SCORM packages and verify successful processing
- Generate random CMI data and verify round-trip consistency
- Generate random student-SCO combinations and verify state isolation
- Generate random session data and verify persistence

**xAPI Property Tests:**
- Generate random valid xAPI statements and verify storage and retrieval
- Generate random query parameters and verify filtering correctness
- Generate random learning events and verify statement generation
- Generate random statement sets and verify aggregation calculations

**Synchronization Property Tests:**
- Generate random SCORM completions and verify Progress updates
- Generate random xAPI statements and verify model synchronization
- Generate random course data and verify progress calculation consistency

**Test Tagging:**
Each property-based test will include a comment tag in this format:
```python
# Feature: scorm-xapi-compliance, Property X: [property description]
```

**Example Test Structure:**
```python
from hypothesis import given, strategies as st, settings

class TestXAPIValidation:
    @given(valid_xapi_statement())
    @settings(max_examples=100, deadline=None)  # REQUIRED
    def test_valid_statements_accepted(self, statement):
        """Property: All valid statements should be accepted"""
        validator = XAPIStatementValidator()
        is_valid, error = validator.validate(statement)
        assert is_valid
```

### Integration Testing

**End-to-End SCORM Flow:**
1. Upload SCORM package
2. Launch content as student
3. Interact with content (set CMI values)
4. Complete content
5. Verify Progress updated
6. Verify xAPI statements generated
7. Relaunch and verify state restored

**End-to-End xAPI Flow:**
1. Enroll student in course
2. Complete lesson
3. Take quiz
4. Verify all xAPI statements generated
5. Query statements via API
6. Verify analytics calculations
7. Export statements and verify completeness

**Synchronization Testing:**
1. Create learning activities via multiple paths
2. Verify all tracking systems updated
3. Verify progress calculations match
4. Simulate failures and verify recovery

### Performance Testing

**SCORM Performance:**
- Package upload time for various sizes (10MB, 50MB, 100MB)
- CMI data retrieval latency (target: <100ms)
- Concurrent session handling (target: 100 concurrent users)

**xAPI Performance:**
- Statement storage throughput (target: 1000 statements/second)
- Query response time with large datasets (target: <500ms for 100k statements)
- Bulk statement submission (target: 100 statements in single request)

**Synchronization Performance:**
- Sync operation latency (target: <200ms)
- Reconciliation job completion time (target: <5 minutes for 10k records)

## Security Considerations

### Authentication and Authorization

**xAPI Endpoints:**
- Require authentication for all statement submission
- Support HTTP Basic Auth and OAuth 2.0
- Implement rate limiting (100 requests/minute per user)
- Validate API keys and tokens

**SCORM Content:**
- Verify student enrollment before allowing content access
- Validate session tokens for API calls
- Prevent cross-student data access
- Sanitize all user inputs

### Data Privacy

**PII Protection:**
- Configurable pseudonymization for xAPI actors
- Encrypt sensitive data at rest
- Implement data retention policies
- Support GDPR right to erasure

**Access Control:**
- Students can only access their own data
- Instructors can only access their course data
- Administrators have full access with audit logging
- Implement row-level security for xAPI statements

### Content Security

**SCORM Packages:**
- Scan uploaded packages for malware
- Sanitize HTML content to prevent XSS
- Restrict file types in packages
- Implement content security policy headers

**xAPI Statements:**
- Validate all IRIs to prevent injection
- Limit statement size to prevent DoS
- Sanitize JSON to prevent injection attacks
- Implement CORS restrictions

## Deployment Considerations

### Database Migrations

**New Tables:**
- ScormPackage, ScormSCO, ScormData
- XAPIStatement, XAPIVerb, XAPIActivityType, XAPIAttachment
- XAPIConfiguration

**Indexes:**
- Add indexes on xAPI query fields (actor_mbox, verb_id, object_id, timestamp)
- Add indexes on ScormData (student, sco, last_accessed)
- Add composite indexes for common queries

**Data Migration:**
- No migration of existing data required
- Optionally backfill xAPI statements for historical Progress records

### Storage Requirements

**SCORM Content:**
- Estimate: 50MB average per package
- Storage location: Media storage (S3 or local filesystem)
- Retention: Indefinite or per course settings

**xAPI Statements:**
- Estimate: 1KB average per statement
- Growth rate: ~100 statements per student per course
- Retention: Configurable (default: 7 years for compliance)

### Configuration

**Environment Variables:**
```
SCORM_STORAGE_PATH=/path/to/scorm/content
SCORM_MAX_PACKAGE_SIZE_MB=100
XAPI_LRS_ENDPOINT=http://localhost:8000/xapi/
XAPI_AUTH_ENABLED=true
XAPI_STATEMENT_RETENTION_DAYS=2555  # 7 years
XAPI_AUTO_GENERATE_STATEMENTS=true
```

**Django Settings:**
```python
INSTALLED_APPS += ['scorm', 'xapi']

SCORM_SETTINGS = {
    'STORAGE_PATH': env('SCORM_STORAGE_PATH'),
    'MAX_PACKAGE_SIZE_MB': env.int('SCORM_MAX_PACKAGE_SIZE_MB', 100),
    'SUPPORTED_VERSIONS': ['1.2', '2004'],
}

XAPI_SETTINGS = {
    'LRS_ENDPOINT': env('XAPI_LRS_ENDPOINT'),
    'AUTH_ENABLED': env.bool('XAPI_AUTH_ENABLED', True),
    'AUTO_GENERATE': env.bool('XAPI_AUTO_GENERATE_STATEMENTS', True),
    'RETENTION_DAYS': env.int('XAPI_STATEMENT_RETENTION_DAYS', 2555),
}
```

### Monitoring and Logging

**Metrics to Track:**
- SCORM package upload success/failure rate
- xAPI statement ingestion rate
- Synchronization lag time
- API response times
- Storage usage

**Logging:**
- Log all SCORM API errors with context
- Log all xAPI validation failures
- Log all synchronization failures
- Log all authentication failures
- Implement structured logging for analysis

### Backup and Recovery

**Data Backup:**
- Include SCORM content in media backups
- Include xAPI statements in database backups
- Backup frequency: Daily incremental, weekly full

**Recovery Procedures:**
- SCORM content: Restore from media backup
- xAPI statements: Restore from database backup
- Synchronization: Run reconciliation job after restore

## Dependencies

### Python Packages

```
# SCORM
lxml>=4.9.0  # XML parsing
zipfile36>=0.1.3  # ZIP handling

# xAPI
jsonschema>=4.17.0  # JSON validation
python-dateutil>=2.8.2  # Date parsing
uuid>=1.30  # UUID generation

# Markdown
markdown>=3.4.0  # Markdown rendering
pymdown-extensions>=10.0  # Extended markdown features
bleach>=6.0.0  # HTML sanitization

# Content handling
beautifulsoup4>=4.12.0  # HTML parsing
html5lib>=1.1  # HTML5 parsing

# Testing
hypothesis>=6.82.0  # Property-based testing
pytest>=7.3.0  # Test framework
pytest-django>=4.5.2  # Django testing
factory-boy>=3.2.1  # Test data generation
```

### Frontend Packages

```json
{
  "dependencies": {
    "scorm-again": "^1.7.0",
    "@xapi/xapi": "^2.0.0",
    "video.js": "^8.0.0",
    "chart.js": "^4.0.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "dompurify": "^3.0.0",
    "marked": "^11.0.0"
  }
}
```

### External Services

**Optional:**
- External LRS (e.g., Learning Locker) for advanced analytics
- CDN for SCORM content delivery
- Object storage (S3) for scalable content storage

## Future Enhancements

### Phase 2 Features

- **SCORM 2004 4th Edition:** Full support for sequencing and navigation
- **cmi5 Support:** Implement cmi5 specification (xAPI + SCORM successor)
- **Advanced Analytics:** Machine learning-powered insights
- **Content Authoring:** Built-in SCORM content creation tools
- **Mobile Offline:** Offline SCORM content with sync

### Phase 3 Features

- **LTI Integration:** Learning Tools Interoperability support
- **Badging:** Open Badges integration with xAPI
- **Social Learning:** xAPI statements for collaborative activities
- **Adaptive Learning:** Use xAPI data for personalized paths
- **Multi-tenancy:** Separate LRS per organization

## Glossary

- **CMI**: Computer Managed Instruction - SCORM data model
- **IRI**: Internationalized Resource Identifier - xAPI identifier format
- **LRS**: Learning Record Store - xAPI statement repository
- **Manifest**: imsmanifest.xml file describing SCORM package
- **SCO**: Sharable Content Object - launchable SCORM content unit
- **Statement**: xAPI data structure (Actor-Verb-Object)
- **Verb**: Action in xAPI statement (e.g., completed, passed)
