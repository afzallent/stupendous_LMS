"""
Storage backends for handling different storage types (local, file server, S3).
"""
import os
import boto3
from botocore.exceptions import ClientError
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from pathlib import Path
import requests
from requests.auth import HTTPBasicAuth


class MediaStorageBackend:
    """Base class for media storage backends"""
    
    def __init__(self, config):
        self.config = config
    
    def save(self, filename, content, media_type='video'):
        """Save a file. Returns the URL/path to the saved file."""
        raise NotImplementedError
    
    def delete(self, filename, media_type='video'):
        """Delete a file."""
        raise NotImplementedError
    
    def url(self, filename, media_type='video'):
        """Get the URL for accessing a file."""
        raise NotImplementedError


class LocalStorageBackend(MediaStorageBackend):
    """Local filesystem storage backend"""
    
    def save(self, filename, content, media_type='video'):
        """Save file to local filesystem"""
        # Get the appropriate path based on media type
        if media_type == 'video':
            base_path = self.config.video_local_path
        elif media_type == 'thumbnail':
            base_path = self.config.thumbnail_local_path
        elif media_type == 'avatar':
            base_path = self.config.avatar_local_path
        else:
            base_path = 'media/uploads'
        
        # Create full path
        full_path = Path(settings.MEDIA_ROOT) / base_path
        full_path.mkdir(parents=True, exist_ok=True)
        
        # Save the file
        file_path = full_path / filename
        with open(file_path, 'wb') as f:
            if hasattr(content, 'read'):
                f.write(content.read())
            else:
                f.write(content)
        
        # Return relative path from MEDIA_ROOT
        return str(Path(base_path) / filename)
    
    def delete(self, filename, media_type='video'):
        """Delete file from local filesystem"""
        if media_type == 'video':
            base_path = self.config.video_local_path
        elif media_type == 'thumbnail':
            base_path = self.config.thumbnail_local_path
        elif media_type == 'avatar':
            base_path = self.config.avatar_local_path
        else:
            base_path = 'media/uploads'
        
        file_path = Path(settings.MEDIA_ROOT) / base_path / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    def url(self, filename, media_type='video'):
        """Get URL for local file"""
        if media_type == 'video':
            base_path = self.config.video_local_path
        elif media_type == 'thumbnail':
            base_path = self.config.thumbnail_local_path
        elif media_type == 'avatar':
            base_path = self.config.avatar_local_path
        else:
            base_path = 'media/uploads'
        
        return f"{settings.MEDIA_URL}{base_path}/{filename}"


class FileServerBackend(MediaStorageBackend):
    """File server storage backend (WebDAV, FTP, etc.)"""
    
    def save(self, filename, content, media_type='video'):
        """Upload file to file server"""
        # Get the appropriate URL based on media type
        if media_type == 'video':
            base_url = self.config.video_file_server_url
            username = self.config.video_file_server_username
            password = self.config.video_file_server_password
        elif media_type == 'thumbnail':
            base_url = self.config.thumbnail_file_server_url
            username = self.config.video_file_server_username  # Reuse video credentials
            password = self.config.video_file_server_password
        elif media_type == 'avatar':
            base_url = self.config.avatar_file_server_url
            username = self.config.video_file_server_username  # Reuse video credentials
            password = self.config.video_file_server_password
        else:
            raise ValueError(f"Unknown media type: {media_type}")
        
        if not base_url:
            raise ValueError(f"File server URL not configured for {media_type}")
        
        # Upload via HTTP PUT (WebDAV style)
        url = f"{base_url.rstrip('/')}/{filename}"
        auth = HTTPBasicAuth(username, password) if username and password else None
        
        if hasattr(content, 'read'):
            data = content.read()
        else:
            data = content
        
        response = requests.put(url, data=data, auth=auth)
        response.raise_for_status()
        
        return url
    
    def delete(self, filename, media_type='video'):
        """Delete file from file server"""
        if media_type == 'video':
            base_url = self.config.video_file_server_url
            username = self.config.video_file_server_username
            password = self.config.video_file_server_password
        elif media_type == 'thumbnail':
            base_url = self.config.thumbnail_file_server_url
            username = self.config.video_file_server_username
            password = self.config.video_file_server_password
        elif media_type == 'avatar':
            base_url = self.config.avatar_file_server_url
            username = self.config.video_file_server_username
            password = self.config.video_file_server_password
        else:
            return False
        
        if not base_url:
            return False
        
        url = f"{base_url.rstrip('/')}/{filename}"
        auth = HTTPBasicAuth(username, password) if username and password else None
        
        try:
            response = requests.delete(url, auth=auth)
            response.raise_for_status()
            return True
        except:
            return False
    
    def url(self, filename, media_type='video'):
        """Get URL for file on file server"""
        if media_type == 'video':
            base_url = self.config.video_file_server_url
        elif media_type == 'thumbnail':
            base_url = self.config.thumbnail_file_server_url
        elif media_type == 'avatar':
            base_url = self.config.avatar_file_server_url
        else:
            raise ValueError(f"Unknown media type: {media_type}")
        
        return f"{base_url.rstrip('/')}/{filename}"


class S3StorageBackend(MediaStorageBackend):
    """Amazon S3 storage backend"""
    
    def _get_s3_client(self, media_type='video'):
        """Get configured S3 client for the media type"""
        if media_type == 'video':
            region = self.config.video_s3_region
            access_key = self.config.video_s3_access_key
            secret_key = self.config.video_s3_secret_key
        elif media_type in ['thumbnail', 'avatar']:
            # Thumbnails and avatars can share video credentials
            region = self.config.thumbnail_s3_region or self.config.video_s3_region
            access_key = self.config.video_s3_access_key
            secret_key = self.config.video_s3_secret_key
        else:
            raise ValueError(f"Unknown media type: {media_type}")
        
        return boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key
        )
    
    def _get_bucket_name(self, media_type='video'):
        """Get the bucket name for the media type"""
        if media_type == 'video':
            return self.config.video_s3_bucket
        elif media_type == 'thumbnail':
            return self.config.thumbnail_s3_bucket or self.config.video_s3_bucket
        elif media_type == 'avatar':
            return self.config.avatar_s3_bucket or self.config.video_s3_bucket
        else:
            raise ValueError(f"Unknown media type: {media_type}")
    
    def save(self, filename, content, media_type='video'):
        """Upload file to S3"""
        s3_client = self._get_s3_client(media_type)
        bucket_name = self._get_bucket_name(media_type)
        
        if not bucket_name:
            raise ValueError(f"S3 bucket not configured for {media_type}")
        
        # Add media type prefix to organize files in bucket
        key = f"{media_type}s/{filename}"
        
        if hasattr(content, 'read'):
            data = content.read()
        else:
            data = content
        
        try:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=key,
                Body=data,
                ContentType=self._get_content_type(filename)
            )
            return key
        except ClientError as e:
            raise Exception(f"Failed to upload to S3: {str(e)}")
    
    def delete(self, filename, media_type='video'):
        """Delete file from S3"""
        s3_client = self._get_s3_client(media_type)
        bucket_name = self._get_bucket_name(media_type)
        
        if not bucket_name:
            return False
        
        key = f"{media_type}s/{filename}"
        
        try:
            s3_client.delete_object(Bucket=bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def url(self, filename, media_type='video'):
        """Generate presigned URL for S3 object"""
        s3_client = self._get_s3_client(media_type)
        bucket_name = self._get_bucket_name(media_type)
        key = f"{media_type}s/{filename}"
        
        try:
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': key},
                ExpiresIn=3600  # URL valid for 1 hour
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate S3 URL: {str(e)}")
    
    def _get_content_type(self, filename):
        """Determine content type from filename"""
        ext = filename.lower().split('.')[-1]
        content_types = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'avif': 'image/avif',
            'gif': 'image/gif',
        }
        return content_types.get(ext, 'application/octet-stream')


def get_storage_backend(media_type='video'):
    """
    Factory function to get the appropriate storage backend based on configuration.
    
    Args:
        media_type: Type of media ('video', 'thumbnail', or 'avatar')
    
    Returns:
        Appropriate storage backend instance
    """
    from .models import MediaStorageConfig
    
    config = MediaStorageConfig.get_config()
    
    # Determine storage type based on media type
    if media_type == 'video':
        storage_type = config.video_storage_type
    elif media_type == 'thumbnail':
        storage_type = config.thumbnail_storage_type
    elif media_type == 'avatar':
        storage_type = config.avatar_storage_type
    else:
        storage_type = 'local'
    
    # Return appropriate backend
    if storage_type == 'local':
        return LocalStorageBackend(config)
    elif storage_type == 'file_server':
        return FileServerBackend(config)
    elif storage_type == 's3':
        return S3StorageBackend(config)
    else:
        return LocalStorageBackend(config)  # Default to local
