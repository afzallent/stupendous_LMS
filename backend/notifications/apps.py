from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        """
        Import signal handlers when the app is ready.

        This ensures that the signal handlers defined in signals.py
        are connected to their respective signals.
        """
        import notifications.signals
