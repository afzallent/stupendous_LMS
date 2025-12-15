# SCORM/xAPI Compliance Design Document

## Overview

This design document outlines the architecture and implementation strategy for adding SCORM (Sharable Content Object Reference Model) and xAPI (Experience API) compliance to the Learning Management System. The implementation will enable the LMS to:

1. Import and deliver SCORM 1.2 and SCORM 2004 content packages
2. Track learner interactions using the SCORM runtime API
3. Function as a complete xAPI Learning Record Store (LRS)
4. Automatically generate xAPI statements for all learning activities
5. Provide analytics dashboards powered by xAPI data
6. Expose standard xAPI endpoints for external integrations

The design maintains backward compatibility with existing progress tracking while adding industry-standard compliance layers.

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

### 6. Synchronization Manager

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
        
    def reconcile_discrepancies(self) -> List[Issue]:
        """Find and fix sync issues"""
```

## Data Models

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

