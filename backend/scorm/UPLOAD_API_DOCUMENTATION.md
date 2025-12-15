# SCORM Upload API Documentation

## Overview

The SCORM Upload API provides endpoints for uploading, managing, and retrieving SCORM packages. It supports both SCORM 1.2 and SCORM 2004 standards.

## Authentication

All endpoints require authentication. Users must be authenticated using Django REST Framework's authentication mechanisms (Session, Token, or JWT).

## Endpoints

### 1. Upload SCORM Package

Upload a SCORM package to a course.

**Endpoint:** `POST /api/scorm/upload/`

**Authentication:** Required (must be course instructor or staff)

**Content-Type:** `multipart/form-data`

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `course_id` | integer | Yes | ID of the course to add this package to |
| `scorm_package` | file | Yes | SCORM package ZIP file |
| `completion_criteria` | string | No | Completion criteria: `status`, `score`, or `time` (default: `status`) |
| `passing_score` | integer | No | Minimum score required to pass (0-100). Required if `completion_criteria` is `score` |
| `allow_retry` | boolean | No | Allow students to retry the content (default: `true`) |

**Example Request (cURL):**

```bash
curl -X POST http://localhost:8000/api/scorm/upload/ \
  -H "Authorization: Token YOUR_AUTH_TOKEN" \
  -F "course_id=1" \
  -F "scorm_package=@/path/to/package.zip" \
  -F "completion_criteria=status" \
  -F "allow_retry=true"
```

**Example Request (Python):**

```python
import requests

url = 'http://localhost:8000/api/scorm/upload/'
headers = {'Authorization': 'Token YOUR_AUTH_TOKEN'}
files = {'scorm_package': open('package.zip', 'rb')}
data = {
    'course_id': 1,
    'completion_criteria': 'status',
    'allow_retry': True
}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json())
```

**Success Response (200 OK):**

```json
{
    "success": true,
    "message": "SCORM package uploaded successfully",
    "lesson_id": 42,
    "package_id": 15,
    "scorm_version": "1.2",
    "title": "Introduction to Python",
    "scos": [
        {
            "id": 23,
            "identifier": "sco_1",
            "title": "Lesson 1: Getting Started",
            "launch_url": "lesson1/index.html",
            "order": 0
        }
    ],
    "warnings": []
}
```

**Error Responses:**

**400 Bad Request** - Validation errors:
```json
{
    "success": false,
    "errors": [
        "SCORM package must be a ZIP file"
    ]
}
```

**403 Forbidden** - Not authorized:
```json
{
    "success": false,
    "errors": [
        "You do not have permission to upload SCORM packages to this course"
    ]
}
```

**404 Not Found** - Course not found:
```json
{
    "success": false,
    "errors": [
        "Course with ID 999 does not exist"
    ]
}
```

**413 Payload Too Large** - Package exceeds size limit:
```json
{
    "success": false,
    "errors": [
        "Package size (150000000 bytes) exceeds maximum allowed size (104857600 bytes)"
    ]
}
```

**500 Internal Server Error** - Processing error:
```json
{
    "success": false,
    "errors": [
        "Error extracting content: ..."
    ]
}
```

---

### 2. List SCORM Packages

Retrieve a list of SCORM packages.

**Endpoint:** `GET /api/scorm/packages/`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `course_id` | integer | No | Filter by course ID |

**Example Request:**

```bash
curl -X GET "http://localhost:8000/api/scorm/packages/?course_id=1" \
  -H "Authorization: Token YOUR_AUTH_TOKEN"
```

**Success Response (200 OK):**

```json
[
    {
        "id": 15,
        "course": 1,
        "course_title": "Introduction to Programming",
        "lesson": 42,
        "lesson_title": "Introduction to Python",
        "version": "1.2",
        "identifier": "python_intro_v1",
        "title": "Introduction to Python",
        "description": "Learn Python basics",
        "content_path": "scorm_packages/1/abc123def456",
        "launch_url": "lesson1/index.html",
        "uploaded_at": "2025-12-15T10:30:00Z",
        "uploaded_by": 5,
        "uploaded_by_username": "instructor",
        "completion_criteria": "status",
        "passing_score": null,
        "allow_retry": true,
        "sco_count": 3
    }
]
```

---

### 3. Get SCORM Package Details

Retrieve details of a specific SCORM package.

**Endpoint:** `GET /api/scorm/packages/{package_id}/`

**Authentication:** Required (must be course instructor, enrolled student, or staff)

**Example Request:**

```bash
curl -X GET http://localhost:8000/api/scorm/packages/15/ \
  -H "Authorization: Token YOUR_AUTH_TOKEN"
```

**Success Response (200 OK):**

```json
{
    "id": 15,
    "course": 1,
    "course_title": "Introduction to Programming",
    "lesson": 42,
    "lesson_title": "Introduction to Python",
    "version": "1.2",
    "identifier": "python_intro_v1",
    "title": "Introduction to Python",
    "description": "Learn Python basics",
    "content_path": "scorm_packages/1/abc123def456",
    "launch_url": "lesson1/index.html",
    "uploaded_at": "2025-12-15T10:30:00Z",
    "uploaded_by": 5,
    "uploaded_by_username": "instructor",
    "completion_criteria": "status",
    "passing_score": null,
    "allow_retry": true,
    "sco_count": 3
}
```

**Error Responses:**

**403 Forbidden** - Not authorized:
```json
{
    "error": "You do not have permission to view this package"
}
```

**404 Not Found** - Package not found:
```json
{
    "error": "SCORM package not found"
}
```

---

## Validation Rules

### Package Validation

The API validates SCORM packages according to the following rules:

1. **File Format**: Must be a valid ZIP archive
2. **Size Limit**: Default maximum size is 100 MB (configurable)
3. **Manifest**: Must contain `imsmanifest.xml` at the root or in a subdirectory
4. **XML Structure**: Manifest must be valid XML
5. **SCORM Version**: Must be SCORM 1.2 or SCORM 2004
6. **Required Elements**: Manifest must contain `<organizations>` and `<resources>` elements
7. **SCO Requirement**: Package should contain at least one SCO (Sharable Content Object)

### Request Validation

1. **Course ID**: Must reference an existing course
2. **Permissions**: User must be the course instructor or staff
3. **Completion Criteria**: Must be one of: `status`, `score`, `time`
4. **Passing Score**: 
   - Required when `completion_criteria` is `score`
   - Must be between 0 and 100
   - Optional for other completion criteria

---

## Package Processing Flow

1. **Validation**: Package structure and manifest are validated
2. **Manifest Parsing**: Extract metadata, organizations, resources, and SCOs
3. **Content Extraction**: Extract all files to storage directory
4. **Database Records**: Create Lesson, ScormPackage, and ScormSCO records
5. **Response**: Return success with package details

If any step fails, the process is rolled back and an error response is returned.

---

## Storage Structure

Uploaded SCORM packages are stored in the following structure:

```
MEDIA_ROOT/
└── scorm_packages/
    └── {course_id}/
        └── {unique_id}/
            ├── imsmanifest.xml
            ├── index.html
            └── ... (other package files)
```

---

## Error Handling

The API provides detailed error messages for common issues:

- **Invalid ZIP**: "File is not a valid ZIP archive"
- **Missing Manifest**: "imsmanifest.xml not found in package"
- **Invalid XML**: "Invalid XML in manifest: {details}"
- **Unsupported Version**: "Unsupported SCORM version: {version}"
- **Package Too Large**: "Package size exceeds maximum allowed size"
- **Permission Denied**: "You do not have permission to upload SCORM packages to this course"

---

## Integration with LMS

### Lesson Creation

When a SCORM package is uploaded:

1. A new `Lesson` record is created with:
   - `content_type` = `'scorm'`
   - `title` = Package title from manifest
   - `content` = Package description
   - `order` = Next available order in the course

2. The lesson is automatically linked to the SCORM package

### Progress Tracking

SCORM content progress is tracked through:

1. **ScormData** model: Stores CMI data for each student-SCO combination
2. **Progress** model: Synchronized with SCORM completion status
3. **xAPI Statements**: Generated for SCORM interactions (when xAPI is enabled)

---

## Best Practices

### For Instructors

1. **Test Packages**: Test SCORM packages in a test course before deploying to production
2. **Set Completion Criteria**: Choose appropriate completion criteria based on content type
3. **Configure Passing Scores**: Set realistic passing scores for score-based completion
4. **Allow Retries**: Enable retries for learning content, disable for assessments

### For Developers

1. **Handle Large Files**: Use streaming for large package uploads
2. **Validate Early**: Validate packages before processing to save resources
3. **Clean Up on Error**: Ensure extracted files are cleaned up if processing fails
4. **Monitor Storage**: Track storage usage for SCORM packages
5. **Log Errors**: Log detailed error information for troubleshooting

---

## Troubleshooting

### Common Issues

**Issue**: "imsmanifest.xml not found in package"
- **Solution**: Ensure the manifest file is at the root of the ZIP or in a subdirectory

**Issue**: "Unsupported SCORM version"
- **Solution**: Verify the package is SCORM 1.2 or SCORM 2004 compliant

**Issue**: "Package size exceeds maximum allowed size"
- **Solution**: Reduce package size or increase the size limit in configuration

**Issue**: "You do not have permission to upload SCORM packages to this course"
- **Solution**: Ensure you are the course instructor or have staff privileges

---

## Related Documentation

- [SCORM Package Manager Usage](PACKAGE_MANAGER_USAGE.md)
- [SCORM Models Documentation](MODELS_DOCUMENTATION.md)
- [xAPI Integration](../xapi/README.md)

---

## API Versioning

Current API Version: **1.0**

The API follows semantic versioning. Breaking changes will result in a major version increment.
