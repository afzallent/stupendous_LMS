"""
Encrypted model fields for secrets that must live in the database.

Some credentials are configured through the Django admin rather than the
environment — SMTP passwords in `core.SiteSettings`, S3 and file-server
credentials in `media_config.MediaStorageConfig`. Those were plain
`CharField`s, so any database dump, replica, or backup exposed them in clear
text. See PRODUCTION_READINESS.md (P2-7).

This provides transparent Fernet (AES-128-CBC + HMAC-SHA256) encryption at
rest. It protects against dump/backup/replica exposure. It does not protect
against an attacker with application-level code execution, who can read the
key — for that, move the secret to a dedicated secrets manager and store only
a reference here.

Key management
--------------
Set `FIELD_ENCRYPTION_KEY` to a Fernet key:

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

If unset, the key is derived from `SECRET_KEY`. That works, but couples the
two: **rotating SECRET_KEY then makes every encrypted value undecryptable.**
Set an explicit `FIELD_ENCRYPTION_KEY` in any deployment you intend to keep.
"""
import base64

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.conf import settings
from django.db import models

# Marks a stored value as produced by this field, so plaintext written before
# encryption was introduced can be recognised and passed through unchanged.
_PREFIX = 'enc$v1$'


def _build_fernet():
    """Return a Fernet instance from the configured or derived key."""
    explicit = getattr(settings, 'FIELD_ENCRYPTION_KEY', '')
    if explicit:
        return Fernet(explicit.encode() if isinstance(explicit, str) else explicit)

    # Derive a stable 32-byte key from SECRET_KEY. HKDF with a fixed info
    # string keeps this key distinct from any other SECRET_KEY-derived
    # material (session signing, password reset tokens, JWTs).
    derived = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'lms-field-encryption-v1',
    ).derive(settings.SECRET_KEY.encode())
    return Fernet(base64.urlsafe_b64encode(derived))


_fernet = None


def get_fernet():
    """Lazily build and cache the Fernet instance."""
    global _fernet
    if _fernet is None:
        _fernet = _build_fernet()
    return _fernet


class EncryptedCharField(models.CharField):
    """
    A CharField whose value is encrypted at rest.

    Reads tolerate plaintext so that rows written before this field was
    introduced keep working; they are re-encrypted the next time they are
    saved (or all at once by a data migration).
    """

    description = "CharField encrypted at rest with Fernet"

    def __init__(self, *args, **kwargs):
        # Ciphertext is substantially longer than plaintext (base64 of
        # IV + ciphertext + HMAC). Reserve room so a valid secret cannot be
        # truncated on write.
        kwargs.setdefault('max_length', 500)
        super().__init__(*args, **kwargs)

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value in (None, ''):
            return value
        if value.startswith(_PREFIX):
            # Already encrypted (e.g. re-saving a value loaded from the DB
            # without touching it).
            return value
        token = get_fernet().encrypt(value.encode()).decode()
        return f'{_PREFIX}{token}'

    def from_db_value(self, value, expression, connection):
        if value in (None, ''):
            return value
        if not value.startswith(_PREFIX):
            # Legacy plaintext written before encryption was introduced.
            return value
        try:
            return get_fernet().decrypt(value[len(_PREFIX):].encode()).decode()
        except InvalidToken:
            # Wrong key — almost always a rotated SECRET_KEY with no explicit
            # FIELD_ENCRYPTION_KEY set. Fail loudly rather than silently
            # handing back ciphertext that would be used as a password.
            raise ValueError(
                f"Could not decrypt {self.model.__name__}.{self.name}. The "
                "encryption key has changed. Set FIELD_ENCRYPTION_KEY to the "
                "original value, or clear and re-enter this credential."
            )


class EncryptedTextField(models.TextField):
    """TextField variant of EncryptedCharField, for longer secrets."""

    description = "TextField encrypted at rest with Fernet"

    get_prep_value = EncryptedCharField.get_prep_value
    from_db_value = EncryptedCharField.from_db_value
