# Media Storage - Quick Reference

## Installation

```bash
pip install -r requirements.txt
python manage.py makemigrations media_config
python manage.py migrate media_config
python manage.py init_media_config
```

## Common Operations

### Upload a File

```python
from media_config.utils import save_uploaded_file

# From a view
result = save_uploaded_file(
    request.FILES['file'],
    media_type='avatar'  # or 'video', 'thumbnail'
)

# Returns:
# {
#     'filename': 'avatar_abc123.webp',
#     'url': 'http://...',
#     'size': 12345,
#     'transcoded': True
# }
```

### Delete a File

```python
from media_config.utils import delete_file

success = delete_file('avatar_abc123.webp', media_type='avatar')
```

### Get File URL

```python
from media_config.utils import get_file_url

url = get_file_url('avatar_abc123.webp', media_type='avatar')
```

### Validate Image

```python
from media_config.image_processing import validate_image

if validate_image(uploaded_file):
    # Process the image
    pass
```

### Transcode Image Manually

```python
from media_config.image_processing import transcode_image

transcoded = transcode_image(uploaded_file, 'photo.jpg')
# Returns BytesIO object
```

## Media Types

- `'video'` - Course videos
- `'thumbnail'` - Course/video thumbnails
- `'avatar'` - User profile pictures

## Configuration Access

```python
from media_config.models import MediaStorageConfig

config = MediaStorageConfig.get_config()

# Check settings
if config.enable_image_transcoding:
    print(f"Images will be converted to {config.image_output_format}")
```

## Storage Backends

```python
from media_config.storage import get_storage_backend

# Get backend for specific media type
backend = get_storage_backend('video')

# Save
path = backend.save('video.mp4', file_content, 'video')

# Get URL
url = backend.url('video.mp4', 'video')

# Delete
backend.delete('video.mp4', 'video')
```

## Example: Avatar Upload View

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from media_config.utils import save_uploaded_file
from django.core.exceptions import ValidationError

class UploadAvatarView(APIView):
    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        try:
            result = save_uploaded_file(file, media_type='avatar')
            
            # Save to user model
            request.user.avatar_url = result['url']
            request.user.save()
            
            return Response(result)
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)
```

## Example: Video Upload View

```python
class UploadVideoView(APIView):
    def post(self, request):
        video = request.FILES.get('video')
        lesson_id = request.data.get('lesson_id')
        
        try:
            result = save_uploaded_file(video, media_type='video')
            
            # Save to lesson model
            lesson = Lesson.objects.get(id=lesson_id)
            lesson.video_url = result['url']
            lesson.video_filename = result['filename']
            lesson.save()
            
            return Response(result)
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)
```

## Admin Configuration

Access at: `/admin/media_config/mediastorageconfig/`

### Quick Settings

**Development**:
- Storage: Local
- Transcoding: Enabled
- Format: WebP

**Production**:
- Storage: Amazon S3
- Transcoding: Enabled
- Format: WebP
- Strip Metadata: Yes

## File Size Limits

Default limits:
- Videos: 500 MB
- Images: 10 MB

Change in admin panel under "File Size Limits"

## Image Formats

| Format | Size | Support | Use Case |
|--------|------|---------|----------|
| WebP   | Small | 95%+ | **Recommended** |
| AVIF   | Smallest | 70%+ | Future-proof |
| Original | Varies | 100% | Not secure |

## Security Features

✓ Code injection prevention
✓ Metadata stripping
✓ Format validation
✓ Polyglot attack prevention
✓ Size limits

## Testing

```bash
# Run tests
python manage.py test media_config

# Test in shell
python manage.py shell
```

```python
from django.core.files.uploadedfile import SimpleUploadedFile
from media_config.utils import save_uploaded_file

test_file = SimpleUploadedFile("test.jpg", b"test", content_type="image/jpeg")
result = save_uploaded_file(test_file, media_type='avatar')
print(result)
```

## Troubleshooting

**Import Error**: `pip install Pillow boto3 requests`

**S3 403 Error**: Check AWS credentials and permissions

**Images not transcoding**: Verify `enable_image_transcoding` is True

## Documentation

- `README.md` - Full documentation
- `SETUP_GUIDE.md` - Setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Overview
