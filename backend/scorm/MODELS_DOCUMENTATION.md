# SCORM Models Documentation

## Overview

This document describes the SCORM data models implemented for the LMS. These models support SCORM 1.2 and SCORM 2004 standards for tracking learner interactions with SCORM content packages.

## Models

### ScormPackage

Stores metadata and configuration for uploaded SCORM packages.

**Fields:**
- `course` (ForeignKey): Course this package belongs to
- `lesson` (OneToOneField): Associated lesson (optional)
- `version` (CharField): SCORM version ('1.2' or '2004')
- `identifier` (CharField): Unique identifier from manifest
- `title` (CharField): Package title
- `description` (TextField): Package description
- `manifest_data` (JSONField): Parsed imsmanifest.xml data
- `content_path` (CharField): Path to extracted content files
- `launch_url` (CharField): Entry point URL
- `uploaded_at` (DateTimeField): Upload timestamp
- `uploaded_by` (ForeignKey): User who uploaded the package
- `completion_criteria` (CharField): Completion criteria ('status', 'score', or 'time')
- `passing_score` (IntegerField): Minimum passing score (optional)
- `allow_retry` (BooleanField): Allow students to retry

**Relationships:**
- One-to-many with Course
- One-to-one with Lesson
- One-to-many with ScormSCO
- Many-to-one with User (uploaded_by)

### ScormSCO

Represents a Sharable Content Object within a SCORM package.

**Fields:**
- `package` (ForeignKey): Parent SCORM package
- `identifier` (CharField): SCO identifier from manifest
- `title` (CharField): SCO title
- `launch_url` (CharField): URL to launch this SCO
- `prerequisites` (CharField): Prerequisites for accessing this SCO
- `max_time_allowed` (CharField): Maximum time allowed
- `time_limit_action` (CharField): Action when time limit is reached
- `order` (IntegerField): Display order within package

**Relationships:**
- Many-to-one with ScormPackage
- One-to-many with ScormData

**Constraints:**
- Unique together: (package, identifier)
- Ordered by: order

### ScormData

Stores CMI (Computer Managed Instruction) data for learner interactions.

**Fields:**
- `student` (ForeignKey): Student whose data this is
- `sco` (ForeignKey): Associated SCO
- `lesson_status` (CharField): Current status ('not attempted', 'incomplete', 'completed', 'passed', 'failed', 'browsed')
- `lesson_location` (CharField): Bookmark location
- `suspend_data` (TextField): Suspend data for resuming
- `score_raw` (DecimalField): Raw score
- `score_min` (DecimalField): Minimum possible score
- `score_max` (DecimalField): Maximum possible score
- `session_time` (CharField): Time spent in current session
- `total_time` (CharField): Total time across all sessions
- `entry` (CharField): Entry mode ('ab-initio', 'resume', or empty)
- `exit` (CharField): Exit mode ('time-out', 'suspend', 'logout', or empty)
- `credit` (CharField): Credit mode (default: 'credit')
- `mode` (CharField): Lesson mode (default: 'normal')
- `cmi_data` (JSONField): Complete CMI data model as JSON
- `created_at` (DateTimeField): Creation timestamp
- `updated_at` (DateTimeField): Last update timestamp
- `last_accessed` (DateTimeField): Last access timestamp

**Relationships:**
- Many-to-one with User (student)
- Many-to-one with ScormSCO

**Constraints:**
- Unique together: (student, sco)
- Ordered by: -last_accessed

## Usage Examples

### Creating a SCORM Package

```python
from scorm.models import ScormPackage
from courses.models import Course

package = ScormPackage.objects.create(
    course=course,
    version='1.2',
    identifier='package-001',
    title='Introduction to Python',
    manifest_data={'organizations': {...}},
    content_path='/media/scorm/python-intro/',
    launch_url='index.html',
    uploaded_by=instructor,
    completion_criteria='status'
)
```

### Creating SCOs

```python
from scorm.models import ScormSCO

sco = ScormSCO.objects.create(
    package=package,
    identifier='sco-001',
    title='Lesson 1: Variables',
    launch_url='lesson1.html',
    order=1
)
```

### Tracking Student Progress

```python
from scorm.models import ScormData

# Create initial data
data = ScormData.objects.create(
    student=student,
    sco=sco,
    lesson_status='incomplete'
)

# Update progress
data.lesson_status = 'completed'
data.score_raw = 85
data.lesson_location = 'page-10'
data.save()
```

### Retrieving Student Data

```python
# Get student's data for a specific SCO
data = ScormData.objects.get(student=student, sco=sco)

# Get all SCOs in a package
scos = package.scos.all()

# Get all packages in a course
packages = course.scorm_packages.all()
```

## Admin Interface

All three models are registered in the Django admin interface with custom configurations:

- **ScormPackageAdmin**: Displays title, version, course, uploader, and completion criteria
- **ScormSCOAdmin**: Displays title, package, identifier, and order
- **ScormDataAdmin**: Displays student, SCO, status, score, and last accessed time

## Database Schema

The models create the following database tables:

- `scorm_scormpackage`
- `scorm_scormsco`
- `scorm_scormdata`

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 1.1**: Support for SCORM package metadata storage
- **Requirement 1.2**: Support for SCORM 1.2 and SCORM 2004 versions
- **Requirement 1.3**: Storage of manifest data and content paths
- **Requirement 2.2**: CMI data model storage for tracking interactions
- **Requirement 9.1**: Support for resuming SCORM sessions with saved state

## Testing

Comprehensive tests are available in `scorm/test_scorm_models.py` covering:

- Model creation and validation
- Unique constraints
- Default values
- Relationships between models
- CRUD operations

Run tests with:
```bash
pytest scorm/test_scorm_models.py -v
```

## Next Steps

The following components need to be implemented to complete SCORM functionality:

1. **ScormPackageManager**: Handle package upload, validation, and extraction
2. **ScormAPIAdapter**: Implement SCORM runtime API for content communication
3. **API Endpoints**: REST API for SCORM operations
4. **Frontend Components**: SCORM player and content viewer
5. **xAPI Integration**: Generate xAPI statements from SCORM interactions
