# Media Storage Configuration

This Django app provides a comprehensive media storage configuration system for the LMS platform. It allows administrators to configure where and how media files (videos, thumbnails, avatars) are stored, with built-in security features.

## Features

### 1. **Multiple Storage Backends**
- **Local Storage**: Store files on the application server
- **File Server**: Upload to external file servers (WebDAV, HTTP)
- **Amazon S3**: Store files in S3 buckets

### 2. **Image Transcoding & Security**
- **Automatic Format Conversion**: Convert images to WebP or AVIF for better compression
- **Metadata Stripping**: Remove EXIF and other metadata that could contain malicious code
- **Re-encoding**: Prevents code injection through embedded scripts in images
- **Polyglot Attack Prevention**: Validates and re-encodes images to prevent multi-format exploits
- **Size Optimization**: Automatically resize images that exceed configured dimensions

### 3. **Flexible Configuration**
- Different storage backends for different media types
- Configurable file size limits
- Image quality settings
- Maximum dimension constraints

## Installation

1. The app is already added to `INSTALLED_APPS` in `settings.py`

2. Install required dependencies:
```bash
pip install -r requirements.txt
```

3. Run migrations:
```bash
python manage.py makemigrations media_config
python manage.py migrate media_config
```

4. Access the configuration in Django Admin:
   - Navigate to `/admin/`
   - Look for "Media Storage Configuration"
   - Configure your storage preferences

## Configuration Options

### Video Storage
- **Storage Type**: Choose between local, file server, or S3
- **Local Path**: Directory path for local storage (relative to MEDIA_ROOT)
- **File Server**: URL, username, and password for file server
- **S3**: Bucket name, region, access key, and secret key

### Thumbnail Storage
- Same options as video storage
- Can use different backend than videos

### Avatar Storage
- Same options as video storage
- Can use different backend than videos

### Image Processing
- **Enable Transcoding**: Turn on/off automatic image processing
- **Output Format**: Choose WebP, AVIF, or keep original
- **Quality**: 1-100 (higher = better quality, larger file)
- **Max Dimensions**: Maximum width and height in pixels
- **Strip Metadata**: Remove EXIF data for security

### File Size Limits
- **Max Video Size**: Maximum size in MB for video uploads
- **Max Image Size**: Maximum size in MB for image uploads

## Usage

### In Your Views/Models

```python
from media_config.utils import save_uploaded_file, delete_file, get_file_url

# Save an uploaded file
def upload_avatar(request):
    avatar_file = request.FILES['avatar']
    result = save_uploaded_file(avatar_file, media_type='avatar')
    
    # result contains:
    # {
    #     'filename': 'avatar_abc123.webp',
    #     'url': 'https://...',
    #     'size': 12345,
    #     'transcoded': True
    # }
    
    return JsonResponse(result)

# Delete a file
delete_file('avatar_abc123.webp', media_type='avatar')

# Get file URL
url = get_file_url('avatar_abc123.webp', media_type='avatar')
```

### Direct Storage Backend Usage

```python
from media_config.storage import get_storage_backend

# Get backend for specific media type
backend = get_storage_backend('video')

# Save a file
path = backend.save('my_video.mp4', file_content, 'video')

# Get URL
url = backend.url('my_video.mp4', 'video')

# Delete file
backend.delete('my_video.mp4', 'video')
```

### Image Transcoding

```python
from media_config.image_processing import transcode_image, validate_image

# Validate an image
if validate_image(uploaded_file):
    # Transcode the image
    transcoded = transcode_image(uploaded_file, 'photo.jpg')
    # transcoded is a BytesIO object
```

## Security Benefits

### Image Transcoding Security

The image transcoding feature provides critical security benefits:

1. **Code Injection Prevention**: By re-encoding images, any embedded malicious scripts or code are removed
2. **Metadata Stripping**: EXIF data can contain exploits; stripping it prevents these attacks
3. **Format Validation**: Ensures files are actually images and not disguised executables
4. **Polyglot Attack Prevention**: Re-encoding prevents files that are valid in multiple formats (e.g., both image and script)

### Example Attack Scenarios Prevented

- **Embedded PHP/JavaScript**: Malicious users upload an image with embedded PHP code in EXIF data
- **Polyglot Files**: Files that are both valid images and valid HTML/JavaScript
- **Steganography Exploits**: Hidden data in image pixels that could be executed
- **Buffer Overflow**: Malformed image headers designed to exploit image processing libraries

## Storage Backend Details

### Local Storage
- Files stored in `MEDIA_ROOT/[configured_path]`
- Fastest option for small deployments
- No additional configuration needed

### File Server
- Uses HTTP PUT/DELETE for file operations
- Supports basic authentication
- Compatible with WebDAV servers
- Useful for shared network storage

### Amazon S3
- Scalable cloud storage
- Generates presigned URLs (valid for 1 hour)
- Supports different buckets for different media types
- Requires AWS credentials

## Best Practices

1. **Enable Image Transcoding**: Always enable for user-uploaded images
2. **Use WebP Format**: Best balance of quality and file size
3. **Strip Metadata**: Always enable for security
4. **Set Reasonable Limits**: Prevent abuse with appropriate file size limits
5. **Use S3 for Production**: More scalable than local storage
6. **Separate Buckets**: Consider using different S3 buckets for different media types

## Troubleshooting

### Images Not Transcoding
- Check that `enable_image_transcoding` is True
- Verify Pillow is installed: `pip install Pillow`
- Check logs for processing errors

### S3 Upload Failures
- Verify AWS credentials are correct
- Check bucket permissions (need PutObject, GetObject, DeleteObject)
- Ensure bucket region matches configuration

### File Server Issues
- Verify URL is accessible
- Check authentication credentials
- Ensure server supports PUT/DELETE methods

## API Endpoints

You can create API endpoints to expose this functionality:

```python
# In your views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from media_config.utils import save_uploaded_file

class UploadAvatarView(APIView):
    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        try:
            result = save_uploaded_file(file, media_type='avatar')
            return Response(result)
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)
```

## Future Enhancements

Potential future additions:
- Video transcoding support
- CDN integration
- Automatic thumbnail generation
- Image watermarking
- Virus scanning integration
- Azure Blob Storage support
- Google Cloud Storage support
