#!/usr/bin/env python
"""
Test script to verify all Quiz API endpoints are properly registered and working.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from courses.models import Course, Enrollment
from quizzes.models import Quiz, Question, QuestionOption
import json

User = get_user_model()


class QuizEndpointTests(TestCase):
    """Test all quiz endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.instructor = User.objects.create_user(
            username='test_instructor',
            password='testpass123',
            email='instructor@test.com',
            is_instructor=True
        )
        
        self.student = User.objects.create_user(
            username='test_student',
            password='testpass123',
            email='student@test.com',
            is_student=True
        )
        
        # Create test course
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.instructor
        )
        
        # Enroll student
        Enrollment.objects.create(student=self.student, course=self.course)
        
        # Create API clients
        self.instructor_client = APIClient()
        self.student_client = APIClient()
        
        # Force authenticate
        self.instructor_client.force_authenticate(user=self.instructor)
        self.student_client.force_authenticate(user=self.student)
    
    def test_all_endpoints(self):
        """Test all quiz endpoints"""
        print("\n" + "="*60)
        print("Testing Quiz API Endpoints")
        print("="*60 + "\n")
        
        # Test 1: List quizzes
        print("Test 1: List quizzes")
        response = self.instructor_client.get('/api/quizzes/')
        self.assertEqual(response.status_code, 200)
        print(f"✓ PASS: GET /api/quizzes/ - Status: {response.status_code}")
        
        # Test 2: Create quiz
        print("\nTest 2: Create quiz")
        quiz_data = {
            'course': self.course.id,
            'title': 'Test Quiz',
            'description': 'Test quiz description',
            'passing_score': 70,
            'time_limit': 30,
            'max_attempts': 3
        }
        response = self.instructor_client.post(
            '/api/quizzes/',
            data=json.dumps(quiz_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        quiz_id = response.json()['id']
        print(f"✓ PASS: POST /api/quizzes/ - Status: {response.status_code}, Quiz ID: {quiz_id}")
        
        # Test 3: Get quiz details
        print("\nTest 3: Get quiz details")
        response = self.instructor_client.get(f'/api/quizzes/{quiz_id}/')
        self.assertEqual(response.status_code, 200)
        print(f"✓ PASS: GET /api/quizzes/{quiz_id}/ - Status: {response.status_code}")
        
        # Test 4: Update quiz
        print("\nTest 4: Update quiz")
        update_data = {
            'course': self.course.id,
            'title': 'Updated Test Quiz',
            'description': 'Updated description',
            'passing_score': 75,
            'time_limit': 45,
            'max_attempts': 5
        }
        response = self.instructor_client.put(
            f'/api/quizzes/{quiz_id}/',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        print(f"✓ PASS: PUT /api/quizzes/{quiz_id}/ - Status: {response.status_code}")
        
        # Test 5: Add question to quiz
        print("\nTest 5: Add question to quiz")
        question_data = {
            'question_text': 'What is 2+2?',
            'question_type': 'multiple_choice',
            'points': 10,
            'explanation': 'Basic math',
            'options': [
                {'option_text': '3', 'is_correct': False, 'order': 0},
                {'option_text': '4', 'is_correct': True, 'order': 1},
                {'option_text': '5', 'is_correct': False, 'order': 2}
            ]
        }
        response = self.instructor_client.post(
            f'/api/quizzes/{quiz_id}/questions/',
            data=json.dumps(question_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        question_id = response.json()['id']
        print(f"✓ PASS: POST /api/quizzes/{quiz_id}/questions/ - Status: {response.status_code}, Question ID: {question_id}")
        
        # Test 6: Update question
        print("\nTest 6: Update question")
        update_question_data = {
            'question_text': 'What is 2+2? (Updated)',
            'points': 15,
            'options': [
                {'option_text': '3', 'is_correct': False, 'order': 0},
                {'option_text': '4', 'is_correct': True, 'order': 1},
                {'option_text': '5', 'is_correct': False, 'order': 2}
            ]
        }
        response = self.instructor_client.put(
            f'/api/quizzes/{quiz_id}/questions/{question_id}/',
            data=json.dumps(update_question_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        print(f"✓ PASS: PUT /api/quizzes/{quiz_id}/questions/{question_id}/ - Status: {response.status_code}")
        
        # Test 7: Publish quiz
        print("\nTest 7: Publish quiz")
        response = self.instructor_client.post(f'/api/quizzes/{quiz_id}/publish/')
        self.assertEqual(response.status_code, 200)
        print(f"✓ PASS: POST /api/quizzes/{quiz_id}/publish/ - Status: {response.status_code}")
        
        # Test 8: Submit quiz
        print("\nTest 8: Submit quiz (student)")
        quiz = Quiz.objects.get(id=quiz_id)
        question = quiz.questions.first()
        correct_option = question.options.filter(is_correct=True).first()
        
        submission_data = {
            'answers': [
                {
                    'question_id': question.id,
                    'selected_option_id': correct_option.id
                }
            ]
        }
        response = self.student_client.post(
            f'/api/quizzes/{quiz_id}/submit/',
            data=json.dumps(submission_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        print(f"✓ PASS: POST /api/quizzes/{quiz_id}/submit/ - Status: {response.status_code}")
        
        # Test 9: Get my attempts
        print("\nTest 9: Get my attempts (student)")
        response = self.student_client.get(f'/api/quizzes/{quiz_id}/my-attempts/')
        self.assertEqual(response.status_code, 200)
        attempts_count = len(response.json())
        print(f"✓ PASS: GET /api/quizzes/{quiz_id}/my-attempts/ - Status: {response.status_code}, Attempts: {attempts_count}")
        
        # Test 10: Get all attempts
        print("\nTest 10: Get all attempts (instructor)")
        response = self.instructor_client.get(f'/api/quizzes/{quiz_id}/attempts/')
        self.assertEqual(response.status_code, 200)
        attempts_count = len(response.json())
        print(f"✓ PASS: GET /api/quizzes/{quiz_id}/attempts/ - Status: {response.status_code}, Attempts: {attempts_count}")
        
        # Test 11: Get attempt history
        print("\nTest 11: Get attempt history (instructor)")
        response = self.instructor_client.get(f'/api/quizzes/{quiz_id}/attempts/{self.student.id}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        print(f"✓ PASS: GET /api/quizzes/{quiz_id}/attempts/{self.student.id}/ - Status: {response.status_code}")
        print(f"  Student: {data.get('student_name')}, Total attempts: {len(data.get('attempts', []))}")
        
        # Test 12: Delete question
        print("\nTest 12: Delete question")
        response = self.instructor_client.delete(f'/api/quizzes/{quiz_id}/questions/{question_id}/')
        self.assertEqual(response.status_code, 204)
        print(f"✓ PASS: DELETE /api/quizzes/{quiz_id}/questions/{question_id}/ - Status: {response.status_code}")
        
        # Test 13: Delete quiz
        print("\nTest 13: Delete quiz")
        response = self.instructor_client.delete(f'/api/quizzes/{quiz_id}/')
        self.assertEqual(response.status_code, 204)
        print(f"✓ PASS: DELETE /api/quizzes/{quiz_id}/ - Status: {response.status_code}")
        
        print("\n" + "="*60)
        print("All endpoint tests completed successfully!")
        print("="*60 + "\n")


if __name__ == '__main__':
    import unittest
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(QuizEndpointTests)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=0)
    result = runner.run(suite)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)
