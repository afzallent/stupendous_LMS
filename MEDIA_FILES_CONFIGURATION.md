# Media Files Configuration Guide

## Overview
The Django LMS is configured to handle media file uploads (images, videos, documents) with organized directory structure.

## Configuration

### Settings (backend/lms_project/settings.py)
```python
# Media files (User uploads)
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
```

- **MEDIA_URL**: URL prefix for accessing media files (`/media/`)
- **MEDIA_ROOT**: Physical directory where files are stored (`backend/media/`)

### URL Configuration (backend/lms_project/urls.py)
```python
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

Media files are automatically served in development mode.

---

## Upload Paths

### 1. User Avatars
**Model:** `core.models.User`  
**Field:** `avatar`  
**Upload Path:** `media/avatars/`  
**File Types:** JPEG, PNG, GIF, WebP  
**Max Size:** 5MB

**Example URL:** `http://localhost:8000/media/avatars/user_123.jpg`

---

### 2. Course Thumbnails
**Model:** `courses.models.Course`  
**Field:** `thumbnail`  
**Upload Path:** `media/course_thumbnails/`  
**File Types:** JPEG, PNG, GIF, WebP  
**Max Size:** 5MB

**Example URL:** `http://localhost:8000/media/course_thumbnails/python_course.jpg`

---

### 3. Lesson Videos
**Model:** `courses.models.Lesson`  
**Field:** `video_file`  
**Upload Path:** `media/lesson_videos/`  
**File Types:** MP4, WebM, OGG, MOV  
**Max Size:** 500MB

**Example URL:** `http://localhost:8000/media/lesson_videos/lesson_1_intro.mp4`

---

### 4. General Files
**Model:** `files.models.File`  
**Field:** `file`  
**Upload Path:** Dynamic based on file type  
**File Types:** Thumbnails, Videos, Avatars, Documents, Other

**Dynamic Path Function:**
```python
def upload_to_path(instance, filename):
    """Generate upload path based on file type"""
    file_type = instance.file_type
    paths = {
        'thumbnail': 'thumbnails/',
        'video': 'videos/',
        'avatar': 'avatars/',
        'document': 'documents/',
        'other': 'files/',
    }
    return f"{paths.get(file_type, 'files/')}{filename}"
```

**Example URLs:**
- `http://localhost:8000/media/thumbnails/image.jpg`
- `http://localhost:8000/media/videos/tutorial.mp4`
- `http://localhost:8000/media/documents/syllabus.pdf`

---

## Directory Structure

```
backend/
├── media/
│   ├── avatars/              # User profile pictures
│   │   ├── user_1.jpg
│   │   ├── user_2.png
│   │   └── ...
│   ├── course_thumbnails/    # Course cover images
│   │   ├── python_course.jpg
│   │   ├── react_course.jpg
│   │   └── ...
│   ├── lesson_videos/        # Lesson video files
│   │   ├── lesson_1.mp4
│   │   ├── lesson_2.mp4
│   │   └── ...
│   ├── thumbnails/           # General thumbnails
│   ├── videos/               # General videos
│   ├── documents/            # Documents (PDFs, etc.)
│   └── files/                # Other files
```

---

## API Endpoints for File Upload

### Upload Avatar
**POST** `/api/user/upload-avatar/`

```bash
curl -X POST http://localhost:8000/api/user/upload-avatar/ \
  -H "Authorization: Bearer {token}" \
  -F "avatar=@/path/to/image.jpg"
```

**Response:**
```json
{
  "detail": "Avatar uploaded successfully.",
  "avatar_url": "http://localhost:8000/media/avatars/user_123.jpg"
}
```

---

### Upload Course Thumbnail
**POST** `/api/courses/{id}/upload_thumbnail/`

```bash
curl -X POST http://localhost:8000/api/courses/1/upload_thumbnail/ \
  -H "Authorization: Bearer {token}" \
  -F "thumbnail=@/path/to/thumbnail.jpg"
```

**Response:**
```json
{
  "detail": "Thumbnail uploaded successfully.",
  "course": {
    "id": 1,
    "title": "Python Course",
    "thumbnail": "http://localhost:8000/media/course_thumbnails/python.jpg",
    ...
  }
}
```

---

### Upload Lesson Video
**POST** `/api/lessons/{id}/upload_video/`

```bash
curl -X POST http://localhost:8000/api/lessons/1/upload_video/ \
  -H "Authorization: Bearer {token}" \
  -F "video=@/path/to/video.mp4"
```

**Response:**
```json
{
  "detail": "Video uploaded successfully.",
  "lesson": {
    "id": 1,
    "title": "Introduction to Python",
    "video_file": "http://localhost:8000/media/lesson_videos/intro.mp4",
    ...
  }
}
```

---

## File Validation

### Avatar Upload
- **Max Size:** 5MB
- **Allowed Types:** JPEG, PNG, GIF, WebP
- **Error:** File size must be less than 5MB
- **Error:** File must be an image (JPEG, PNG, GIF, or WebP)

### Course Thumbnail
- **Max Size:** 5MB
- **Allowed Types:** JPEG, PNG, GIF, WebP
- **Error:** File size must be less than 5MB
- **Error:** File must be an image (JPEG, PNG, GIF, or WebP)

### Lesson Video
- **Max Size:** 500MB
- **Allowed Types:** MP4, WebM, OGG, MOV
- **Error:** File size must be less than 500MB
- **Error:** File must be a video (MP4, WebM, OGG, or MOV)

---

## Production Deployment

### Using AWS S3
For production, configure Django to use AWS S3 instead of local storage:

```python
# Install: pip install django-storages boto3

# settings.py
if not DEBUG:
    # AWS S3 Configuration
    AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
    AWS_S3_REGION_NAME = 'us-east-1'
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    
    # S3 static settings
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
    STATIC_ROOT = 'static/'
    
    # S3 public media settings
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
```

### Using Google Cloud Storage
```python
# Install: pip install django-storages google-cloud-storage

# settings.py
if not DEBUG:
    GS_BUCKET_NAME = 'your-bucket-name'
    GS_PROJECT_ID = 'your-project-id'
    DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
    STATICFILES_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
    
    MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/media/'
    STATIC_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/static/'
```

---

## Cleanup & Maintenance

### Delete Unused Files
```python
# Django shell
from django.core.files.storage import default_storage
import os

# List all files
for file in default_storage.listdir('media/')[1]:
    print(file)

# Delete specific file
default_storage.delete('media/avatars/old_file.jpg')
```

### Backup Media Files
```bash
# Backup to tar.gz
tar -czf media_backup_$(date +%Y%m%d).tar.gz backend/media/

# Restore from backup
tar -xzf media_backup_20241206.tar.gz
```

---

## Troubleshooting

### Files Not Serving
1. Check `DEBUG = True` in settings
2. Verify `MEDIA_URL` and `MEDIA_ROOT` are configured
3. Ensure URL pattern includes `static()` for media files
4. Check file permissions on `backend/media/` directory

### Upload Fails
1. Check file size limits
2. Verify file type is allowed
3. Ensure `media/` directory is writable
4. Check disk space availability

### Broken Image/Video Links
1. Verify file exists in `backend/media/` directory
2. Check file path in database
3. Ensure `MEDIA_URL` is correct
4. Check web server configuration (for production)

---

## Best Practices

✅ **Do:**
- Organize files by type (avatars, videos, thumbnails)
- Validate file types and sizes on upload
- Use descriptive filenames
- Implement file cleanup for deleted records
- Use CDN for production media delivery
- Compress images before upload
- Use video streaming services for large videos

❌ **Don't:**
- Store files in version control
- Use absolute paths in code
- Skip file validation
- Store sensitive files in media directory
- Serve large files directly from Django in production
- Ignore file permissions

---

## Summary

✅ **Configuration Status:** CORRECT
- Media files configured in settings
- URL routing set up for development
- Upload paths organized by file type
- File validation implemented
- API endpoints available for uploads

The media file system is production-ready and follows Django best practices!
