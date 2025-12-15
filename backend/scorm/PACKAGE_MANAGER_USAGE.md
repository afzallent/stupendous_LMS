# SCORM Package Manager Usage Guide

## Overview

The `ScormPackageManager` class handles the complete lifecycle of SCORM package management, including validation, manifest extraction, and content extraction. It supports both SCORM 1.2 and SCORM 2004 standards.

## Features

- **Package Validation**: Validates ZIP structure, manifest presence, XML validity, and SCORM version
- **Manifest Extraction**: Parses imsmanifest.xml and extracts metadata, organizations, resources, and SCOs
- **Content Extraction**: Extracts all package files to storage while maintaining directory structure
- **Multi-Version Support**: Handles both SCORM 1.2 and SCORM 2004 packages

## Basic Usage

### 1. Validate a SCORM Package

```python
from scorm.package_manager import ScormPackageManager
from django.core.files.uploadedfile import UploadedFile

# Initialize manager
manager = ScormPackageManager()

# Validate uploaded package
result = manager.validate_package(uploaded_file)

if result.is_valid:
    print("Package is valid!")
else:
    print("Validation errors:", result.errors)
    print("Warnings:", result.warnings)
```

### 2. Extract Manifest Data

```python
# Extract and parse manifest
manifest_data = manager.extract_manifest(uploaded_file)

print(f"Package ID: {manifest_data.identifier}")
print(f"SCORM Version: {manifest_data.version}")
print(f"Title: {manifest_data.title}")
print(f"Description: {manifest_data.description}")
print(f"Number of SCOs: {len(manifest_data.scos)}")

# Access SCO information
for sco in manifest_data.scos:
    print(f"SCO: {sco['title']} - Launch URL: {sco['launch_url']}")
```

### 3. Extract Package Content

```python
# Extract content files to storage
destination = f"scorm_packages/{package_id}"
extracted_files = manager.extract_content(uploaded_file, destination)

print(f"Extracted {len(extracted_files)} files")
```

## Complete Upload Workflow

```python
from scorm.package_manager import ScormPackageManager
from scorm.models import ScormPackage, ScormSCO
from courses.models import Course, Lesson

def upload_scorm_package(uploaded_file, course_id, user):
    """Complete workflow for uploading a SCORM package"""
    
    manager = ScormPackageManager()
    
    # Step 1: Validate package
    validation_result = manager.validate_package(uploaded_file)
    if not validation_result.is_valid:
        return {
            'success': False,
            'errors': validation_result.errors
        }
    
    # Step 2: Extract manifest
    try:
        manifest_data = manager.extract_manifest(uploaded_file)
    except ValueError as e:
        return {
            'success': False,
            'errors': [str(e)]
        }
    
    # Step 3: Extract content
    destination = f"scorm_packages/{manifest_data.identifier}"
    try:
        extracted_files = manager.extract_content(uploaded_file, destination)
    except (ValueError, OSError) as e:
        return {
            'success': False,
            'errors': [str(e)]
        }
    
    # Step 4: Create database records
    course = Course.objects.get(id=course_id)
    
    # Create lesson
    lesson = Lesson.objects.create(
        course=course,
        title=manifest_data.title,
        description=manifest_data.description,
        content_type='scorm',
        order=course.lessons.count() + 1
    )
    
    # Create SCORM package record
    scorm_package = ScormPackage.objects.create(
        course=course,
        lesson=lesson,
        version=manifest_data.version,
        identifier=manifest_data.identifier,
        title=manifest_data.title,
        description=manifest_data.description,
        manifest_data=manifest_data.__dict__,
        content_path=destination,
        launch_url=manifest_data.scos[0]['launch_url'] if manifest_data.scos else '',
        uploaded_by=user
    )
    
    # Create SCO records
    for sco_data in manifest_data.scos:
        ScormSCO.objects.create(
            package=scorm_package,
            identifier=sco_data['identifier'],
            title=sco_data['title'],
            launch_url=sco_data['launch_url'],
            order=sco_data['order']
        )
    
    return {
        'success': True,
        'package_id': scorm_package.id,
        'lesson_id': lesson.id,
        'sco_count': len(manifest_data.scos)
    }
```

## Configuration

### Custom Package Size Limit

```python
# Create manager with custom size limit (in bytes)
manager = ScormPackageManager(max_package_size=50 * 1024 * 1024)  # 50 MB
```

## Data Structures

### ValidationResult

```python
@dataclass
class ValidationResult:
    is_valid: bool          # True if package is valid
    errors: List[str]       # List of validation errors
    warnings: List[str]     # List of warnings (non-fatal)
```

### ManifestData

```python
@dataclass
class ManifestData:
    identifier: str                 # Package identifier
    version: str                    # '1.2' or '2004'
    title: str                      # Package title
    description: str                # Package description
    organizations: List[Dict]       # Organization structure
    resources: List[Dict]           # Resource definitions
    metadata: Dict                  # Additional metadata
    scos: List[Dict]               # SCO information
```

### SCO Data Structure

Each SCO in `manifest_data.scos` contains:

```python
{
    'identifier': str,          # SCO identifier
    'title': str,              # SCO title
    'launch_url': str,         # Entry point URL
    'parameters': str,         # Launch parameters
    'order': int,              # Display order
    'resource_identifier': str # Associated resource ID
}
```

## Error Handling

### Validation Errors

- **Invalid ZIP structure**: File is not a valid ZIP archive
- **Missing manifest**: imsmanifest.xml not found in package
- **Invalid XML**: Manifest contains invalid XML
- **Unsupported version**: SCORM version is not 1.2 or 2004
- **Package too large**: Exceeds maximum allowed size
- **Corrupted files**: ZIP contains corrupted files

### Extraction Errors

- **ValueError**: Raised for invalid packages or parsing errors
- **OSError**: Raised for file system errors during extraction

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 1.1**: Validates package structure and extracts manifest
- **Requirement 1.2**: Extracts metadata including title, description, and organization structure
- **Requirement 1.4**: Rejects invalid or corrupted packages with specific error messages
- **Requirement 1.5**: Supports both SCORM 1.2 and SCORM 2004 packages

## Testing

Run the test suite:

```bash
pytest backend/scorm/test_package_manager.py -v
```

The test suite includes:
- Valid SCORM 1.2 and 2004 package validation
- Missing manifest detection
- Invalid XML handling
- Non-ZIP file rejection
- Size limit enforcement
- Manifest extraction for both versions
- Content extraction verification
- Multiple SCO handling
