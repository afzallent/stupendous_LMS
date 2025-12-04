from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for API errors.
    
    Standardizes error response format and logs server errors.
    """
    response = exception_handler(exc, context)

    if response is None:
        # Log unhandled exceptions
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return Response(
            {
                'error': 'Internal Server Error',
                'detail': 'An unexpected error occurred. Please try again later.'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Customize response format
    if response.status_code == status.HTTP_400_BAD_REQUEST:
        # Validation errors
        if isinstance(response.data, dict):
            response.data = {
                'error': 'Validation Error',
                'detail': 'Invalid input provided.',
                'field_errors': response.data
            }
    elif response.status_code == status.HTTP_401_UNAUTHORIZED:
        # Authentication errors
        response.data = {
            'error': 'Authentication Error',
            'detail': response.data.get('detail', 'Authentication failed.')
        }
    elif response.status_code == status.HTTP_403_FORBIDDEN:
        # Authorization errors
        response.data = {
            'error': 'Authorization Error',
            'detail': response.data.get('detail', 'You do not have permission to perform this action.')
        }
    elif response.status_code == status.HTTP_404_NOT_FOUND:
        # Not found errors
        response.data = {
            'error': 'Not Found',
            'detail': response.data.get('detail', 'The requested resource was not found.')
        }
    elif response.status_code >= 500:
        # Server errors
        logger.error(f"Server error: {exc}", exc_info=True)
        response.data = {
            'error': 'Server Error',
            'detail': 'An error occurred on the server. Please try again later.'
        }

    return response
