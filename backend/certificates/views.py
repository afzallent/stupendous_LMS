from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Certificate
from .serializers import CertificateSerializer, CertificateVerificationSerializer
from courses.models import Course, Progress, Enrollment


class CertificateViewSet(viewsets.ModelViewSet):
    """ViewSet for certificate operations"""
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter certificates by user"""
        user_id = self.request.query_params.get('userId')
        
        if user_id and self.request.user.is_instructor:
            # Instructors can view any student's certificates
            return Certificate.objects.filter(student_id=user_id)
        else:
            # Students see only their own certificates
            return Certificate.objects.filter(student=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Generate certificate for course completion"""
        course_id = request.data.get('course_id')
        
        if not course_id:
            return Response(
                {'detail': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course = get_object_or_404(Course, id=course_id)
        
        # Check if student is enrolled
        if not Enrollment.objects.filter(student=request.user, course=course).exists():
            return Response(
                {'detail': 'You must be enrolled in this course.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if course is completed
        total_lessons = course.lessons.count()
        if total_lessons == 0:
            return Response(
                {'detail': 'This course has no lessons.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        completed_lessons = Progress.objects.filter(
            student=request.user,
            lesson__course=course,
            completed=True
        ).count()
        
        if completed_lessons < total_lessons:
            return Response(
                {'detail': f'You must complete all lessons. Completed: {completed_lessons}/{total_lessons}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if certificate already exists
        existing_cert = Certificate.objects.filter(student=request.user, course=course).first()
        if existing_cert:
            serializer = self.get_serializer(existing_cert)
            return Response(serializer.data)
        
        # Create certificate
        certificate = Certificate.objects.create(
            student=request.user,
            course=course,
            student_name=request.user.get_full_name() or request.user.username,
            course_title=course.title,
            instructor_name=course.instructor.get_full_name() or course.instructor.username
        )
        
        serializer = self.get_serializer(certificate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[])
    def verify(self, request):
        """Verify certificate by ID (public endpoint)"""
        certificate_id = request.query_params.get('certificateId')
        
        if not certificate_id:
            return Response(
                {'detail': 'certificateId is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            certificate = Certificate.objects.get(certificate_id=certificate_id)
            
            verification_data = {
                'certificate_id': certificate.certificate_id,
                'is_valid': certificate.is_valid,
                'student_name': certificate.student_name,
                'course_title': certificate.course_title,
                'instructor_name': certificate.instructor_name,
                'issued_at': certificate.issued_at,
                'completion_date': certificate.completion_date
            }
            
            if not certificate.is_valid:
                verification_data['revoked_at'] = certificate.revoked_at
                verification_data['revoked_reason'] = certificate.revoked_reason
            
            return Response(verification_data)
        
        except Certificate.DoesNotExist:
            return Response(
                {'detail': 'Certificate not found.', 'is_valid': False},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def revoke(self, request, pk=None):
        """Revoke a certificate (admin only)"""
        certificate = self.get_object()
        reason = request.data.get('reason', 'No reason provided')
        
        certificate.is_valid = False
        certificate.revoked_at = timezone.now()
        certificate.revoked_reason = reason
        certificate.save()
        
        serializer = self.get_serializer(certificate)
        return Response(serializer.data)


class AutoGenerateCertificatesView(APIView):
    """Auto-generate certificates for completed courses"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Check and generate certificates for all completed courses"""
        enrollments = Enrollment.objects.filter(student=request.user)
        generated = []
        
        for enrollment in enrollments:
            course = enrollment.course
            
            # Check if certificate already exists
            if Certificate.objects.filter(student=request.user, course=course).exists():
                continue
            
            # Check completion
            total_lessons = course.lessons.count()
            if total_lessons == 0:
                continue
            
            completed_lessons = Progress.objects.filter(
                student=request.user,
                lesson__course=course,
                completed=True
            ).count()
            
            if completed_lessons >= total_lessons:
                # Generate certificate
                certificate = Certificate.objects.create(
                    student=request.user,
                    course=course,
                    student_name=request.user.get_full_name() or request.user.username,
                    course_title=course.title,
                    instructor_name=course.instructor.get_full_name() or course.instructor.username
                )
                generated.append({
                    'course_id': course.id,
                    'course_title': course.title,
                    'certificate_id': str(certificate.certificate_id)
                })
        
        return Response({
            'generated_count': len(generated),
            'certificates': generated
        })
