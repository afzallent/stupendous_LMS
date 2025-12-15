"""
xAPI Verb model for verb registry
"""
from django.db import models


class XAPIVerb(models.Model):
    """
    Registry of xAPI verbs used in the system
    Stores common verbs for consistency and reference
    """
    iri = models.URLField(
        unique=True,
        help_text="IRI identifying the verb (e.g., http://adlnet.gov/expapi/verbs/completed)"
    )
    display = models.JSONField(
        help_text="Language map for verb display (e.g., {'en-US': 'completed'})"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of when to use this verb"
    )
    
    class Meta:
        ordering = ['iri']
        verbose_name = 'xAPI Verb'
        verbose_name_plural = 'xAPI Verbs'
    
    def __str__(self):
        return self.display.get('en-US', self.iri)
