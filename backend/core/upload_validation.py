"""
Content-based validation for user uploads.

The upload endpoints previously validated only `UploadedFile.content_type`,
which is supplied by the client and is trivially spoofed. Because uploaded
media is served from the application's own origin, a file named `x.html` sent
with `Content-Type: image/jpeg` would be stored happily and then served as
HTML — stored XSS, and with JWTs kept in localStorage that means token theft.

Everything here therefore inspects real bytes and generates its own filenames.
See PRODUCTION_READINESS.md (P2-3).
"""
import uuid
from pathlib import Path

from PIL import Image, UnidentifiedImageError

# Pillow format name -> canonical extension we are willing to store.
ALLOWED_IMAGE_FORMATS = {
    'JPEG': '.jpg',
    'PNG': '.png',
    'GIF': '.gif',
    'WEBP': '.webp',
}

# Leading magic bytes for the container formats we accept for video.
VIDEO_MAGIC_SIGNATURES = (
    (b'\x1aE\xdf\xa3', '.webm'),          # Matroska / WebM
    (b'OggS', '.ogv'),                    # Ogg
)
# ISO base media (MP4, M4V, MOV) carries 'ftyp' at offset 4.
ISO_BMFF_BRAND_OFFSET = 4
ISO_BMFF_MAGIC = b'ftyp'


def _random_name(extension):
    """Server-generated filename; never derived from client input."""
    return f"{uuid.uuid4().hex}{extension}"


def validate_image_upload(uploaded_file, max_pixels=50_000_000):
    """
    Confirm `uploaded_file` decodes as an allowed image type.

    Returns (is_valid, error_message, safe_filename). The file pointer is
    rewound so the caller can still save it.

    `max_pixels` guards against decompression-bomb images whose declared
    dimensions would exhaust memory when rendered.
    """
    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as image:
            image_format = image.format
            width, height = image.size
            # verify() checks structural integrity without decoding pixels.
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        return False, 'File is not a valid image.', None
    finally:
        uploaded_file.seek(0)

    if image_format not in ALLOWED_IMAGE_FORMATS:
        allowed = ', '.join(sorted(ALLOWED_IMAGE_FORMATS))
        return False, f'Unsupported image format. Allowed: {allowed}.', None

    if width * height > max_pixels:
        return False, 'Image dimensions are too large.', None

    return True, None, _random_name(ALLOWED_IMAGE_FORMATS[image_format])


def validate_video_upload(uploaded_file):
    """
    Confirm `uploaded_file` starts with a recognised video container header.

    Returns (is_valid, error_message, safe_filename). This is a header check,
    not a full demux: it is enough to stop an HTML or script payload being
    stored under a video content type, which is the actual risk here.
    """
    try:
        uploaded_file.seek(0)
        header = uploaded_file.read(32)
    finally:
        uploaded_file.seek(0)

    if len(header) < 12:
        return False, 'File is not a valid video.', None

    for signature, extension in VIDEO_MAGIC_SIGNATURES:
        if header.startswith(signature):
            return True, None, _random_name(extension)

    if header[ISO_BMFF_BRAND_OFFSET:ISO_BMFF_BRAND_OFFSET + 4] == ISO_BMFF_MAGIC:
        return True, None, _random_name('.mp4')

    return False, 'File is not a supported video format (MP4, WebM or Ogg).', None


def validate_document_upload(uploaded_file, original_filename):
    """
    Confirm `uploaded_file` is a PDF, Word document or plain text file.

    Returns (is_valid, error_message, safe_filename). HTML and SVG are
    deliberately not accepted: both execute script when served inline.
    """
    try:
        uploaded_file.seek(0)
        header = uploaded_file.read(8)
    finally:
        uploaded_file.seek(0)

    suffix = Path(original_filename or '').suffix.lower()

    if header.startswith(b'%PDF-'):
        return True, None, _random_name('.pdf')

    # DOCX is a ZIP container; legacy DOC is an OLE compound file.
    if header.startswith(b'PK\x03\x04') and suffix == '.docx':
        return True, None, _random_name('.docx')
    if header.startswith(b'\xd0\xcf\x11\xe0') and suffix == '.doc':
        return True, None, _random_name('.doc')

    if suffix == '.txt':
        try:
            uploaded_file.seek(0)
            uploaded_file.read(4096).decode('utf-8')
        except UnicodeDecodeError:
            return False, 'Text files must be valid UTF-8.', None
        finally:
            uploaded_file.seek(0)
        return True, None, _random_name('.txt')

    return False, 'Unsupported document type. Allowed: PDF, DOC, DOCX, TXT.', None
