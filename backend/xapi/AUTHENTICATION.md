# xAPI Authentication

The xAPI endpoints support multiple authentication methods per the xAPI specification.

## Supported Authentication Methods

### 1. HTTP Basic Authentication

Standard HTTP Basic Auth with username and password.

**Format:**
```
Authorization: Basic <base64(username:password)>
```

**Example:**
```bash
# Using curl
curl -X POST http://localhost:8000/xapi/statements/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -d '{"actor": {...}, "verb": {...}, "object": {...}}'
```

**Python example:**
```python
import requests
import base64

username = 'your_username'
password = 'your_password'
credentials = f'{username}:{password}'
encoded = base64.b64encode(credentials.encode()).decode()

response = requests.post(
    'http://localhost:8000/xapi/statements/',
    headers={
        'Authorization': f'Basic {encoded}',
        'Content-Type': 'application/json'
    },
    json={
        'actor': {...},
        'verb': {...},
        'object': {...}
    }
)
```

### 2. Token Authentication

Token-based authentication using Django REST Framework tokens.

**Format:**
```
Authorization: Token <token_key>
```

**Creating a token:**
```bash
# Using Django management command
python manage.py create_xapi_token <username>

# Or recreate an existing token
python manage.py create_xapi_token <username> --recreate
```

**Example:**
```bash
# Using curl
curl -X POST http://localhost:8000/xapi/statements/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  -d '{"actor": {...}, "verb": {...}, "object": {...}}'
```

**Python example:**
```python
import requests

token = '9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b'

response = requests.post(
    'http://localhost:8000/xapi/statements/',
    headers={
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    },
    json={
        'actor': {...},
        'verb': {...},
        'object': {...}
    }
)
```

### 3. Bearer Token Authentication

OAuth-style bearer token authentication (uses same tokens as Token auth).

**Format:**
```
Authorization: Bearer <token_key>
```

**Example:**
```bash
# Using curl
curl -X POST http://localhost:8000/xapi/statements/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b" \
  -d '{"actor": {...}, "verb": {...}, "object": {...}}'
```

## Security Best Practices

1. **Always use HTTPS in production** - Authentication credentials should never be sent over unencrypted connections

2. **Token Management:**
   - Store tokens securely (environment variables, secrets management)
   - Rotate tokens periodically
   - Revoke tokens for inactive users
   - Use different tokens for different applications/integrations

3. **Basic Auth:**
   - Only use over HTTPS
   - Consider using tokens instead for API integrations
   - Basic Auth is convenient for testing but tokens are preferred for production

4. **Rate Limiting:**
   - The system implements rate limiting (100 requests/minute per user)
   - Implement exponential backoff in client applications

## Error Responses

### 401 Unauthorized

Returned when authentication fails or is missing.

```json
{
    "detail": "Authentication credentials were not provided."
}
```

or

```json
{
    "detail": "Invalid username or password"
}
```

The response includes a `WWW-Authenticate` header:
```
WWW-Authenticate: Basic realm="xAPI"
```

### 403 Forbidden

Returned when authentication succeeds but the user lacks permission.

```json
{
    "detail": "You do not have permission to perform this action."
}
```

## Testing Authentication

### Using Django Test Client

```python
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

client = APIClient()

# Token authentication
token = Token.objects.get(user__username='testuser')
client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

# Basic authentication
import base64
credentials = base64.b64encode(b'username:password').decode()
client.credentials(HTTP_AUTHORIZATION=f'Basic {credentials}')
```

### Using pytest

```python
import pytest
from rest_framework.authtoken.models import Token

@pytest.mark.django_db
def test_xapi_with_token(client, user):
    token = Token.objects.create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    
    response = client.post('/xapi/statements/', data={...})
    assert response.status_code == 200
```

## Migration

After adding authentication, run migrations to create the token table:

```bash
python manage.py migrate
```

## Creating Tokens Programmatically

```python
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()

# Get or create token for a user
user = User.objects.get(username='username')
token, created = Token.objects.get_or_create(user=user)

print(f'Token: {token.key}')
```

## Revoking Tokens

```python
from rest_framework.authtoken.models import Token

# Delete a specific token
Token.objects.filter(key='token_key_here').delete()

# Delete all tokens for a user
Token.objects.filter(user__username='username').delete()
```

## Future Enhancements

- OAuth 2.0 support for third-party integrations
- API key management interface
- Token expiration and refresh
- Scoped permissions for different xAPI operations
