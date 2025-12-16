"""
Privacy and data management endpoints for xAPI
Handles student data export and deletion requests
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q

from xapi.models import XAPIStatement, XAPIAuditLog, XAPIConfiguration
from xapi.serializers.statement import XAPIStatementSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_student_data(request):
    """
    Export all xAPI statements for the authenticated student
    
    GET /api/xapi/my-data/
    
    Returns:
        JSON with all xAPI statements where the student is the actor
        
    Validates: Requirements 10.3
    """
    config = XAPIConfiguration.load()
    
    # Check if data export is allowed
    if not config.allow_student_data_export:
        return Response(
            {'error': 'Data export is not allowed'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all statements for this user
    statements = XAPIStatement.objects.filter(user=request.user)
    
    # Serialize the statements
    serializer = XAPIStatementSerializer(statements, many=True)
    
    # Log the export operation
    XAPIAuditLog.objects.create(
        user=request.user,
        operation_type='export',
        resource_type='statements',
        resource_id=f'user_{request.user.id}',
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details={
            'statement_count': statements.count(),
            'export_timestamp': timezone.now().isoformat(),
        },
        success=True
    )
    
    return Response({
        'user_id': request.user.id,
        'username': request.user.username,
        'export_timestamp': timezone.now().isoformat(),
        'statement_count': statements.count(),
        'statements': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_student_data(request):
    """
    Delete all xAPI statements for the authenticated student
    
    DELETE /api/xapi/my-data/
    
    Returns:
        Confirmation of deletion
        
    Validates: Requirements 10.4
    """
    config = XAPIConfiguration.load()
    
    # Check if data deletion is allowed
    if not config.allow_student_data_deletion:
        return Response(
            {'error': 'Data deletion is not allowed'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get all statements for this user
    statements = XAPIStatement.objects.filter(user=request.user)
    statement_count = statements.count()
    
    # Log the deletion operation before deleting
    XAPIAuditLog.objects.create(
        user=request.user,
        operation_type='delete',
        resource_type='statements',
        resource_id=f'user_{request.user.id}',
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details={
            'statement_count': statement_count,
            'deletion_timestamp': timezone.now().isoformat(),
        },
        success=True
    )
    
    # Delete the statements
    statements.delete()
    
    return Response({
        'user_id': request.user.id,
        'username': request.user.username,
        'deletion_timestamp': timezone.now().isoformat(),
        'statements_deleted': statement_count,
        'message': f'Successfully deleted {statement_count} xAPI statements'
    }, status=status.HTTP_200_OK)


def get_client_ip(request):
    """
    Get the client's IP address from the request
    
    Args:
        request: The HTTP request
        
    Returns:
        str: The client's IP address
    """
    # Check for IP in X-Forwarded-For header (for proxied requests)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    
    return ip
