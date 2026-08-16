"""
Tests for quizzes app
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from courses.models import Course, Category, Enrollment
from .models import Quiz, Question, QuestionOption

User = get_user_model()


class QuizViewSetTestCase(APITestCase):
    """Test cases for QuizViewSet"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123',
            is_instructor=True
        )
        self.other_instructor = User.objects.create_user(
            username='other_instructor',
            email='other@test.com',
            password='testpass123',
            is_instructor=True
        )
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            is_student=True
        )
        
        # Create category
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        # Create courses
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.instructor,
            category=self.category,
            price=0
        )
        self.other_course = Course.objects.create(
            title='Other Course',
            description='Other Description',
            instructor=self.other_instructor,
            category=self.category,
            price=0
        )
        
        # Create quiz
        self.quiz = Quiz.objects.create(
            course=self.course,
            title='Test Quiz',
            description='Test quiz description',
            passing_score=70,
            time_limit=30,
            max_attempts=3,
            is_active=True
        )
        
        # Quizzes are only visible to enrolled students and the owning
        # instructor, so student-facing tests need a real enrollment.
        self.enrollment = Enrollment.objects.create(
            student=self.student, course=self.course
        )

        self.client = APIClient()

    # NOTE ON 404 vs 403
    # Quizzes a user may not access are excluded from the queryset entirely,
    # so get_object() raises 404 rather than reaching a 403 permission check.
    # That is deliberate: a 403 confirms the quiz exists, which leaks the
    # structure of other instructors' courses. Several tests below therefore
    # assert 404 where they previously asserted 403.
    # See PRODUCTION_READINESS.md (P1-5).

    def test_list_quizzes_requires_authentication(self):
        """Anonymous users cannot browse quizzes"""
        response = self.client.get('/api/quizzes/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_quizzes(self):
        """Test listing quizzes as the owning instructor"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get('/api/quizzes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_quizzes_excludes_other_courses(self):
        """A user sees no quizzes from courses they are unrelated to"""
        Quiz.objects.create(
            course=self.other_course,
            title='Other Quiz',
            description='Other quiz',
            passing_score=70,
            is_active=True,
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/quizzes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [q['title'] for q in response.data['results']]
        self.assertEqual(titles, ['Test Quiz'])

    def test_filter_quizzes_by_course_id(self):
        """Test filtering quizzes by course_id parameter"""
        # Create another quiz for different course
        Quiz.objects.create(
            course=self.other_course,
            title='Other Quiz',
            description='Other quiz',
            passing_score=70
        )

        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/quizzes/?course_id={self.course.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Quiz')
    
    def test_create_quiz_as_instructor(self):
        """Test creating quiz as course instructor"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'course': self.course.id,
            'title': 'New Quiz',
            'description': 'New quiz description',
            'passing_score': 80,
            'time_limit': 45,
            'max_attempts': 2
        }
        response = self.client.post('/api/quizzes/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Quiz.objects.count(), 2)
    
    def test_create_quiz_wrong_instructor(self):
        """Test creating quiz for another instructor's course fails"""
        self.client.force_authenticate(user=self.other_instructor)
        data = {
            'course': self.course.id,
            'title': 'New Quiz',
            'description': 'New quiz description',
            'passing_score': 80
        }
        response = self.client.post('/api/quizzes/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_create_quiz_as_student_fails(self):
        """Test creating quiz as student fails"""
        self.client.force_authenticate(user=self.student)
        data = {
            'course': self.course.id,
            'title': 'New Quiz',
            'description': 'New quiz description',
            'passing_score': 80
        }
        response = self.client.post('/api/quizzes/', data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_quiz_as_owner(self):
        """Test updating quiz as course instructor"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'course': self.course.id,
            'title': 'Updated Quiz',
            'description': 'Updated description',
            'passing_score': 75
        }
        response = self.client.put(f'/api/quizzes/{self.quiz.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.quiz.refresh_from_db()
        self.assertEqual(self.quiz.title, 'Updated Quiz')
    
    def test_update_quiz_wrong_instructor(self):
        """Test updating quiz by non-owner instructor fails"""
        self.client.force_authenticate(user=self.other_instructor)
        data = {
            'course': self.course.id,
            'title': 'Updated Quiz',
            'description': 'Updated description',
            'passing_score': 75
        }
        response = self.client.put(f'/api/quizzes/{self.quiz.id}/', data)
        # 404, not 403: the quiz is not in this instructor's queryset at all.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_quiz_as_owner(self):
        """Test deleting quiz as course instructor"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/quizzes/{self.quiz.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Quiz.objects.count(), 0)
    
    def test_delete_quiz_wrong_instructor(self):
        """Test deleting quiz by non-owner instructor fails"""
        self.client.force_authenticate(user=self.other_instructor)
        response = self.client.delete(f'/api/quizzes/{self.quiz.id}/')
        # 404, not 403: the quiz is not in this instructor's queryset at all.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Quiz.objects.count(), 1)
    
    def test_retrieve_quiz(self):
        """Test retrieving quiz details as an enrolled student"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Quiz')

    def test_retrieve_quiz_requires_enrollment(self):
        """An unenrolled user cannot read quiz content"""
        outsider = User.objects.create_user(
            username='outsider',
            email='outsider@test.com',
            password='testpass123',
            is_student=True,
        )
        self.client.force_authenticate(user=outsider)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_students_see_only_active_quizzes(self):
        """Test students can only see active quizzes"""
        # Create inactive quiz
        Quiz.objects.create(
            course=self.course,
            title='Inactive Quiz',
            description='Inactive',
            passing_score=70,
            is_active=False
        )
        
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/quizzes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see the active quiz
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Quiz')
    
    def test_publish_quiz_as_owner(self):
        """Test publishing quiz as course instructor"""
        # Create unpublished quiz with questions
        unpublished_quiz = Quiz.objects.create(
            course=self.course,
            title='Unpublished Quiz',
            description='Test',
            passing_score=70,
            is_active=False
        )
        # Add a question
        question = Question.objects.create(
            quiz=unpublished_quiz,
            question_text='Test question?',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        QuestionOption.objects.create(
            question=question,
            option_text='Option 1',
            is_correct=True
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/quizzes/{unpublished_quiz.id}/publish/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unpublished_quiz.refresh_from_db()
        self.assertTrue(unpublished_quiz.is_active)
    
    def test_publish_quiz_without_questions_fails(self):
        """Test publishing quiz without questions fails"""
        unpublished_quiz = Quiz.objects.create(
            course=self.course,
            title='Empty Quiz',
            description='Test',
            passing_score=70,
            is_active=False
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/quizzes/{unpublished_quiz.id}/publish/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot publish quiz without questions', response.data['detail'])
    
    def test_publish_quiz_wrong_instructor(self):
        """Test publishing quiz by non-owner instructor fails"""
        unpublished_quiz = Quiz.objects.create(
            course=self.course,
            title='Unpublished Quiz',
            description='Test',
            passing_score=70,
            is_active=False
        )
        
        self.client.force_authenticate(user=self.other_instructor)
        response = self.client.post(f'/api/quizzes/{unpublished_quiz.id}/publish/')
        # 404, not 403: the quiz is not in this instructor's queryset at all.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_submit_quiz_tracks_attempt_number(self):
        """Test quiz submission tracks attempt number correctly"""
        from courses.models import Enrollment
        from .models import QuizAttempt
        
        # Enroll student
        Enrollment.objects.get_or_create(student=self.student, course=self.course)
        
        # Add questions to quiz
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Test question?',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        option = QuestionOption.objects.create(
            question=question,
            option_text='Correct answer',
            is_correct=True
        )
        
        self.client.force_authenticate(user=self.student)
        
        # First attempt
        data = {
            'answers': [
                {
                    'question_id': str(question.id),
                    'selected_option_id': str(option.id)
                }
            ]
        }
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/submit/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['attempt_number'], 1)
        
        # Second attempt
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/submit/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['attempt_number'], 2)
        
        # Verify attempts in database
        attempts = QuizAttempt.objects.filter(quiz=self.quiz, student=self.student).order_by('attempt_number')
        self.assertEqual(attempts.count(), 2)
        self.assertEqual(attempts[0].attempt_number, 1)
        self.assertEqual(attempts[1].attempt_number, 2)
    
    def test_submit_quiz_calculates_score_and_time(self):
        """Test quiz submission calculates score and time taken"""
        from courses.models import Enrollment
        
        # Enroll student
        Enrollment.objects.get_or_create(student=self.student, course=self.course)
        
        # Add questions to quiz
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Test question?',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        option = QuestionOption.objects.create(
            question=question,
            option_text='Correct answer',
            is_correct=True
        )
        
        self.client.force_authenticate(user=self.student)
        data = {
            'answers': [
                {
                    'question_id': str(question.id),
                    'selected_option_id': str(option.id)
                }
            ]
        }
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/submit/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['score']), 10.0)
        self.assertEqual(float(response.data['percentage']), 100.0)
        self.assertTrue(response.data['passed'])
        self.assertIsNotNone(response.data['time_taken'])
    
    def test_attempts_endpoint_for_trainer(self):
        """Test attempts endpoint returns all attempts for trainer"""
        from courses.models import Enrollment
        from .models import QuizAttempt
        
        # Enroll student
        Enrollment.objects.get_or_create(student=self.student, course=self.course)
        
        # Create attempts
        QuizAttempt.objects.create(
            quiz=self.quiz,
            student=self.student,
            attempt_number=1,
            score=80,
            max_score=100,
            percentage=80,
            passed=True
        )
        QuizAttempt.objects.create(
            quiz=self.quiz,
            student=self.student,
            attempt_number=2,
            score=90,
            max_score=100,
            percentage=90,
            passed=True
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/attempts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_attempts_endpoint_wrong_instructor(self):
        """Test attempts endpoint fails for non-owner instructor"""
        self.client.force_authenticate(user=self.other_instructor)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/attempts/')
        # 404, not 403: the quiz is not in this instructor's queryset at all.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_my_attempts_endpoint_for_student(self):
        """Test my-attempts endpoint returns student's attempts"""
        from courses.models import Enrollment
        from .models import QuizAttempt
        
        # Enroll student
        Enrollment.objects.get_or_create(student=self.student, course=self.course)
        
        # Create attempts for this student
        QuizAttempt.objects.create(
            quiz=self.quiz,
            student=self.student,
            attempt_number=1,
            score=80,
            max_score=100,
            percentage=80,
            passed=True
        )
        
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/my-attempts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['attempt_number'], 1)
    
    def test_my_attempts_requires_enrollment(self):
        """Test my-attempts endpoint requires enrollment"""
        # self.student is enrolled in setUp, so use a separate unenrolled user.
        # An unenrolled user cannot see the quiz at all, so this is a 404
        # rather than the 403 the endpoint's own check would return.
        unenrolled = User.objects.create_user(
            username='unenrolled',
            email='unenrolled@test.com',
            password='testpass123',
            is_student=True,
        )
        self.client.force_authenticate(user=unenrolled)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/my-attempts/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_attempt_history_endpoint(self):
        """Test attempt_history endpoint returns detailed breakdown"""
        from courses.models import Enrollment
        from .models import QuizAttempt, QuizAnswer
        
        # Enroll student
        Enrollment.objects.get_or_create(student=self.student, course=self.course)
        
        # Add questions to quiz
        question1 = Question.objects.create(
            quiz=self.quiz,
            question_text='What is 2 + 2?',
            question_type='multiple_choice',
            points=10,
            explanation='Basic math',
            created_by=self.instructor
        )
        correct_option1 = QuestionOption.objects.create(
            question=question1,
            option_text='4',
            is_correct=True
        )
        wrong_option1 = QuestionOption.objects.create(
            question=question1,
            option_text='5',
            is_correct=False
        )
        
        question2 = Question.objects.create(
            quiz=self.quiz,
            question_text='What is 3 + 3?',
            question_type='multiple_choice',
            points=10,
            explanation='More math',
            created_by=self.instructor
        )
        correct_option2 = QuestionOption.objects.create(
            question=question2,
            option_text='6',
            is_correct=True
        )
        
        # Create first attempt (partial correct)
        attempt1 = QuizAttempt.objects.create(
            quiz=self.quiz,
            student=self.student,
            attempt_number=1,
            score=10,
            max_score=20,
            percentage=50,
            passed=False
        )
        answer1_1 = QuizAnswer.objects.create(
            attempt=attempt1,
            question=question1,
            selected_option=correct_option1,
            is_correct=True,
            points_earned=10
        )
        answer1_2 = QuizAnswer.objects.create(
            attempt=attempt1,
            question=question2,
            selected_option=wrong_option1,  # Wrong answer
            is_correct=False,
            points_earned=0
        )
        
        # Create second attempt (all correct)
        attempt2 = QuizAttempt.objects.create(
            quiz=self.quiz,
            student=self.student,
            attempt_number=2,
            score=20,
            max_score=20,
            percentage=100,
            passed=True
        )
        answer2_1 = QuizAnswer.objects.create(
            attempt=attempt2,
            question=question1,
            selected_option=correct_option1,
            is_correct=True,
            points_earned=10
        )
        answer2_2 = QuizAnswer.objects.create(
            attempt=attempt2,
            question=question2,
            selected_option=correct_option2,
            is_correct=True,
            points_earned=10
        )
        
        # Test as instructor
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/attempts/{self.student.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['student_id'], self.student.id)
        self.assertEqual(response.data['quiz_id'], self.quiz.id)
        self.assertEqual(len(response.data['attempts']), 2)
        
        # Verify attempts are in chronological order (oldest first)
        self.assertEqual(response.data['attempts'][0]['attempt_number'], 1)
        self.assertEqual(response.data['attempts'][1]['attempt_number'], 2)
        
        # Verify first attempt details
        first_attempt = response.data['attempts'][0]
        self.assertEqual(first_attempt['score'], 10.0)
        self.assertEqual(first_attempt['percentage'], 50.0)
        self.assertFalse(first_attempt['passed'])
        self.assertEqual(len(first_attempt['questions']), 2)
        
        # Verify question breakdown for first attempt
        q1_data = first_attempt['questions'][0]
        self.assertEqual(q1_data['question_text'], 'What is 2 + 2?')
        self.assertEqual(q1_data['points_earned'], 10)
        self.assertEqual(q1_data['student_answer'], '4')
        self.assertEqual(q1_data['correct_answer'], '4')
        self.assertTrue(q1_data['is_correct'])
        
        q2_data = first_attempt['questions'][1]
        self.assertEqual(q2_data['question_text'], 'What is 3 + 3?')
        self.assertEqual(q2_data['points_earned'], 0)
        self.assertFalse(q2_data['is_correct'])
        
        # Verify second attempt details
        second_attempt = response.data['attempts'][1]
        self.assertEqual(second_attempt['score'], 20.0)
        self.assertEqual(second_attempt['percentage'], 100.0)
        self.assertTrue(second_attempt['passed'])
    
    def test_attempt_history_wrong_instructor_fails(self):
        """Test attempt_history endpoint fails for non-owner instructor"""
        self.client.force_authenticate(user=self.other_instructor)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/attempts/{self.student.id}/')
        # 404, not 403: the quiz is not in this instructor's queryset at all.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_attempt_history_nonexistent_student(self):
        """Test attempt_history endpoint with non-existent student"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/attempts/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Student not found', response.data['detail'])
    
    def test_attempt_history_no_attempts(self):
        """Test attempt_history endpoint when student has no attempts"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/quizzes/{self.quiz.id}/attempts/{self.student.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('No attempts found', response.data['detail'])


class QuestionManagementTestCase(APITestCase):
    """Test cases for question management endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123',
            is_instructor=True
        )
        self.other_instructor = User.objects.create_user(
            username='other_instructor',
            email='other@test.com',
            password='testpass123',
            is_instructor=True
        )
        
        # Create category
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        # Create course
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.instructor,
            category=self.category,
            price=0
        )
        
        # Create quiz
        self.quiz = Quiz.objects.create(
            course=self.course,
            title='Test Quiz',
            description='Test quiz description',
            passing_score=70,
            time_limit=30,
            max_attempts=3,
            is_active=False
        )
        
        self.client = APIClient()
    
    def test_add_question_multiple_choice(self):
        """Test adding a multiple choice question to quiz"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'question_text': 'What is 2 + 2?',
            'question_type': 'multiple_choice',
            'points': 10,
            'explanation': 'Basic arithmetic',
            'options': [
                {'option_text': '3', 'is_correct': False, 'order': 0},
                {'option_text': '4', 'is_correct': True, 'order': 1},
                {'option_text': '5', 'is_correct': False, 'order': 2}
            ]
        }
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/questions/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['question_text'], 'What is 2 + 2?')
        self.assertEqual(len(response.data['options']), 3)
        self.assertEqual(Question.objects.filter(quiz=self.quiz).count(), 1)
    
    def test_add_question_true_false(self):
        """Test adding a true/false question to quiz"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'question_text': 'The sky is blue.',
            'question_type': 'true_false',
            'points': 5,
            'options': [
                {'option_text': 'True', 'is_correct': True, 'order': 0},
                {'option_text': 'False', 'is_correct': False, 'order': 1}
            ]
        }
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/questions/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['question_type'], 'true_false')
        self.assertEqual(len(response.data['options']), 2)
    
    def test_add_question_without_correct_answer_fails(self):
        """Test adding question without correct answer fails"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'question_text': 'What is 2 + 2?',
            'question_type': 'multiple_choice',
            'points': 10,
            'options': [
                {'option_text': '3', 'is_correct': False, 'order': 0},
                {'option_text': '5', 'is_correct': False, 'order': 1}
            ]
        }
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/questions/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('At least one correct answer', response.data['detail'])
    
    def test_add_question_without_options_fails(self):
        """Test adding multiple choice question without options fails"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'question_text': 'What is 2 + 2?',
            'question_type': 'multiple_choice',
            'points': 10,
            'options': []
        }
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/questions/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Options are required', response.data['detail'])
    
    def test_add_question_wrong_instructor_fails(self):
        """Test adding question by non-owner instructor fails"""
        self.client.force_authenticate(user=self.other_instructor)
        data = {
            'question_text': 'What is 2 + 2?',
            'question_type': 'multiple_choice',
            'points': 10,
            'options': [
                {'option_text': '4', 'is_correct': True, 'order': 0}
            ]
        }
        response = self.client.post(f'/api/quizzes/{self.quiz.id}/questions/', data, format='json')
        # 404, not 403: the quiz is not in this instructor's scoped queryset,
        # so its existence is not revealed (see PRODUCTION_READINESS.md P1-5).
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_add_question_sets_order_automatically(self):
        """Test adding questions sets order automatically"""
        self.client.force_authenticate(user=self.instructor)
        
        # Add first question
        data1 = {
            'question_text': 'Question 1',
            'question_type': 'multiple_choice',
            'points': 10,
            'options': [
                {'option_text': 'Answer', 'is_correct': True, 'order': 0}
            ]
        }
        response1 = self.client.post(f'/api/quizzes/{self.quiz.id}/questions/', data1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response1.data['order'], 1)
        
        # Add second question
        data2 = {
            'question_text': 'Question 2',
            'question_type': 'multiple_choice',
            'points': 10,
            'options': [
                {'option_text': 'Answer', 'is_correct': True, 'order': 0}
            ]
        }
        response2 = self.client.post(f'/api/quizzes/{self.quiz.id}/questions/', data2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response2.data['order'], 2)
    
    def test_update_question(self):
        """Test updating a question"""
        # Create question
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Original question',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        QuestionOption.objects.create(
            question=question,
            option_text='Original option',
            is_correct=True
        )
        
        self.client.force_authenticate(user=self.instructor)
        data = {
            'question_text': 'Updated question',
            'points': 15,
            'explanation': 'Updated explanation',
            'options': [
                {'option_text': 'New option 1', 'is_correct': True, 'order': 0},
                {'option_text': 'New option 2', 'is_correct': False, 'order': 1}
            ]
        }
        response = self.client.put(
            f'/api/quizzes/{self.quiz.id}/questions/{question.id}/', 
            data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['question_text'], 'Updated question')
        self.assertEqual(response.data['points'], 15)
        self.assertEqual(len(response.data['options']), 2)
        
        # Verify old options were deleted
        question.refresh_from_db()
        self.assertEqual(question.options.count(), 2)
    
    def test_update_question_partial(self):
        """Test partially updating a question (PATCH)"""
        # Create question
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Original question',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        QuestionOption.objects.create(
            question=question,
            option_text='Original option',
            is_correct=True
        )
        
        self.client.force_authenticate(user=self.instructor)
        data = {
            'points': 20
        }
        response = self.client.patch(
            f'/api/quizzes/{self.quiz.id}/questions/{question.id}/', 
            data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['points'], 20)
        self.assertEqual(response.data['question_text'], 'Original question')
    
    def test_update_question_without_correct_answer_fails(self):
        """Test updating question to have no correct answer fails"""
        # Create question
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Original question',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        QuestionOption.objects.create(
            question=question,
            option_text='Original option',
            is_correct=True
        )
        
        self.client.force_authenticate(user=self.instructor)
        data = {
            'options': [
                {'option_text': 'Option 1', 'is_correct': False, 'order': 0},
                {'option_text': 'Option 2', 'is_correct': False, 'order': 1}
            ]
        }
        response = self.client.put(
            f'/api/quizzes/{self.quiz.id}/questions/{question.id}/', 
            data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('At least one correct answer', response.data['detail'])
    
    def test_update_question_wrong_instructor_fails(self):
        """Test updating question by non-owner instructor fails"""
        # Create question
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Original question',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        
        self.client.force_authenticate(user=self.other_instructor)
        data = {
            'question_text': 'Updated question'
        }
        response = self.client.put(
            f'/api/quizzes/{self.quiz.id}/questions/{question.id}/', 
            data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_nonexistent_question_fails(self):
        """Test updating non-existent question fails"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'question_text': 'Updated question'
        }
        response = self.client.put(
            f'/api/quizzes/{self.quiz.id}/questions/99999/', 
            data, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_question(self):
        """Test deleting a question"""
        # Create question
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Question to delete',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        QuestionOption.objects.create(
            question=question,
            option_text='Option',
            is_correct=True
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/quizzes/{self.quiz.id}/questions/{question.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Question.objects.filter(id=question.id).count(), 0)
        # Verify options were cascade deleted
        self.assertEqual(QuestionOption.objects.filter(question_id=question.id).count(), 0)
    
    def test_delete_question_wrong_instructor_fails(self):
        """Test deleting question by non-owner instructor fails"""
        # Create question
        question = Question.objects.create(
            quiz=self.quiz,
            question_text='Question to delete',
            question_type='multiple_choice',
            points=10,
            created_by=self.instructor
        )
        
        self.client.force_authenticate(user=self.other_instructor)
        response = self.client.delete(f'/api/quizzes/{self.quiz.id}/questions/{question.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Question.objects.filter(id=question.id).count(), 1)
    
    def test_delete_nonexistent_question_fails(self):
        """Test deleting non-existent question fails"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/quizzes/{self.quiz.id}/questions/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
