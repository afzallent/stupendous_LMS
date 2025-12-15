"""
xAPI Statement Validator
Validates xAPI statements against the xAPI specification
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import re
from urllib.parse import urlparse


class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, field: Optional[str] = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


class XAPIStatementValidator:
    """
    Validates xAPI statements according to the xAPI specification
    """
    
    # xAPI specification version
    XAPI_VERSION = "1.0.3"
    
    # Valid actor types
    VALID_ACTOR_TYPES = ['Agent', 'Group']
    
    # Valid object types
    VALID_OBJECT_TYPES = ['Activity', 'Agent', 'Group', 'SubStatement', 'StatementRef']
    
    # IRI pattern (simplified)
    IRI_PATTERN = re.compile(r'^[a-zA-Z][a-zA-Z0-9+.-]*:.+')
    
    # ISO 8601 duration pattern
    DURATION_PATTERN = re.compile(r'^P(?:\d+Y)?(?:\d+M)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$')
    
    def validate(self, statement: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate an xAPI statement
        
        Args:
            statement: Dictionary containing the xAPI statement
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            self._validate_statement(statement)
            return True, None
        except ValidationError as e:
            error_msg = f"{e.field}: {e.message}" if e.field else e.message
            return False, error_msg
        except Exception as e:
            return False, f"Unexpected validation error: {str(e)}"
    
    def _validate_statement(self, statement: Dict[str, Any]) -> None:
        """
        Internal validation method that raises ValidationError
        
        Args:
            statement: Dictionary containing the xAPI statement
            
        Raises:
            ValidationError: If the statement is invalid
        """
        if not isinstance(statement, dict):
            raise ValidationError("Statement must be a dictionary")
        
        # Validate required fields
        self._validate_required_fields(statement)
        
        # Validate actor
        self._validate_actor(statement.get('actor'))
        
        # Validate verb
        self._validate_verb(statement.get('verb'))
        
        # Validate object
        self._validate_object(statement.get('object'))
        
        # Validate optional fields if present
        if 'result' in statement:
            self._validate_result(statement['result'])
        
        if 'context' in statement:
            self._validate_context(statement['context'])
        
        if 'timestamp' in statement:
            self._validate_timestamp(statement['timestamp'])
        
        if 'authority' in statement:
            self._validate_authority(statement['authority'])
        
        if 'attachments' in statement:
            self._validate_attachments(statement['attachments'])
    
    def _validate_required_fields(self, statement: Dict[str, Any]) -> None:
        """Validate that required fields are present"""
        required_fields = ['actor', 'verb', 'object']
        
        for field in required_fields:
            if field not in statement:
                raise ValidationError(f"Missing required field", field=field)
            if statement[field] is None:
                raise ValidationError(f"Required field cannot be null", field=field)
    
    def _validate_actor(self, actor: Any) -> None:
        """Validate actor object"""
        if not isinstance(actor, dict):
            raise ValidationError("Actor must be an object", field="actor")
        
        # Validate objectType if present
        object_type = actor.get('objectType', 'Agent')
        if object_type not in self.VALID_ACTOR_TYPES:
            raise ValidationError(
                f"Invalid objectType: {object_type}. Must be one of {self.VALID_ACTOR_TYPES}",
                field="actor.objectType"
            )
        
        # Actor must have at least one Inverse Functional Identifier (IFI)
        ifis = ['mbox', 'mbox_sha1sum', 'openid', 'account']
        has_ifi = any(ifi in actor for ifi in ifis)
        
        if not has_ifi:
            raise ValidationError(
                "Actor must have at least one Inverse Functional Identifier (mbox, mbox_sha1sum, openid, or account)",
                field="actor"
            )
        
        # Validate mbox format if present
        if 'mbox' in actor:
            self._validate_mbox(actor['mbox'], "actor.mbox")
        
        # Validate account if present
        if 'account' in actor:
            self._validate_account(actor['account'], "actor.account")
        
        # Groups must have members
        if object_type == 'Group' and 'member' in actor:
            if not isinstance(actor['member'], list):
                raise ValidationError("Group members must be an array", field="actor.member")
            if len(actor['member']) == 0:
                raise ValidationError("Group must have at least one member", field="actor.member")
    
    def _validate_verb(self, verb: Any) -> None:
        """Validate verb object"""
        if not isinstance(verb, dict):
            raise ValidationError("Verb must be an object", field="verb")
        
        # Verb must have id
        if 'id' not in verb:
            raise ValidationError("Verb must have an 'id' field", field="verb.id")
        
        # Validate IRI format
        self._validate_iri(verb['id'], "verb.id")
        
        # Validate display if present
        if 'display' in verb:
            self._validate_language_map(verb['display'], "verb.display")
    
    def _validate_object(self, obj: Any) -> None:
        """Validate object"""
        if not isinstance(obj, dict):
            raise ValidationError("Object must be an object", field="object")
        
        # Get object type
        object_type = obj.get('objectType', 'Activity')
        
        if object_type not in self.VALID_OBJECT_TYPES:
            raise ValidationError(
                f"Invalid objectType: {object_type}. Must be one of {self.VALID_OBJECT_TYPES}",
                field="object.objectType"
            )
        
        # Activity must have id
        if object_type == 'Activity':
            if 'id' not in obj:
                raise ValidationError("Activity must have an 'id' field", field="object.id")
            self._validate_iri(obj['id'], "object.id")
            
            # Validate definition if present
            if 'definition' in obj:
                self._validate_activity_definition(obj['definition'])
        
        # Agent/Group validation
        elif object_type in ['Agent', 'Group']:
            self._validate_actor(obj)  # Same validation as actor
        
        # SubStatement validation
        elif object_type == 'SubStatement':
            # SubStatement cannot contain another SubStatement
            if obj.get('object', {}).get('objectType') == 'SubStatement':
                raise ValidationError(
                    "SubStatement cannot contain another SubStatement",
                    field="object.object"
                )
            self._validate_statement(obj)
        
        # StatementRef validation
        elif object_type == 'StatementRef':
            if 'id' not in obj:
                raise ValidationError("StatementRef must have an 'id' field", field="object.id")
    
    def _validate_result(self, result: Any) -> None:
        """Validate result object"""
        if not isinstance(result, dict):
            raise ValidationError("Result must be an object", field="result")
        
        # Validate score if present
        if 'score' in result:
            self._validate_score(result['score'])
        
        # Validate duration if present
        if 'duration' in result:
            self._validate_duration(result['duration'])
    
    def _validate_score(self, score: Any) -> None:
        """Validate score object"""
        if not isinstance(score, dict):
            raise ValidationError("Score must be an object", field="result.score")
        
        # Validate scaled score if present
        if 'scaled' in score:
            scaled = score['scaled']
            if not isinstance(scaled, (int, float)):
                raise ValidationError("Scaled score must be a number", field="result.score.scaled")
            if scaled < -1 or scaled > 1:
                raise ValidationError(
                    "Scaled score must be between -1 and 1",
                    field="result.score.scaled"
                )
        
        # Validate raw, min, max if present
        for field in ['raw', 'min', 'max']:
            if field in score:
                if not isinstance(score[field], (int, float)):
                    raise ValidationError(
                        f"Score {field} must be a number",
                        field=f"result.score.{field}"
                    )
        
        # Validate raw is between min and max if all present
        if all(k in score for k in ['raw', 'min', 'max']):
            if not (score['min'] <= score['raw'] <= score['max']):
                raise ValidationError(
                    "Score raw must be between min and max",
                    field="result.score.raw"
                )
    
    def _validate_context(self, context: Any) -> None:
        """Validate context object"""
        if not isinstance(context, dict):
            raise ValidationError("Context must be an object", field="context")
        
        # Validate instructor if present
        if 'instructor' in context:
            self._validate_actor(context['instructor'])
        
        # Validate team if present
        if 'team' in context:
            team = context['team']
            if not isinstance(team, dict):
                raise ValidationError("Team must be an object", field="context.team")
            if team.get('objectType') != 'Group':
                raise ValidationError("Team must be a Group", field="context.team")
    
    def _validate_timestamp(self, timestamp: Any) -> None:
        """Validate timestamp format (ISO 8601)"""
        if not isinstance(timestamp, str):
            raise ValidationError("Timestamp must be a string", field="timestamp")
        
        # Try to parse as ISO 8601
        try:
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            raise ValidationError(
                "Timestamp must be in ISO 8601 format",
                field="timestamp"
            )
    
    def _validate_authority(self, authority: Any) -> None:
        """Validate authority object"""
        if not isinstance(authority, dict):
            raise ValidationError("Authority must be an object", field="authority")
        
        # Authority is an Agent or Group
        self._validate_actor(authority)
    
    def _validate_attachments(self, attachments: Any) -> None:
        """Validate attachments array"""
        if not isinstance(attachments, list):
            raise ValidationError("Attachments must be an array", field="attachments")
        
        for i, attachment in enumerate(attachments):
            if not isinstance(attachment, dict):
                raise ValidationError(
                    f"Attachment {i} must be an object",
                    field=f"attachments[{i}]"
                )
            
            # Required fields for attachments
            required = ['usageType', 'display', 'contentType', 'length', 'sha2']
            for field in required:
                if field not in attachment:
                    raise ValidationError(
                        f"Attachment missing required field: {field}",
                        field=f"attachments[{i}].{field}"
                    )
    
    def _validate_activity_definition(self, definition: Any) -> None:
        """Validate activity definition"""
        if not isinstance(definition, dict):
            raise ValidationError("Activity definition must be an object", field="object.definition")
        
        # Validate name if present
        if 'name' in definition:
            self._validate_language_map(definition['name'], "object.definition.name")
        
        # Validate description if present
        if 'description' in definition:
            self._validate_language_map(definition['description'], "object.definition.description")
        
        # Validate type if present
        if 'type' in definition:
            self._validate_iri(definition['type'], "object.definition.type")
    
    def _validate_iri(self, iri: Any, field: str) -> None:
        """Validate IRI format"""
        if not isinstance(iri, str):
            raise ValidationError("IRI must be a string", field=field)
        
        if not self.IRI_PATTERN.match(iri):
            raise ValidationError(f"Invalid IRI format: {iri}", field=field)
        
        # Additional validation: must be a valid URL
        try:
            result = urlparse(iri)
            if not all([result.scheme, result.netloc or result.path]):
                raise ValidationError(f"Invalid IRI format: {iri}", field=field)
        except Exception:
            raise ValidationError(f"Invalid IRI format: {iri}", field=field)
    
    def _validate_mbox(self, mbox: Any, field: str) -> None:
        """Validate mbox (mailto: IRI)"""
        if not isinstance(mbox, str):
            raise ValidationError("Mbox must be a string", field=field)
        
        if not mbox.startswith('mailto:'):
            raise ValidationError("Mbox must start with 'mailto:'", field=field)
        
        # Extract email and validate format
        email = mbox[7:]  # Remove 'mailto:'
        if '@' not in email or '.' not in email.split('@')[1]:
            raise ValidationError(f"Invalid email format in mbox: {mbox}", field=field)
    
    def _validate_account(self, account: Any, field: str) -> None:
        """Validate account object"""
        if not isinstance(account, dict):
            raise ValidationError("Account must be an object", field=field)
        
        if 'homePage' not in account:
            raise ValidationError("Account must have 'homePage'", field=f"{field}.homePage")
        
        if 'name' not in account:
            raise ValidationError("Account must have 'name'", field=f"{field}.name")
        
        self._validate_iri(account['homePage'], f"{field}.homePage")
    
    def _validate_language_map(self, lang_map: Any, field: str) -> None:
        """Validate language map"""
        if not isinstance(lang_map, dict):
            raise ValidationError("Language map must be an object", field=field)
        
        if len(lang_map) == 0:
            raise ValidationError("Language map cannot be empty", field=field)
        
        # All values must be strings
        for key, value in lang_map.items():
            if not isinstance(value, str):
                raise ValidationError(
                    f"Language map values must be strings",
                    field=f"{field}.{key}"
                )
    
    def _validate_duration(self, duration: Any) -> None:
        """Validate ISO 8601 duration"""
        if not isinstance(duration, str):
            raise ValidationError("Duration must be a string", field="result.duration")
        
        if not self.DURATION_PATTERN.match(duration):
            raise ValidationError(
                "Duration must be in ISO 8601 format (e.g., PT1H30M)",
                field="result.duration"
            )
