# Media Storage Configuration - Setup Guide

This guide will help you set up and configure the media storage system for your LMS.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `Pillow` - For image processing and transcoding
- `boto3` - For Amazon S3 support
- `requests` - For file server support

### 2. Run Migrations

```bash
python manage.py makemigrations media_config
python manage.py migrate media_config
```

### 3. Initialize Configuration

```bash
python manage.py init_media_config
```

This creates the default configuration with:
- Local storage for all media types
- Image transcoding enabled (WebP format)
- Reasonable file size limits

### 4. Configure in Admin Panel

1. Start your Django server:
   ```bash
   python manage.py runserver
   ```

2. Navigate to: `http://localhost:8000/admin/`

3. Log in with your admin credentials

4. Look for **"Media Storage Configuration"** in the admin panel

5. Click to edit and configure your preferences

## Configuration Scenarios

### Scenario 1: Local Storage (Default)

**Best for**: Development, small deployments

**Configuration**:
- Video Storage Type: `Local Storage`
- Thumbnail Storage Type: `Local Storage`
- Avatar Storage Type: `Local Storage`
- Keep default paths or customize as needed

**No additional setup required!**

### Scenario 2: Amazon S3 Storage

**Best for**: Production, scalable deployments

**Prerequisites**:
1. AWS account
2. S3 bucket created
3. IAM user with S3 permissions

**Steps**:

1. **Create S3 Bucket**:
   - Go to AWS S3 Console
   - Create a new bucket (e.g., `my-lms-media`)
   - Note the region (e.g., `us-east-1`)

2. **Create IAM User**:
   - Go to AWS IAM Console
   - Create a new user with programmatic access
   - Attach policy with these permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "s3:PutObject",
             "s3:GetObject",
             "s3:DeleteObject",
             "s3:ListBucket"
           ],
           "Resource": [
             "arn:aws:s3:::my-lms-media/*",
             "arn:aws:s3:::my-lms-media"
           ]
         }
       ]
     }
     ```
   - Save the Access Key ID and Secret Access Key

3. **Configure in Admin**:
   - Video Storage Type: `Amazon S3`
   - Video S3 Bucket: `my-lms-media`
   - Video S3 Region: `us-east-1`
   - Video S3 Access Key: `YOUR_ACCESS_KEY_ID`
   - Video S3 Secret Key: `YOUR_SECRET_ACCESS_KEY`
   - Repeat for thumbnails and avatars (can use same bucket)

### Scenario 3: File Server Storage

**Best for**: Organizations with existing file servers

**Prerequisites**:
1. WebDAV-compatible file server
2. Server URL and credentials

**Configuration**:
- Video Storage Type: `File Server`
- Video File Server URL: `https://files.example.com/lms/videos`
- Video File Server Username: `lms_user`
- Video File Server Password: `secure_password`
- Repeat for thumbnails and avatars

### Scenario 4: Mixed Storage

**Best for**: Optimizing costs and performance

**Example Configuration**:
- **Videos**: Amazon S3 (large files, CDN-friendly)
- **Thumbnails**: Local Storage (small files, fast access)
- **Avatars**: Amazon S3 (public access, CDN-friendly)

Configure each media type independently in the admin panel.

## Image Transcoding Configuration

### Recommended Settings

**For Security (Highest Priority)**:
```
Enable Image Transcoding: ✓ Yes
Image Output Format: WebP
Strip Image Metadata: ✓ Yes
Image Quality: 85
Max Image Width: 2048
Max Image Height: 2048
```

**For Performance (Smallest Files)**:
```
Enable Image Transcoding: ✓ Yes
Image Output Format: AVIF
Strip Image Metadata: ✓ Yes
Image Quality: 75
Max Image Width: 1920
Max Image Height: 1920
```

**For Compatibility (Widest Support)**:
```
Enable Image Transcoding: ✓ Yes
Image Output Format: WebP
Strip Image Metadata: ✓ Yes
Image Quality: 90
Max Image Width: 2048
Max Image Height: 2048
```

### Format Comparison

| Format | File Size | Browser Support | Security | Recommendation |
|--------|-----------|-----------------|----------|----------------|
| WebP   | Small     | 95%+           | ✓        | **Best Choice** |
| AVIF   | Smallest  | 70%+           | ✓        | Future-proof |
| Original | Varies  | 100%           | ✗        | Not recommended |

## File Size Limits

### Recommended Limits

**For Standard LMS**:
- Max Video Size: 500 MB
- Max Image Size: 10 MB

**For High-Quality Content**:
- Max Video Size: 2000 MB (2 GB)
- Max Image Size: 20 MB

**For Mobile-First**:
- Max Video Size: 100 MB
- Max Image Size: 5 MB

## Testing Your Configuration

### Test Local Storage

```python
# In Django shell (python manage.py shell)
from django.core.files.uploadedfile import SimpleUploadedFile
from media_config.utils import save_uploaded_file

# Create a test file
test_file = SimpleUploadedFile("test.jpg", b"fake image content", content_type="image/jpeg")

# Test upload
result = save_uploaded_file(test_file, media_type='avatar')
print(result)
# Should show: {'filename': '...', 'url': '...', 'size': ..., 'transcoded': True}
```

### Test S3 Storage

```python
from media_config.storage import S3StorageBackend
from media_config.models import MediaStorageConfig

config = MediaStorageConfig.get_config()
backend = S3StorageBackend(config)

# Test connection
try:
    test_content = b"test content"
    path = backend.save("test.txt", test_content, "video")
    print(f"Success! File saved to: {path}")
    
    # Clean up
    backend.delete("test.txt", "video")
except Exception as e:
    print(f"Error: {e}")
```

## Troubleshooting

### Issue: "Pillow not installed"

**Solution**:
```bash
pip install Pillow==10.4.0
```

### Issue: "boto3 not installed"

**Solution**:
```bash
pip install boto3==1.35.0
```

### Issue: "S3 upload fails with 403 Forbidden"

**Possible causes**:
1. Incorrect AWS credentials
2. Insufficient IAM permissions
3. Bucket policy blocking access

**Solution**:
- Verify credentials in admin panel
- Check IAM user permissions
- Review S3 bucket policy

### Issue: "Images not being transcoded"

**Check**:
1. Is `enable_image_transcoding` enabled?
2. Is Pillow installed?
3. Check Django logs for errors

### Issue: "File server upload fails"

**Check**:
1. Is the server URL accessible?
2. Are credentials correct?
3. Does the server support PUT/DELETE methods?
4. Check server logs for authentication errors

## Security Best Practices

1. **Always Enable Image Transcoding**: Prevents code injection attacks
2. **Strip Metadata**: Removes potential exploit vectors
3. **Use HTTPS**: For file server connections
4. **Rotate AWS Keys**: Regularly update S3 credentials
5. **Limit File Sizes**: Prevent abuse and DoS attacks
6. **Use IAM Roles**: In production, use EC2 IAM roles instead of hardcoded keys
7. **Enable S3 Encryption**: Use server-side encryption for sensitive content

## Production Checklist

- [ ] Install all required dependencies
- [ ] Run migrations
- [ ] Configure storage backend (S3 recommended)
- [ ] Enable image transcoding
- [ ] Set appropriate file size limits
- [ ] Test file uploads
- [ ] Test file deletions
- [ ] Verify URLs are accessible
- [ ] Configure CDN (if using S3)
- [ ] Set up backup strategy
- [ ] Monitor storage usage
- [ ] Review security settings

## Environment Variables (Optional)

For added security, you can store sensitive configuration in environment variables:

```python
# In settings.py
MEDIA_CONFIG_S3_ACCESS_KEY = config('MEDIA_S3_ACCESS_KEY', default='')
MEDIA_CONFIG_S3_SECRET_KEY = config('MEDIA_S3_SECRET_KEY', default='')
```

Then reference these in your admin configuration or create a custom initialization script.

## Next Steps

1. Complete the setup steps above
2. Test with sample uploads
3. Configure your frontend to use the upload endpoints
4. Monitor storage usage and costs
5. Adjust settings based on your needs

For more information, see the [README.md](README.md) file.
