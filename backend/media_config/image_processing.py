"""
Image transcoding utilities for security and optimization.
Prevents code injection through embedded malicious data in images.
"""
from PIL import Image
from io import BytesIO
import os


class ImageTranscoder:
    """
    Handles image transcoding for security and optimization.
    
    Security benefits:
    - Strips all EXIF and metadata that could contain malicious code
    - Re-encodes the image, removing any embedded scripts or exploits
    - Validates image format and structure
    - Prevents polyglot file attacks
    """
    
    def __init__(self, config=None):
        """
        Initialize transcoder with configuration.
        
        Args:
            config: MediaStorageConfig instance (optional, will fetch if not provided)
        """
        if config is None:
            from .models import MediaStorageConfig
            config = MediaStorageConfig.get_config()
        
        self.config = config
        self.enabled = config.enable_image_transcoding
        self.output_format = config.image_output_format
        self.quality = config.image_quality
        self.max_width = config.max_image_width
        self.max_height = config.max_image_height
        self.strip_metadata = config.strip_image_metadata
    
    def transcode(self, image_file, filename=None):
        """
        Transcode an image for security and optimization.
        
        Args:
            image_file: File object or bytes
            filename: Original filename (optional, used for format detection)
        
        Returns:
            BytesIO object containing the transcoded image
        
        Raises:
            ValueError: If image is invalid or processing fails
        """
        if not self.enabled:
            # If transcoding is disabled, return original
            if hasattr(image_file, 'read'):
                return BytesIO(image_file.read())
            return BytesIO(image_file)
        
        try:
            # Open and validate the image
            if hasattr(image_file, 'read'):
                img = Image.open(image_file)
            else:
                img = Image.open(BytesIO(image_file))
            
            # Verify it's actually an image (prevents polyglot attacks)
            img.verify()
            
            # Reopen for processing (verify() closes the file)
            if hasattr(image_file, 'seek'):
                image_file.seek(0)
                img = Image.open(image_file)
            else:
                img = Image.open(BytesIO(image_file))
            
            # Convert RGBA to RGB if saving as JPEG or WebP
            if img.mode in ('RGBA', 'LA', 'P') and self.output_format not in ['png', 'original']:
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            
            # Resize if image exceeds maximum dimensions
            if img.width > self.max_width or img.height > self.max_height:
                img.thumbnail((self.max_width, self.max_height), Image.Resampling.LANCZOS)
            
            # Determine output format
            if self.output_format == 'original':
                # Keep original format but still re-encode for security
                output_format = img.format or 'JPEG'
            elif self.output_format == 'webp':
                output_format = 'WEBP'
            elif self.output_format == 'avif':
                output_format = 'AVIF'
            else:
                output_format = 'JPEG'
            
            # Create output buffer
            output = BytesIO()
            
            # Save with appropriate settings
            save_kwargs = {
                'format': output_format,
                'quality': self.quality,
                'optimize': True,
            }
            
            # Strip metadata if configured
            if self.strip_metadata:
                save_kwargs['exif'] = b''  # Remove EXIF data
            
            # Format-specific optimizations
            if output_format == 'WEBP':
                save_kwargs['method'] = 6  # Better compression
            elif output_format == 'AVIF':
                save_kwargs['speed'] = 4  # Balance between speed and compression
            
            img.save(output, **save_kwargs)
            output.seek(0)
            
            return output
            
        except Exception as e:
            raise ValueError(f"Failed to process image: {str(e)}")
    
    def get_output_extension(self, original_filename=None):
        """
        Get the appropriate file extension for the output format.
        
        Args:
            original_filename: Original filename (optional)
        
        Returns:
            File extension string (e.g., '.webp', '.jpg')
        """
        if self.output_format == 'original' and original_filename:
            # Keep original extension
            return os.path.splitext(original_filename)[1].lower()
        elif self.output_format == 'webp':
            return '.webp'
        elif self.output_format == 'avif':
            return '.avif'
        else:
            return '.jpg'
    
    def is_valid_image(self, image_file):
        """
        Check if a file is a valid image.
        
        Args:
            image_file: File object or bytes
        
        Returns:
            Boolean indicating if file is a valid image
        """
        try:
            if hasattr(image_file, 'read'):
                img = Image.open(image_file)
            else:
                img = Image.open(BytesIO(image_file))
            
            img.verify()
            return True
        except:
            return False
    
    def get_image_info(self, image_file):
        """
        Get information about an image.
        
        Args:
            image_file: File object or bytes
        
        Returns:
            Dictionary with image information
        """
        try:
            if hasattr(image_file, 'read'):
                img = Image.open(image_file)
            else:
                img = Image.open(BytesIO(image_file))
            
            return {
                'format': img.format,
                'mode': img.mode,
                'width': img.width,
                'height': img.height,
                'size_bytes': len(image_file.read()) if hasattr(image_file, 'read') else len(image_file),
            }
        except Exception as e:
            return {'error': str(e)}


def transcode_image(image_file, filename=None):
    """
    Convenience function to transcode an image using current configuration.
    
    Args:
        image_file: File object or bytes
        filename: Original filename (optional)
    
    Returns:
        BytesIO object containing transcoded image
    """
    transcoder = ImageTranscoder()
    return transcoder.transcode(image_file, filename)


def validate_image(image_file):
    """
    Convenience function to validate an image.
    
    Args:
        image_file: File object or bytes
    
    Returns:
        Boolean indicating if file is a valid image
    """
    transcoder = ImageTranscoder()
    return transcoder.is_valid_image(image_file)
