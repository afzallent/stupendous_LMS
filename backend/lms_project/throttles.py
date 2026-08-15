"""
Named throttle classes for sensitive endpoints.

Rates are configured under REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] in
settings.py and are overridable per environment.

These exist as explicit classes because DRF's @action decorator rejects a
`throttle_scope` keyword (it is validated against the viewset's attributes),
so scoped throttling on a viewset action has to be applied via
`throttle_classes=[...]`.
"""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Throttle unauthenticated credential submission by client IP."""
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    """Throttle account creation by client IP."""
    scope = 'register'


class PasswordResetRateThrottle(AnonRateThrottle):
    """
    Throttle password-reset requests by client IP.

    This endpoint sends mail to an address chosen by the caller, so without a
    limit it is an open relay for abuse and will damage sending reputation.
    """
    scope = 'password_reset'


class UploadRateThrottle(UserRateThrottle):
    """Throttle authenticated file uploads per user."""
    scope = 'upload'


class SensitiveActionThrottle(UserRateThrottle):
    """
    Throttle authenticated endpoints that must not be brute-forced, such as
    coupon validation and coupon redemption.
    """
    scope = 'login'
