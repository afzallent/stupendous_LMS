"""
Privacy utilities for xAPI statements
Handles pseudonymization and PII protection
"""
import hashlib
from django.conf import settings


class PseudonymGenerator:
    """
    Generate consistent pseudonymous identifiers for students
    
    Uses hash-based approach to generate consistent pseudonyms per student
    while maintaining privacy by not storing the mapping.
    
    Validates: Requirements 10.2
    """
    
    # Salt for hashing - should be configured in settings
    PSEUDONYM_SALT = getattr(settings, 'XAPI_PSEUDONYM_SALT', 'xapi-pseudonym-salt')
    
    @classmethod
    def generate_pseudonym(cls, user_id):
        """
        Generate a consistent pseudonym for a user
        
        Args:
            user_id: The user's ID (int or str)
            
        Returns:
            str: A consistent pseudonym in the format "pseudonym-{hash}"
        """
        # Create a hash of user_id + salt
        hash_input = f"{user_id}:{cls.PSEUDONYM_SALT}".encode('utf-8')
        hash_digest = hashlib.sha256(hash_input).hexdigest()[:16]
        
        return f"pseudonym-{hash_digest}"
    
    @classmethod
    def generate_pseudonym_email(cls, user_id):
        """
        Generate a pseudonymous email address for a user
        
        Args:
            user_id: The user's ID (int or str)
            
        Returns:
            str: A pseudonymous email in the format "pseudonym-{hash}@example.com"
        """
        pseudonym = cls.generate_pseudonym(user_id)
        return f"{pseudonym}@example.com"
    
    @classmethod
    def generate_pseudonym_actor(cls, user_id, user_name=None):
        """
        Generate a pseudonymous actor object for xAPI statements
        
        Args:
            user_id: The user's ID (int or str)
            user_name: Optional user name (will be replaced with pseudonym)
            
        Returns:
            dict: An xAPI actor object with pseudonymous identifier
        """
        pseudonym = cls.generate_pseudonym(user_id)
        pseudonym_email = cls.generate_pseudonym_email(user_id)
        
        return {
            'objectType': 'Agent',
            'name': pseudonym,
            'mbox': f'mailto:{pseudonym_email}'
        }


def apply_privacy_settings(statement, config):
    """
    Apply privacy settings to an xAPI statement
    
    Modifies the statement based on privacy configuration:
    - If use_pseudonymous_actors: Replace actor with pseudonym
    - If not include_pii_in_statements: Remove PII fields
    
    Args:
        statement (dict): The xAPI statement to modify
        config (XAPIConfiguration): The privacy configuration
        
    Returns:
        dict: The modified statement with privacy settings applied
    """
    # Make a copy to avoid modifying the original
    statement = dict(statement)
    
    # Apply pseudonymization if enabled
    if config.use_pseudonymous_actors and 'actor' in statement:
        actor = statement['actor']
        
        # Extract user ID if available (from context or other fields)
        # This assumes the statement has been enriched with user_id
        if 'user_id' in actor:
            user_id = actor['user_id']
            statement['actor'] = PseudonymGenerator.generate_pseudonym_actor(user_id)
            # Remove the temporary user_id field
            if 'user_id' in statement['actor']:
                del statement['actor']['user_id']
    
    # Remove PII if not included
    if not config.include_pii_in_statements:
        # Remove email from actor
        if 'actor' in statement and 'mbox' in statement['actor']:
            del statement['actor']['mbox']
        
        # Remove any other PII fields that might be in context
        if 'context' in statement and isinstance(statement['context'], dict):
            # Remove instructor info if present
            if 'instructor' in statement['context']:
                del statement['context']['instructor']
    
    return statement
