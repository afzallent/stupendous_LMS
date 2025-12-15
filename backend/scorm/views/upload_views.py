"""
SCORM package upload API views.

Handles SCORM package upload, validation, extraction, and storage.
"""

import os
import uuid
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from courses.models import Course, Lesson
from scorm.models.scorm_models import ScormPackage, ScormSCO
from scorm.package_manager import ScormPackageManager
from scorm.serializers import (
    ScormUploadRequestSerializer,
    ScormUploadResponseSerializer,
    ScormSCOSerializer,
)


class ScormUploadView(APIView):
    """
    API endpoint for uploading SCORM packages.
    
    POST /api/scorm/upload/
    
    Validates, extracts, and stores SCORM packages, creating
    corresponding Lesson and ScormPackage records.
    
    **Validates: Requirements 1.1, 1.3**
    """
    
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """
        Handle SCORM package upload.
        
        Request body (multipart/form-data):
            - course_id: int (required)
            - scorm_package: file (required)
            - completion_criteria: str (optional, default='status')
            - passing_score: int (optional)
            - allow_retry: bool (optional, default=True)
        
        Returns:
            200 OK: Package uploaded successfully
            400 Bad Request: Validation errors
            403 Forbidden: User not authorized
            413 Payload Too Large: Package exceeds size limit
            500 Internal Server Error: Processing error
        """
        # Validate request data
        serializer = ScormUploadRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'success': False,
                    'errors': [str(e) for e in serializer.errors.values()],
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = serializer.validated_data
        course_id = validated_data['course_id']
        scorm_file = validated_data['scorm_package']
        
        # Get course and check permissions
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'errors': [f'Course with ID {course_id} does not exist'],
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is the instructor of the course
        if course.instructor != request.user and not request.user.is_staff:
            return Response(
                {
                    'success': False,
                    'errors': ['You do not have permission to upload SCORM packages to this course'],
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Initialize package manager
        package_manager = ScormPackageManager()
        
        # Validate package
        validation_result = package_manager.validate_package(scorm_file)
        if not validation_result.is_valid:
            return Response(
                {
                    'success': False,
                    'errors': validation_result.errors,
                    'warnings': validation_result.warnings,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset file pointer after validation
        scorm_file.seek(0)
        
        # Extract manifest
        try:
            manifest_data = package_manager.extract_manifest(scorm_file)
        except ValueError as e:
            return Response(
                {
                    'success': False,
                    'errors': [str(e)],
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'errors': [f'Error parsing manifest: {str(e)}'],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Reset file pointer after manifest extraction
        scorm_file.seek(0)
        
        # Generate unique content path
        unique_id = uuid.uuid4().hex[:12]
        content_path = f'scorm_packages/{course_id}/{unique_id}'
        
        # Extract content files
        try:
            extracted_files = package_manager.extract_content(scorm_file, content_path)
        except (ValueError, OSError) as e:
            return Response(
                {
                    'success': False,
                    'errors': [str(e)],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'errors': [f'Error extracting content: {str(e)}'],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create database records in a transaction
        try:
            with transaction.atomic():
                # Determine the next lesson order
                max_order = Lesson.objects.filter(course=course).aggregate(
                    Max('order')
                )['order__max'] or 0
                next_order = max_order + 1
                
                # Create Lesson
                lesson = Lesson.objects.create(
                    course=course,
                    title=manifest_data.title,
                    content_type=Lesson.CONTENT_TYPE_SCORM,
                    content=manifest_data.description,
                    order=next_order
                )
                
                # Determine launch URL (first SCO's launch URL)
                launch_url = ''
                if manifest_data.scos:
                    launch_url = manifest_data.scos[0]['launch_url']
                
                # Create ScormPackage
                scorm_package = ScormPackage.objects.create(
                    course=course,
                    lesson=lesson,
                    version=manifest_data.version,
                    identifier=manifest_data.identifier,
                    title=manifest_data.title,
                    description=manifest_data.description,
                    manifest_data={
                        'organizations': manifest_data.organizations,
                        'resources': manifest_data.resources,
                        'metadata': manifest_data.metadata,
                    },
                    content_path=content_path,
                    launch_url=launch_url,
                    uploaded_by=request.user,
                    completion_criteria=validated_data.get('completion_criteria', 'status'),
                    passing_score=validated_data.get('passing_score'),
                    allow_retry=validated_data.get('allow_retry', True),
                )
                
                # Create SCO records
                sco_objects = []
                for sco_data in manifest_data.scos:
                    sco = ScormSCO.objects.create(
                        package=scorm_package,
                        identifier=sco_data['identifier'],
                        title=sco_data['title'],
                        launch_url=sco_data['launch_url'],
                        prerequisites=sco_data.get('parameters', ''),
                        order=sco_data['order']
                    )
                    sco_objects.append(sco)
                
                # Serialize SCOs for response
                sco_serializer = ScormSCOSerializer(sco_objects, many=True)
                
                # Prepare response
                response_data = {
                    'success': True,
                    'message': 'SCORM package uploaded successfully',
                    'lesson_id': lesson.id,
                    'package_id': scorm_package.id,
                    'scorm_version': manifest_data.version,
                    'title': manifest_data.title,
                    'scos': sco_serializer.data,
                }
                
                # Include warnings if any
                if validation_result.warnings:
                    response_data['warnings'] = validation_result.warnings
                
                return Response(
                    response_data,
                    status=status.HTTP_200_OK
                )
        
        except Exception as e:
            # Clean up extracted files on error
            import shutil
            from django.conf import settings
            full_path = os.path.join(settings.MEDIA_ROOT, content_path)
            if os.path.exists(full_path):
                try:
                    shutil.rmtree(full_path)
                except Exception:
                    pass  # Best effort cleanup
            
            return Response(
                {
                    'success': False,
                    'errors': [f'Error creating database records: {str(e)}'],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ScormPackageListView(APIView):
    """
    API endpoint for listing SCORM packages.
    
    GET /api/scorm/packages/
    GET /api/scorm/packages/?course_id=<id>
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        List SCORM packages.
        
        Query parameters:
            - course_id: Filter by course ID (optional)
        
        Returns:
            200 OK: List of SCORM packages
        """
        from scorm.serializers import ScormPackageSerializer
        
        queryset = ScormPackage.objects.all()
        
        # Filter by course if specified
        course_id = request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # Filter by user's courses if not staff
        if not request.user.is_staff:
            # Show packages from courses the user instructs or is enrolled in
            from courses.models import Enrollment
            user_course_ids = list(
                Course.objects.filter(instructor=request.user).values_list('id', flat=True)
            ) + list(
                Enrollment.objects.filter(student=request.user).values_list('course_id', flat=True)
            )
            queryset = queryset.filter(course_id__in=user_course_ids)
        
        serializer = ScormPackageSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ScormPackageDetailView(APIView):
    """
    API endpoint for retrieving SCORM package details.
    
    GET /api/scorm/packages/<id>/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, package_id):
        """
        Get SCORM package details.
        
        Returns:
            200 OK: Package details
            404 Not Found: Package not found
            403 Forbidden: User not authorized
        """
        from scorm.serializers import ScormPackageSerializer
        
        try:
            package = ScormPackage.objects.get(pk=package_id)
        except ScormPackage.DoesNotExist:
            return Response(
                {'error': 'SCORM package not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not request.user.is_staff:
            from courses.models import Enrollment
            # Check if user is instructor or enrolled student
            is_instructor = package.course.instructor == request.user
            is_enrolled = Enrollment.objects.filter(
                student=request.user,
                course=package.course
            ).exists()
            
            if not (is_instructor or is_enrolled):
                return Response(
                    {'error': 'You do not have permission to view this package'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = ScormPackageSerializer(package)
        return Response(serializer.data, status=status.HTTP_200_OK)
