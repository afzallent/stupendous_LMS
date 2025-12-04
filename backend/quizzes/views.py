from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Avg, Q

from .models import Quiz, Question, QuestionOption, QuizAttempt, QuizAnswer
from .serializers import (
    QuizSerializer, QuizDetailSerializer, QuestionSerializer,
    QuestionBankSerializer, QuizAttemptSerializer, QuizSubmissionSerializer,
    QuestionOptionSerializer
)
from courses.models import Course


class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet for quiz CRUD operations"""
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return QuizDetailSerializer
        return QuizSerializer
    
    def get_queryset(self):
        """Filter quizzes by course"""
        queryset = Quiz.objects.all()
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # Instructors see all quizzes, students see only active ones
        if not self.request.user.is_instructor:
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def perform_create(self, serializer):
        """Ensure only course instructor can create quiz"""
        course = serializer.validated_data.get('course')
        if course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only create quizzes for your own courses.")
        serializer.save()
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        """Submit quiz answers"""
        quiz = self.get_object()
        
        # Check if student is enrolled
        from courses.models import Enrollment
        if not Enrollment.objects.filter(student=request.user, course=quiz.course).exists():
            return Response(
                {'detail': 'You must be enrolled in this course to take the quiz.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check attempt limit
        attempt_count = QuizAttempt.objects.filter(quiz=quiz, student=request.user).count()
        if attempt_count >= quiz.max_attempts:
            return Response(
                {'detail': f'Maximum attempts ({quiz.max_attempts}) reached.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate submission
        submission_serializer = QuizSubmissionSerializer(data=request.data)
        if not submission_serializer.is_valid():
            return Response(submission_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=request.user
        )
        
        # Process answers
        answers_data = submission_serializer.validated_data['answers']
        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            question = get_object_or_404(Question, id=question_id, quiz=quiz)
            
            answer = QuizAnswer.objects.create(
                attempt=attempt,
                question=question
            )
            
            if 'selected_option_id' in answer_data:
                option_id = answer_data['selected_option_id']
                option = get_object_or_404(QuestionOption, id=option_id, question=question)
                answer.selected_option = option
            
            if 'text_answer' in answer_data:
                answer.text_answer = answer_data['text_answer']
            
            answer.check_answer()
        
        # Calculate score
        attempt.completed_at = timezone.now()
        attempt.calculate_score()
        
        # Return results
        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def results(self, request, pk=None):
        """Get quiz results (instructor only)"""
        quiz = self.get_object()
        
        if quiz.course.instructor != request.user:
            return Response(
                {'detail': 'Only the course instructor can view results.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        attempts = QuizAttempt.objects.filter(quiz=quiz).select_related('student')
        
        # Calculate statistics
        stats = {
            'total_attempts': attempts.count(),
            'unique_students': attempts.values('student').distinct().count(),
            'average_score': attempts.aggregate(Avg('percentage'))['percentage__avg'] or 0,
            'pass_rate': (attempts.filter(passed=True).count() / attempts.count() * 100) if attempts.count() > 0 else 0,
            'attempts': []
        }
        
        for attempt in attempts:
            stats['attempts'].append({
                'student': attempt.student.username,
                'student_id': attempt.student.id,
                'score': float(attempt.score) if attempt.score else 0,
                'max_score': attempt.max_score,
                'percentage': float(attempt.percentage) if attempt.percentage else 0,
                'passed': attempt.passed,
                'completed_at': attempt.completed_at,
                'time_taken': attempt.time_taken
            })
        
        return Response(stats)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_attempts(self, request):
        """Get current user's quiz attempts"""
        attempts = QuizAttempt.objects.filter(student=request.user)
        serializer = QuizAttemptSerializer(attempts, many=True)
        return Response(serializer.data)


class QuestionBankViewSet(viewsets.ModelViewSet):
    """ViewSet for question bank management"""
    queryset = Question.objects.filter(is_in_bank=True)
    serializer_class = QuestionBankSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter questions by instructor"""
        if self.request.user.is_instructor:
            return Question.objects.filter(
                created_by=self.request.user,
                is_in_bank=True
            )
        return Question.objects.none()
    
    def perform_create(self, serializer):
        """Create question in bank"""
        serializer.save(
            created_by=self.request.user,
            is_in_bank=True
        )
    
    @action(detail=True, methods=['post'])
    def add_to_quiz(self, request, pk=None):
        """Add question from bank to a quiz"""
        question = self.get_object()
        quiz_id = request.data.get('quiz_id')
        
        if not quiz_id:
            return Response(
                {'detail': 'quiz_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        # Verify ownership
        if quiz.course.instructor != request.user:
            return Response(
                {'detail': 'You can only add questions to your own quizzes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create a copy of the question for the quiz
        new_question = Question.objects.create(
            quiz=quiz,
            question_text=question.question_text,
            question_type=question.question_type,
            points=question.points,
            explanation=question.explanation,
            created_by=request.user,
            is_in_bank=False,
            order=quiz.questions.count()
        )
        
        # Copy options
        for option in question.options.all():
            QuestionOption.objects.create(
                question=new_question,
                option_text=option.option_text,
                is_correct=option.is_correct,
                order=option.order
            )
        
        serializer = QuestionSerializer(new_question)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuestionViewSet(viewsets.ModelViewSet):
    """ViewSet for question management within quizzes"""
    queryset = Question.objects.filter(is_in_bank=False)
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter questions by quiz"""
        quiz_id = self.request.query_params.get('quiz')
        if quiz_id:
            return Question.objects.filter(quiz_id=quiz_id, is_in_bank=False)
        return Question.objects.filter(is_in_bank=False)
    
    def perform_create(self, serializer):
        """Create question for quiz"""
        quiz = serializer.validated_data.get('quiz')
        if quiz and quiz.course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only add questions to your own quizzes.")
        serializer.save(created_by=self.request.user, is_in_bank=False)
