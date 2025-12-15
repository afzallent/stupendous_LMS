"""
xAPI Statements API Views
Implements xAPI LRS endpoints for statement submission and retrieval
"""
import json
import uuid
from datetime import datetime
from typing import Dict, Any

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse

from xapi.statement_store import XAPIStatementStore, StatementStoreError
from xapi.validators import ValidationError
from xapi.authentication import XAPIAuthentication


class StatementsView(APIView):
    """
    xAPI Statements endpoint
    
    Handles:
    - POST /xapi/statements/ - Submit single or multiple statements
    - GET /xapi/statements/ - Query statements with filters
    - PUT /xapi/statements/?statementId={uuid} - Store statement with specific ID
    - GET /xapi/statements/?statementId={uuid} - Retrieve specific statement
    
    Authentication:
    - Supports HTTP Basic Auth (Authorization: Basic <base64>)
    - Supports Token Auth (Authorization: Token <token>)
    - Supports Bearer tokens (Authorization: Bearer <token>)
    """
    
    authentication_classes = [XAPIAuthentication]
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.store = XAPIStatementStore()
    
    def post(self, request):
        """
        POST /xapi/statements/
        
        Submit one or more xAPI statements
        
        Request body can be:
        - Single statement (JSON object)
        - Array of statements (JSON array)
        
        Returns:
        - 200 OK with statement ID(s)
        - 400 Bad Request if validation fails
        - 500 Internal Server Error if storage fails
        """
        try:
            # Parse request body
            data = request.data
            
            # Determine if single statement or batch
            is_batch = isinstance(data, list)
            
            if is_batch:
                # Store multiple statements
                statement_ids = self.store.store_statements(data)
                
                # Return array of statement IDs
                return Response(
                    [str(sid) for sid in statement_ids],
                    status=status.HTTP_200_OK,
                    content_type='application/json'
                )
            else:
                # Store single statement
                statement_id = self.store.store_statement(data)
                
                # Return single statement ID in array (per xAPI spec)
                return Response(
                    [str(statement_id)],
                    status=status.HTTP_200_OK,
                    content_type='application/json'
                )
        
        except ValidationError as e:
            return Response(
                {'error': 'Validation failed', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except StatementStoreError as e:
            return Response(
                {'error': 'Storage failed', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            return Response(
                {'error': 'Internal server error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """
        PUT /xapi/statements/?statementId={uuid}
        
        Store a statement with a specific ID
        
        Query parameters:
        - statementId: UUID for the statement
        
        Returns:
        - 204 No Content on success
        - 400 Bad Request if validation fails or statementId missing
        - 409 Conflict if statement ID already exists
        - 500 Internal Server Error if storage fails
        """
        try:
            # Get statement ID from query parameters
            statement_id_str = request.query_params.get('statementId')
            
            if not statement_id_str:
                return Response(
                    {'error': 'Missing statementId query parameter'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate UUID format
            try:
                statement_id = uuid.UUID(statement_id_str)
            except ValueError:
                return Response(
                    {'error': 'Invalid UUID format for statementId'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse request body
            data = request.data
            
            # Add the statement ID to the data
            data['id'] = str(statement_id)
            
            # Check if statement already exists
            existing = self.store.get_statement(statement_id)
            if existing:
                # Check if it's the same statement (idempotent PUT)
                if existing == data:
                    return Response(status=status.HTTP_204_NO_CONTENT)
                else:
                    return Response(
                        {'error': 'Statement with this ID already exists and differs'},
                        status=status.HTTP_409_CONFLICT
                    )
            
            # Store the statement
            self.store.store_statement(data)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except ValidationError as e:
            return Response(
                {'error': 'Validation failed', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except StatementStoreError as e:
            return Response(
                {'error': 'Storage failed', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        except Exception as e:
            return Response(
                {'error': 'Internal server error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get(self, request):
        """
        GET /xapi/statements/
        
        Retrieve statements with optional filters
        
        Query parameters:
        - statementId: UUID of specific statement to retrieve
        - agent: JSON string of agent filter
        - verb: Verb IRI filter
        - activity: Activity IRI filter
        - since: ISO 8601 timestamp (statements after this time)
        - until: ISO 8601 timestamp (statements before this time)
        - limit: Maximum number of results (default: 100, max: 1000)
        - offset: Offset for pagination (default: 0)
        
        Returns:
        - 200 OK with statement(s)
        - 400 Bad Request if parameters are invalid
        - 404 Not Found if specific statement not found
        - 500 Internal Server Error on failure
        """
        try:
            # Check if requesting specific statement by ID
            statement_id_str = request.query_params.get('statementId')
            
            if statement_id_str:
                # Retrieve specific statement
                try:
                    statement_id = uuid.UUID(statement_id_str)
                except ValueError:
                    return Response(
                        {'error': 'Invalid UUID format for statementId'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                statement = self.store.get_statement(statement_id)
                
                if statement is None:
                    return Response(
                        {'error': 'Statement not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                return Response(statement, status=status.HTTP_200_OK)
            
            # Query statements with filters
            filters = self._parse_query_filters(request.query_params)
            
            result = self.store.query_statements(**filters)
            
            return Response(result, status=status.HTTP_200_OK)
        
        except ValueError as e:
            return Response(
                {'error': 'Invalid query parameters', 'message': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            return Response(
                {'error': 'Internal server error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _parse_query_filters(self, query_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse query parameters into filter arguments
        
        Args:
            query_params: Django query parameters
            
        Returns:
            Dictionary of filter arguments for query_statements
            
        Raises:
            ValueError: If parameters are invalid
        """
        filters = {}
        
        # Parse agent filter (JSON string)
        if 'agent' in query_params:
            try:
                filters['agent'] = json.loads(query_params['agent'])
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON format for agent parameter")
        
        # Parse verb filter (IRI string)
        if 'verb' in query_params:
            filters['verb'] = query_params['verb']
        
        # Parse activity filter (IRI string)
        if 'activity' in query_params:
            filters['activity'] = query_params['activity']
        
        # Parse since filter (ISO 8601 timestamp)
        if 'since' in query_params:
            try:
                since_str = query_params['since']
                filters['since'] = datetime.fromisoformat(since_str.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                raise ValueError("Invalid ISO 8601 format for since parameter")
        
        # Parse until filter (ISO 8601 timestamp)
        if 'until' in query_params:
            try:
                until_str = query_params['until']
                filters['until'] = datetime.fromisoformat(until_str.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                raise ValueError("Invalid ISO 8601 format for until parameter")
        
        # Parse limit (default: 100, max: 1000)
        limit = query_params.get('limit', '100')
        try:
            limit = int(limit)
            if limit < 1:
                raise ValueError("Limit must be positive")
            if limit > 1000:
                limit = 1000  # Cap at 1000
            filters['limit'] = limit
        except ValueError:
            raise ValueError("Invalid limit parameter")
        
        # Parse offset (default: 0)
        offset = query_params.get('offset', '0')
        try:
            offset = int(offset)
            if offset < 0:
                raise ValueError("Offset must be non-negative")
            filters['offset'] = offset
        except ValueError:
            raise ValueError("Invalid offset parameter")
        
        return filters
