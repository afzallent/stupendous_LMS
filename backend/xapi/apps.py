from django.apps import AppConfig


class XapiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'xapi'
    verbose_name = 'xAPI Learning Record Store'
    
    def ready(self):
        """Import signals when the app is ready"""
        import xapi.signals  # noqa: F401
