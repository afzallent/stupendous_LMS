"""
Utility functions for media handling.
"""
import os
import uuid
from django.core.exceptions import ValidationError
from .models import MediaStorageConfig
from .storage import get_storage_backend
from .image_processing import ImageTranscoder


def generate_unique_filename(original_filename, media_type='video'):
    """
    Generate a unique filename while preserving the extension.
    
    Args:
        original_filename: Original filename
        media_type: Type of media ('video', 'thumbnail', 'avatar')
    
    Returns:
        Unique filename string
    """
    ext = os.path.splitext(original_filename)[1].lower()
    unique_id = uuid.uuid4().hex
    return f"{media_type}_{unique_id}{ext}"


def validate_file_size(file, media_type='video'):
    """
    Validate file size against configured limits.
    
    Args:
        file: File object
        media_type: Type of media ('video', 'thumbnail', 'avatar')
    
    Raises:
        ValidationError: If file size exceeds limit
    """
    config = MediaStorageConfig.get_config()
    
    # Get file size in MB
    file_size_mb = file.size / (1024 * 1024)
    
    # Get appropriate limit
    if media_type == 'video':
        max_size = config.max_video_size_mb
    else:  # images (thumbnail, avatar)
        max_size = config.max_image_size_mb
    
    if file_size_mb > max_size:
        raise ValidationError(
            f"File size ({file_size_mb:.2f} MB) exceeds maximum allowed size ({max_size} MB)"
        )


def validate_file_type(file, media_type='video'):
    """
    Validate file type.
    
    Args:
        file: File object
        media_type: Type of media ('video', 'thumbnail', 'avatar')
    
    Raises:
        ValidationError: If file type is not allowed
    """
    filename = file.name.lower()
    
    if media_type == 'video':
        allowed_extensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv']
        if not any(filename.endswith(ext) for ext in allowed_extensions):
            raise ValidationError(
                f"Invalid video file type. Allowed types: {', '.join(allowed_extensions)}"
            )
    else:  # images
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']
        if not any(filename.endswith(ext) for ext in allowed_extensions):
            raise ValidationError(
                f"Invalid image file type. Allowed types: {', '.join(allowed_extensions)}"
            )


def save_uploaded_file(file, media_type='video', transcode_images=True):
    """
    Save an uploaded file using the configured storage backend.
    
    Args:
        file: Django UploadedFile object
        media_type: Type of media ('video', 'thumbnail', 'avatar')
        transcode_images: Whether to transcode images (default: True)
    
    Returns:
        Dictionary with file information:
        {
            'filename': str,
            'url': str,
            'size': int,
            'transcoded': bool
        }
    
    Raises:
        ValidationError: If file validation fails
    """
    # Validate file
    validate_file_size(file, media_type)
    validate_file_type(file, media_type)
    
    # Generate unique filename
    original_filename = file.name
    unique_filename = generate_unique_filename(original_filename, media_type)
    
    # Process images if needed
    transcoded = False
    file_content = file
    
    if media_type in ['thumbnail', 'avatar'] and transcode_images:
        config = MediaStorageConfig.get_config()
        if config.enable_image_transcoding:
            transcoder = ImageTranscoder(config)
            
            # Transcode the image
            transcoded_content = transcoder.transcode(file, original_filename)
            
            # Update filename extension if format changed
            new_ext = transcoder.get_output_extension(original_filename)
            unique_filename = os.path.splitext(unique_filename)[0] + new_ext
            
            file_content = transcoded_content
            transcoded = True
    
    # Save using appropriate storage backend
    backend = get_storage_backend(media_type)
    saved_path = backend.save(unique_filename, file_content, media_type)
    url = backend.url(unique_filename, media_type)
    
    return {
        'filename': unique_filename,
        'url': url,
        'size': file.size,
        'transcoded': transcoded,
        'original_filename': original_filename
    }


def delete_file(filename, media_type='video'):
    """
    Delete a file using the configured storage backend.
    
    Args:
        filename: Name of the file to delete
        media_type: Type of media ('video', 'thumbnail', 'avatar')
    
    Returns:
        Boolean indicating success
    """
    backend = get_storage_backend(media_type)
    return backend.delete(filename, media_type)


def get_file_url(filename, media_type='video'):
    """
    Get the URL for a file.
    
    Args:
        filename: Name of the file
        media_type: Type of media ('video', 'thumbnail', 'avatar')
    
    Returns:
        URL string
    """
    backend = get_storage_backend(media_type)
    return backend.url(filename, media_type)
