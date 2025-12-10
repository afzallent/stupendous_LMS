from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django.db.models import Count, Avg, Q

from .models import Quiz, Question, QuestionOption, QuizAttempt, QuizAnswer
from .serializers import (
    QuizSerializer, QuizDetailSerializer, QuestionSerializer,
    QuestionBankSerializer, QuizAttemptSerializer, QuizSubmissionSerializer,
    QuestionOptionSerializer
)
from courses.models import Course
from courses.permissions import IsInstructorOrReadOnly


class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet for quiz CRUD operations"""
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsInstructorOrReadOnly]
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return QuizDetailSerializer
        return QuizSerializer
    
    def get_queryset(self):
        """Filter quizzes by course_id query parameter"""
        queryset = Quiz.objects.all()
        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        
        # Instructors see all quizzes, students see only active ones
        if self.request.user.is_authenticated and not self.request.user.is_instructor:
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def perform_create(self, serializer):
        """Verify course ownership for create"""
        course = serializer.validated_data.get('course')
        if course.instructor != self.request.user:
            raise PermissionDenied("You can only create quizzes for your own courses.")
        serializer.save()
    
    def perform_update(self, serializer):
        """Verify course ownership for update"""
        quiz = self.get_object()
        if quiz.course.instructor != self.request.user:
            raise PermissionDenied("You can only update quizzes for your own courses.")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Verify course ownership for delete"""
        if instance.course.instructor != self.request.user:
            raise PermissionDenied("You can only delete quizzes for your own courses.")
        instance.delete()
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def publish(self, request, pk=None):
        """Publish quiz (set is_active=True)"""
        quiz = self.get_object()
        
        # Verify ownership
        if quiz.course.instructor != request.user:
            return Response(
                {'detail': 'You can only publish your own quizzes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if quiz has questions
        if quiz.questions.count() == 0:
            return Response(
                {'detail': 'Cannot publish quiz without questions.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        quiz.is_active = True
        quiz.save()
        
        serializer = self.get_serializer(quiz)
        return Response(serializer.data)
    
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
        
        # Calculate attempt number
        attempt_number = QuizAttempt.objects.filter(
            quiz=quiz, 
            student=request.user
        ).count() + 1
        
        # Create attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=request.user,
            attempt_number=attempt_number
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
        
        # Calculate score and time taken
        attempt.completed_at = timezone.now()
        time_delta = attempt.completed_at - attempt.started_at
        attempt.time_taken = int(time_delta.total_seconds())
        attempt.calculate_score()
        
        # Return results
        serializer = QuizAttemptSerializer(attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def attempts(self, request, pk=None):
        """Get all attempts for a quiz (trainer only)"""
        quiz = self.get_object()
        
        # Verify ownership
        if quiz.course.instructor != request.user:
            return Response(
                {'detail': 'Only the course instructor can view attempts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        attempts = QuizAttempt.objects.filter(quiz=quiz).select_related('student').order_by('-started_at')
        serializer = QuizAttemptSerializer(attempts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated], url_path='my-attempts')
    def my_attempts(self, request, pk=None):
        """Get current user's attempts for a specific quiz"""
        quiz = self.get_object()
        
        # Check if student is enrolled
        from courses.models import Enrollment
        if not Enrollment.objects.filter(student=request.user, course=quiz.course).exists():
            return Response(
                {'detail': 'You must be enrolled in this course to view attempts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        attempts = QuizAttempt.objects.filter(
            quiz=quiz, 
            student=request.user
        ).order_by('-started_at')
        serializer = QuizAttemptSerializer(attempts, many=True)
        return Response(serializer.data)
    
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
                'attempt_number': attempt.attempt_number,
                'completed_at': attempt.completed_at,
                'time_taken': attempt.time_taken
            })
        
        return Response(stats)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='questions')
    def add_question(self, request, pk=None):
        """Add question to quiz (POST /api/quizzes/{id}/questions/)"""
        quiz = self.get_object()
        
        # Verify ownership
        if quiz.course.instructor != request.user:
            return Response(
                {'detail': 'You can only add questions to your own quizzes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Extract question data
        question_data = request.data.copy()
        options_data = question_data.pop('options', [])
        
        # Validate required fields
        if not question_data.get('question_text'):
            return Response(
                {'detail': 'question_text is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate question type
        question_type = question_data.get('question_type', 'multiple_choice')
        if question_type not in ['multiple_choice', 'true_false', 'short_answer']:
            return Response(
                {'detail': 'Invalid question_type. Must be multiple_choice, true_false, or short_answer.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate options for multiple choice and true/false questions
        if question_type in ['multiple_choice', 'true_false']:
            if not options_data:
                return Response(
                    {'detail': 'Options are required for multiple choice and true/false questions.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check that at least one correct answer exists
            has_correct = any(opt.get('is_correct', False) for opt in options_data)
            if not has_correct:
                return Response(
                    {'detail': 'At least one correct answer must be specified.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Set order to be last
        max_order = quiz.questions.aggregate(models.Max('order'))['order__max'] or 0
        question_data['order'] = max_order + 1
        
        # Create question
        question = Question.objects.create(
            quiz=quiz,
            question_text=question_data.get('question_text'),
            question_type=question_type,
            points=question_data.get('points', 1),
            order=question_data['order'],
            explanation=question_data.get('explanation', ''),
            created_by=request.user,
            is_in_bank=False
        )
        
        # Create options
        for idx, option_data in enumerate(options_data):
            QuestionOption.objects.create(
                question=question,
                option_text=option_data.get('option_text', ''),
                is_correct=option_data.get('is_correct', False),
                order=option_data.get('order', idx)
            )
        
        # Return created question
        serializer = QuestionSerializer(question, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    



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


class QuestionManagementView(viewsets.views.APIView):
    """API view for updating and deleting questions"""
    permission_classes = [permissions.IsAuthenticated]
    
    def put(self, request, quiz_id, question_id):
        """Update question in quiz (PUT /api/quizzes/{id}/questions/{q_id}/)"""
        return self._update_question(request, quiz_id, question_id, partial=False)
    
    def patch(self, request, quiz_id, question_id):
        """Partially update question in quiz (PATCH /api/quizzes/{id}/questions/{q_id}/)"""
        return self._update_question(request, quiz_id, question_id, partial=True)
    
    def delete(self, request, quiz_id, question_id):
        """Delete question from quiz (DELETE /api/quizzes/{id}/questions/{q_id}/)"""
        # Get quiz
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response(
                {'detail': 'Quiz not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify ownership
        if quiz.course.instructor != request.user:
            return Response(
                {'detail': 'You can only delete questions from your own quizzes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get question
        try:
            question = Question.objects.get(id=question_id, quiz=quiz)
        except Question.DoesNotExist:
            return Response(
                {'detail': 'Question not found in this quiz.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete question (options will be cascade deleted)
        question.delete()
        
        return Response(
            {'detail': 'Question deleted successfully.'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    def _update_question(self, request, quiz_id, question_id, partial=False):
        """Helper method to update question"""
        # Get quiz
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response(
                {'detail': 'Quiz not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify ownership
        if quiz.course.instructor != request.user:
            return Response(
                {'detail': 'You can only update questions in your own quizzes.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get question
        try:
            question = Question.objects.get(id=question_id, quiz=quiz)
        except Question.DoesNotExist:
            return Response(
                {'detail': 'Question not found in this quiz.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extract question data
        question_data = request.data.copy()
        options_data = question_data.pop('options', None)
        
        # Update question fields
        if 'question_text' in question_data:
            question.question_text = question_data['question_text']
        if 'question_type' in question_data:
            question_type = question_data['question_type']
            if question_type not in ['multiple_choice', 'true_false', 'short_answer']:
                return Response(
                    {'detail': 'Invalid question_type. Must be multiple_choice, true_false, or short_answer.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            question.question_type = question_type
        if 'points' in question_data:
            question.points = question_data['points']
        if 'order' in question_data:
            question.order = question_data['order']
        if 'explanation' in question_data:
            question.explanation = question_data['explanation']
        
        # Update options if provided
        if options_data is not None:
            # Validate options for multiple choice and true/false questions
            if question.question_type in ['multiple_choice', 'true_false']:
                if not options_data:
                    return Response(
                        {'detail': 'Options are required for multiple choice and true/false questions.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check that at least one correct answer exists
                has_correct = any(opt.get('is_correct', False) for opt in options_data)
                if not has_correct:
                    return Response(
                        {'detail': 'At least one correct answer must be specified.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Delete existing options
            question.options.all().delete()
            
            # Create new options
            for idx, option_data in enumerate(options_data):
                QuestionOption.objects.create(
                    question=question,
                    option_text=option_data.get('option_text', ''),
                    is_correct=option_data.get('is_correct', False),
                    order=option_data.get('order', idx)
                )
        
        question.save()
        
        # Return updated question
        serializer = QuestionSerializer(question, context={'request': request})
        return Response(serializer.data)
