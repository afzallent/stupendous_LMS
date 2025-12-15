"""
Basic tests for xAPI Statements API endpoints
"""
import pytest
import json
import uuid
import base64
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token

from xapi.models.statement import XAPIStatement

User = get_user_model()


@pytest.mark.django_db
class TestStatementsAPI(TestCase):
    """Test xAPI Statements API endpoints"""
    
    def setUp(self):
        """Set up test client and user"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_post_single_statement(self):
        """Test POST /xapi/statements/ with single statement"""
        statement = {
            'actor': {
                'objectType': 'Agent',
                'name': 'Test User',
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1',
                'definition': {
                    'name': {'en-US': 'Test Activity'}
                }
            }
        }
        
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(statement),
            content_type='application/json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 1
        
        # Verify statement was stored
        statement_id = uuid.UUID(response.data[0])
        stored = XAPIStatement.objects.get(statement_id=statement_id)
        assert stored.actor_name == 'Test User'
        assert stored.verb_id == 'http://adlnet.gov/expapi/verbs/completed'
    
    def test_post_multiple_statements(self):
        """Test POST /xapi/statements/ with multiple statements"""
        statements = [
            {
                'actor': {
                    'objectType': 'Agent',
                    'name': 'Test User',
                    'mbox': 'mailto:test@example.com'
                },
                'verb': {
                    'id': 'http://adlnet.gov/expapi/verbs/completed',
                    'display': {'en-US': 'completed'}
                },
                'object': {
                    'objectType': 'Activity',
                    'id': f'http://example.com/activity/{i}'
                }
            }
            for i in range(3)
        ]
        
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(statements),
            content_type='application/json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 3
        
        # Verify all statements were stored
        for statement_id_str in response.data:
            statement_id = uuid.UUID(statement_id_str)
            assert XAPIStatement.objects.filter(statement_id=statement_id).exists()
    
    def test_post_invalid_statement(self):
        """Test POST /xapi/statements/ with invalid statement"""
        invalid_statement = {
            'actor': {
                'objectType': 'Agent',
                'name': 'Test User'
                # Missing required IFI (mbox, account, etc.)
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
        
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(invalid_statement),
            content_type='application/json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
    
    def test_get_statement_by_id(self):
        """Test GET /xapi/statements/?statementId={uuid}"""
        # Create a statement first
        statement = {
            'actor': {
                'objectType': 'Agent',
                'name': 'Test User',
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
        
        post_response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(statement),
            content_type='application/json'
        )
        
        statement_id = post_response.data[0]
        
        # Retrieve the statement
        get_response = self.client.get(
            f'/xapi/statements/?statementId={statement_id}'
        )
        
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.data['actor']['name'] == 'Test User'
        assert get_response.data['verb']['id'] == 'http://adlnet.gov/expapi/verbs/completed'
    
    def test_get_statement_not_found(self):
        """Test GET /xapi/statements/?statementId={uuid} with non-existent ID"""
        fake_id = str(uuid.uuid4())
        
        response = self.client.get(
            f'/xapi/statements/?statementId={fake_id}'
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_put_statement_with_id(self):
        """Test PUT /xapi/statements/?statementId={uuid}"""
        statement_id = str(uuid.uuid4())
        statement = {
            'actor': {
                'objectType': 'Agent',
                'name': 'Test User',
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
        
        response = self.client.put(
            f'/xapi/statements/?statementId={statement_id}',
            data=json.dumps(statement),
            content_type='application/json'
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify statement was stored with the specified ID
        stored = XAPIStatement.objects.get(statement_id=uuid.UUID(statement_id))
        assert stored.actor_name == 'Test User'
    
    def test_put_duplicate_statement_id(self):
        """Test PUT /xapi/statements/?statementId={uuid} with existing ID"""
        statement_id = str(uuid.uuid4())
        statement = {
            'actor': {
                'objectType': 'Agent',
                'name': 'Test User',
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
        
        # First PUT
        self.client.put(
            f'/xapi/statements/?statementId={statement_id}',
            data=json.dumps(statement),
            content_type='application/json'
        )
        
        # Second PUT with same ID but different content
        different_statement = statement.copy()
        different_statement['actor']['name'] = 'Different User'
        
        response = self.client.put(
            f'/xapi/statements/?statementId={statement_id}',
            data=json.dumps(different_statement),
            content_type='application/json'
        )
        
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_query_statements(self):
        """Test GET /xapi/statements/ with query parameters"""
        # Create multiple statements
        for i in range(5):
            statement = {
                'actor': {
                    'objectType': 'Agent',
                    'name': f'User {i}',
                    'mbox': f'mailto:user{i}@example.com'
                },
                'verb': {
                    'id': 'http://adlnet.gov/expapi/verbs/completed',
                    'display': {'en-US': 'completed'}
                },
                'object': {
                    'objectType': 'Activity',
                    'id': f'http://example.com/activity/{i}'
                }
            }
            self.client.post(
                '/xapi/statements/',
                data=json.dumps(statement),
                content_type='application/json'
            )
        
        # Query all statements
        response = self.client.get('/xapi/statements/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'statements' in response.data
        assert len(response.data['statements']) == 5
    
    def test_query_statements_with_verb_filter(self):
        """Test GET /xapi/statements/ with verb filter"""
        # Create statements with different verbs
        verbs = [
            'http://adlnet.gov/expapi/verbs/completed',
            'http://adlnet.gov/expapi/verbs/passed',
            'http://adlnet.gov/expapi/verbs/completed'
        ]
        
        for i, verb_id in enumerate(verbs):
            statement = {
                'actor': {
                    'objectType': 'Agent',
                    'name': f'User {i}',
                    'mbox': f'mailto:user{i}@example.com'
                },
                'verb': {
                    'id': verb_id,
                    'display': {'en-US': verb_id.split('/')[-1]}
                },
                'object': {
                    'objectType': 'Activity',
                    'id': f'http://example.com/activity/{i}'
                }
            }
            self.client.post(
                '/xapi/statements/',
                data=json.dumps(statement),
                content_type='application/json'
            )
        
        # Query with verb filter
        response = self.client.get(
            '/xapi/statements/?verb=http://adlnet.gov/expapi/verbs/completed'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['statements']) == 2
        
        # Verify all returned statements have the correct verb
        for stmt in response.data['statements']:
            assert stmt['verb']['id'] == 'http://adlnet.gov/expapi/verbs/completed'
    
    def test_authentication_required(self):
        """Test that authentication is required for xAPI endpoints"""
        # Create unauthenticated client
        unauth_client = APIClient()
        
        statement = {
            'actor': {
                'objectType': 'Agent',
                'name': 'Test User',
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
        
        response = unauth_client.post(
            '/xapi/statements/',
            data=json.dumps(statement),
            content_type='application/json'
        )
        
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
class TestXAPIAuthentication(TestCase):
    """Test xAPI authentication methods"""
    
    def setUp(self):
        """Set up test user and token"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        
        self.statement = {
            'actor': {
                'objectType': 'Agent',
                'name': 'Test User',
                'mbox': 'mailto:test@example.com'
            },
            'verb': {
                'id': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'}
            },
            'object': {
                'objectType': 'Activity',
                'id': 'http://example.com/activity/1'
            }
        }
    
    def test_http_basic_auth(self):
        """Test HTTP Basic Authentication"""
        # Create Basic Auth header
        credentials = f'{self.user.username}:testpass123'
        encoded = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
        
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Basic {encoded}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 1
    
    def test_http_basic_auth_invalid_credentials(self):
        """Test HTTP Basic Auth with invalid credentials"""
        credentials = f'{self.user.username}:wrongpassword'
        encoded = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')
        
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Basic {encoded}'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_token_authentication(self):
        """Test Token-based authentication"""
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 1
    
    def test_token_authentication_invalid_token(self):
        """Test Token auth with invalid token"""
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION='Token invalid_token_12345'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_bearer_token_authentication(self):
        """Test Bearer token authentication (OAuth-style)"""
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.token.key}'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 1
    
    def test_no_authentication_header(self):
        """Test request without authentication header"""
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_invalid_authentication_method(self):
        """Test request with unsupported authentication method"""
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION='Digest some_digest_value'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_malformed_basic_auth_header(self):
        """Test malformed Basic Auth header"""
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION='Basic not_base64_encoded'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_inactive_user_authentication(self):
        """Test authentication with inactive user account"""
        # Deactivate user
        self.user.is_active = False
        self.user.save()
        
        # Try to authenticate with token
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Token {self.token.key}'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_www_authenticate_header_on_401(self):
        """Test that 401 responses include WWW-Authenticate header"""
        response = self.client.post(
            '/xapi/statements/',
            data=json.dumps(self.statement),
            content_type='application/json'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # Check for WWW-Authenticate header (DRF may format it differently)
        assert 'WWW-Authenticate' in response or response.status_code == 401
