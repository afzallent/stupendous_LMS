"""
xAPI Activity Type model for activity type registry
"""
from django.db import models


class XAPIActivityType(models.Model):
    """
    Registry of xAPI activity types
    Stores common activity types for consistency and reference
    """
    iri = models.URLField(
        unique=True,
        help_text="IRI identifying the activity type (e.g., http://adlnet.gov/expapi/activities/lesson)"
    )
    display = models.JSONField(
        help_text="Language map for activity type display (e.g., {'en-US': 'lesson'})"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of this activity type"
    )
    
    class Meta:
        ordering = ['iri']
        verbose_name = 'xAPI Activity Type'
        verbose_name_plural = 'xAPI Activity Types'
    
    def __str__(self):
        return self.display.get('en-US', self.iri)
