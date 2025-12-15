"""
xAPI Statement Store
Handles storage and retrieval of xAPI statements in the Learning Record Store (LRS)
"""
import uuid
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from django.utils import timezone
from django.db import transaction

from xapi.models.statement import XAPIStatement
from xapi.validators import XAPIStatementValidator, ValidationError


class StatementStoreError(Exception):
    """Exception raised for statement storage errors"""
    pass


class XAPIStatementStore:
    """
    xAPI Learning Record Store (LRS) implementation
    Handles storage and retrieval of xAPI statements
    """
    
    def __init__(self):
        self.validator = XAPIStatementValidator()
    
    def store_statement(self, statement: Dict[str, Any]) -> uuid.UUID:
        """
        Store a single xAPI statement in the LRS
        
        Args:
            statement: Dictionary containing the xAPI statement
            
        Returns:
            UUID of the stored statement
            
        Raises:
            ValidationError: If the statement is invalid
            StatementStoreError: If storage fails
        """
        # Validate the statement
        is_valid, error_message = self.validator.validate(statement)
        if not is_valid:
            raise ValidationError(error_message)
        
        try:
            # Generate UUID if not provided
            statement_id = statement.get('id')
            if statement_id:
                statement_id = uuid.UUID(statement_id)
            else:
                statement_id = uuid.uuid4()
                statement['id'] = str(statement_id)
            
            # Generate timestamp if not provided
            if 'timestamp' not in statement:
                statement['timestamp'] = timezone.now().isoformat()
            
            # Extract and store the statement
            xapi_statement = self._create_statement_model(statement, statement_id)
            xapi_statement.save()
            
            return statement_id
            
        except Exception as e:
            raise StatementStoreError(f"Failed to store statement: {str(e)}")
    
    def store_statements(self, statements: List[Dict[str, Any]]) -> List[uuid.UUID]:
        """
        Store multiple xAPI statements in a batch operation
        
        Args:
            statements: List of statement dictionaries
            
        Returns:
            List of UUIDs for the stored statements
            
        Raises:
            ValidationError: If any statement is invalid
            StatementStoreError: If storage fails
        """
        if not isinstance(statements, list):
            raise ValidationError("Statements must be provided as a list")
        
        if len(statements) == 0:
            return []
        
        statement_ids = []
        
        try:
            with transaction.atomic():
                for statement in statements:
                    statement_id = self.store_statement(statement)
                    statement_ids.append(statement_id)
            
            return statement_ids
            
        except Exception as e:
            raise StatementStoreError(f"Failed to store statements: {str(e)}")
    
    def get_statement(self, statement_id: Union[str, uuid.UUID]) -> Optional[Dict[str, Any]]:
        """
        Retrieve a statement by its ID
        
        Args:
            statement_id: UUID of the statement
            
        Returns:
            Statement dictionary or None if not found
        """
        try:
            if isinstance(statement_id, str):
                statement_id = uuid.UUID(statement_id)
            
            xapi_statement = XAPIStatement.objects.get(
                statement_id=statement_id,
                voided=False
            )
            
            return xapi_statement.statement_json
            
        except XAPIStatement.DoesNotExist:
            return None
        except ValueError:
            return None
    
    def query_statements(
        self,
        agent: Optional[Dict[str, Any]] = None,
        verb: Optional[str] = None,
        activity: Optional[str] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Query statements with filters
        
        Args:
            agent: Agent filter (actor)
            verb: Verb IRI filter
            activity: Activity IRI filter
            since: Start timestamp filter
            until: End timestamp filter
            limit: Maximum number of results
            offset: Offset for pagination
            
        Returns:
            Dictionary with 'statements' list and 'more' pagination info
        """
        queryset = XAPIStatement.objects.filter(voided=False)
        
        # Apply filters
        if agent:
            # Filter by agent mbox if provided
            if 'mbox' in agent:
                queryset = queryset.filter(actor_mbox=agent['mbox'].replace('mailto:', ''))
            elif 'account' in agent:
                account = agent['account']
                queryset = queryset.filter(
                    actor_account_name=account.get('name'),
                    actor_account_homepage=account.get('homePage')
                )
        
        if verb:
            queryset = queryset.filter(verb_id=verb)
        
        if activity:
            queryset = queryset.filter(object_id=activity)
        
        if since:
            queryset = queryset.filter(timestamp__gte=since)
        
        if until:
            queryset = queryset.filter(timestamp__lte=until)
        
        # Order by timestamp descending
        queryset = queryset.order_by('-timestamp')
        
        # Get total count for pagination
        total_count = queryset.count()
        
        # Apply pagination
        statements = queryset[offset:offset + limit]
        
        # Build result
        result = {
            'statements': [stmt.statement_json for stmt in statements],
            'more': ''
        }
        
        # Add pagination info if there are more results
        if offset + limit < total_count:
            result['more'] = f'/xapi/statements/?offset={offset + limit}&limit={limit}'
        
        return result
    
    def void_statement(self, statement_id: Union[str, uuid.UUID]) -> bool:
        """
        Void a statement (mark as voided)
        
        Args:
            statement_id: UUID of the statement to void
            
        Returns:
            True if successful, False if statement not found
        """
        try:
            if isinstance(statement_id, str):
                statement_id = uuid.UUID(statement_id)
            
            xapi_statement = XAPIStatement.objects.get(statement_id=statement_id)
            xapi_statement.voided = True
            xapi_statement.save()
            
            return True
            
        except XAPIStatement.DoesNotExist:
            return False
    
    def _create_statement_model(
        self,
        statement: Dict[str, Any],
        statement_id: uuid.UUID
    ) -> XAPIStatement:
        """
        Create an XAPIStatement model instance from a statement dictionary
        
        Args:
            statement: Statement dictionary
            statement_id: UUID for the statement
            
        Returns:
            XAPIStatement model instance (not saved)
        """
        # Extract actor information
        actor = statement['actor']
        actor_type = actor.get('objectType', 'Agent')
        actor_name = actor.get('name', '')
        actor_mbox = None
        actor_account_name = None
        actor_account_homepage = None
        
        if 'mbox' in actor:
            actor_mbox = actor['mbox'].replace('mailto:', '')
        elif 'account' in actor:
            actor_account_name = actor['account'].get('name')
            actor_account_homepage = actor['account'].get('homePage')
        
        # Extract verb information
        verb = statement['verb']
        verb_id = verb['id']
        verb_display = verb.get('display', {})
        
        # Extract object information
        obj = statement['object']
        object_type = obj.get('objectType', 'Activity')
        object_id = obj.get('id', '')
        
        # Extract result information if present
        result = statement.get('result', {})
        result_score_scaled = None
        result_score_raw = None
        result_score_min = None
        result_score_max = None
        result_success = None
        result_completion = None
        result_duration = ''
        
        if result:
            score = result.get('score', {})
            result_score_scaled = score.get('scaled')
            result_score_raw = score.get('raw')
            result_score_min = score.get('min')
            result_score_max = score.get('max')
            result_success = result.get('success')
            result_completion = result.get('completion')
            result_duration = result.get('duration', '')
        
        # Extract context if present
        context_json = statement.get('context')
        
        # Extract authority if present
        authority_json = statement.get('authority')
        
        # Parse timestamp
        timestamp_str = statement.get('timestamp')
        if timestamp_str:
            # Handle ISO 8601 format with Z suffix
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        else:
            timestamp = timezone.now()
        
        # Create the model instance
        xapi_statement = XAPIStatement(
            statement_id=statement_id,
            actor_type=actor_type,
            actor_name=actor_name,
            actor_mbox=actor_mbox,
            actor_account_name=actor_account_name,
            actor_account_homepage=actor_account_homepage,
            actor_json=actor,
            verb_id=verb_id,
            verb_display=verb_display,
            object_type=object_type,
            object_id=object_id,
            object_json=obj,
            result_score_scaled=result_score_scaled,
            result_score_raw=result_score_raw,
            result_score_min=result_score_min,
            result_score_max=result_score_max,
            result_success=result_success,
            result_completion=result_completion,
            result_duration=result_duration,
            result_json=result if result else None,
            context_json=context_json,
            timestamp=timestamp,
            authority_json=authority_json,
            statement_json=statement,
            voided=False
        )
        
        return xapi_statement
