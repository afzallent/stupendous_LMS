"""
Tests for discussions app
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from courses.models import Course, Category
from .models import DiscussionThread, DiscussionReply
from .serializers import (
    DiscussionThreadSerializer, 
    DiscussionReplySerializer, 
    ThreadDetailSerializer,
    AuthorSerializer
)

User = get_user_model()


class DiscussionSerializerTestCase(TestCase):
    """Test cases for discussion serializers"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123',
            is_instructor=True,
            first_name='John',
            last_name='Doe'
        )
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            is_student=True,
            first_name='Jane',
            last_name='Smith'
        )
        
        # Create category and course
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        self.course = Course.objects.create(
            title='Test Course',
            description='Test Description',
            instructor=self.instructor,
            category=self.category,
            price=0
        )
        
        # Create discussion thread
        self.thread = DiscussionThread.objects.create(
            course=self.course,
            author=self.student,
            title='Test Thread',
            content='This is a test thread content'
        )
        
        # Create replies
        self.reply1 = DiscussionReply.objects.create(
            thread=self.thread,
            author=self.instructor,
            content='This is a reply from instructor'
        )
        self.reply2 = DiscussionReply.objects.create(
            thread=self.thread,
            author=self.student,
            content='This is another reply'
        )
    
    def test_author_serializer(self):
        """Test AuthorSerializer includes correct fields"""
        serializer = AuthorSerializer(self.instructor)
        data = serializer.data
        
        self.assertEqual(data['id'], self.instructor.id)
        self.assertEqual(data['username'], 'instructor')
        self.assertEqual(data['first_name'], 'John')
        self.assertEqual(data['last_name'], 'Doe')
        self.assertTrue(data['is_instructor'])
        self.assertIn('avatar_url', data)
    
    def test_discussion_reply_serializer(self):
        """Test DiscussionReplySerializer includes author details"""
        serializer = DiscussionReplySerializer(self.reply1)
        data = serializer.data
        
        self.assertEqual(data['id'], self.reply1.id)
        self.assertEqual(data['content'], 'This is a reply from instructor')
        self.assertIn('author', data)
        self.assertEqual(data['author']['username'], 'instructor')
        self.assertFalse(data['is_solution'])
        self.assertFalse(data['is_deleted'])
    
    def test_discussion_thread_serializer(self):
        """Test DiscussionThreadSerializer includes reply count"""
        serializer = DiscussionThreadSerializer(self.thread)
        data = serializer.data
        
        self.assertEqual(data['id'], self.thread.id)
        self.assertEqual(data['title'], 'Test Thread')
        self.assertEqual(data['content'], 'This is a test thread content')
        self.assertIn('author', data)
        self.assertEqual(data['author']['username'], 'student')
        self.assertEqual(data['reply_count'], 2)
        self.assertFalse(data['is_pinned'])
        self.assertFalse(data['is_locked'])
    
    def test_thread_detail_serializer(self):
        """Test ThreadDetailSerializer includes nested replies"""
        serializer = ThreadDetailSerializer(self.thread)
        data = serializer.data
        
        self.assertEqual(data['id'], self.thread.id)
        self.assertEqual(data['title'], 'Test Thread')
        self.assertIn('replies', data)
        self.assertEqual(len(data['replies']), 2)
        self.assertEqual(data['reply_count'], 2)
        
        # Check replies are in chronological order
        self.assertEqual(data['replies'][0]['author']['username'], 'instructor')
        self.assertEqual(data['replies'][1]['author']['username'], 'student')
    
    def test_reply_count_excludes_deleted(self):
        """Test reply_count excludes soft-deleted replies"""
        # Soft delete one reply
        self.reply1.is_deleted = True
        self.reply1.save()
        
        serializer = DiscussionThreadSerializer(self.thread)
        data = serializer.data
        
        self.assertEqual(data['reply_count'], 1)
    
    def test_thread_detail_excludes_deleted_replies(self):
        """Test ThreadDetailSerializer excludes soft-deleted replies"""
        # Soft delete one reply
        self.reply1.is_deleted = True
        self.reply1.save()
        
        serializer = ThreadDetailSerializer(self.thread)
        data = serializer.data
        
        self.assertEqual(len(data['replies']), 1)
        self.assertEqual(data['replies'][0]['author']['username'], 'student')



class DiscussionThreadViewSetTestCase(APITestCase):
    """Test cases for DiscussionThreadViewSet"""
    
    def setUp(self):
        """Set up test data"""
        # Create users
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@test.com',
            password='testpass123',
            is_instructor=True
        )
        self.student = User.objects.create_user(
            username='student',
            email='student@test.com',
            password='testpass123',
            is_student=True
        )
        self.other_instructor = User.objects.create_user(
            username='other_instructor',
            email='other@test.com',
            password='testpass123',
            is_instructor=True
        )
        
        # Create category and courses
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
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
        
        # Enroll student in course
        from courses.models import Enrollment
        Enrollment.objects.create(student=self.student, course=self.course)
        
        # Create discussion threads
        self.thread1 = DiscussionThread.objects.create(
            course=self.course,
            author=self.student,
            title='Thread 1',
            content='Content 1'
        )
        self.thread2 = DiscussionThread.objects.create(
            course=self.course,
            author=self.instructor,
            title='Thread 2',
            content='Content 2',
            is_pinned=True
        )
        self.thread3 = DiscussionThread.objects.create(
            course=self.other_course,
            author=self.other_instructor,
            title='Thread 3',
            content='Content 3'
        )
    
    def test_list_threads_requires_authentication(self):
        """Test that listing threads requires authentication"""
        response = self.client.get('/api/discussions/')
        self.assertEqual(response.status_code, 401)
    
    def test_list_threads_filtered_by_course(self):
        """Test that threads are filtered by course_id parameter"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/discussions/?course_id={self.course.id}')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_list_threads_ordered_by_pinned_and_activity(self):
        """Test that threads are ordered by pinned status then last_activity_at"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/discussions/?course_id={self.course.id}')
        
        self.assertEqual(response.status_code, 200)
        # Pinned thread should be first
        self.assertEqual(response.data['results'][0]['id'], self.thread2.id)
        self.assertTrue(response.data['results'][0]['is_pinned'])
    
    def test_student_cannot_list_threads_without_enrollment(self):
        """Test that students cannot list threads for courses they're not enrolled in"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/discussions/?course_id={self.other_course.id}')
        
        self.assertEqual(response.status_code, 403)
    
    def test_instructor_cannot_list_threads_for_other_courses(self):
        """Test that instructors cannot list threads for courses they don't own"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/discussions/?course_id={self.other_course.id}')
        
        self.assertEqual(response.status_code, 403)
    
    def test_create_thread_as_student(self):
        """Test that enrolled students can create threads"""
        self.client.force_authenticate(user=self.student)
        data = {
            'course': self.course.id,
            'title': 'New Thread',
            'content': 'New content'
        }
        response = self.client.post('/api/discussions/', data)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['title'], 'New Thread')
        self.assertEqual(response.data['author']['username'], 'student')
    
    def test_student_cannot_create_thread_without_enrollment(self):
        """Test that students cannot create threads in courses they're not enrolled in"""
        self.client.force_authenticate(user=self.student)
        data = {
            'course': self.other_course.id,
            'title': 'New Thread',
            'content': 'New content'
        }
        response = self.client.post('/api/discussions/', data)
        
        self.assertEqual(response.status_code, 403)
    
    def test_create_thread_as_instructor(self):
        """Test that instructors can create threads in their own courses"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'course': self.course.id,
            'title': 'Instructor Thread',
            'content': 'Instructor content'
        }
        response = self.client.post('/api/discussions/', data)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['author']['username'], 'instructor')
    
    def test_instructor_cannot_create_thread_in_other_course(self):
        """Test that instructors cannot create threads in other instructors' courses"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'course': self.other_course.id,
            'title': 'New Thread',
            'content': 'New content'
        }
        response = self.client.post('/api/discussions/', data)
        
        self.assertEqual(response.status_code, 403)
    
    def test_retrieve_thread_as_student(self):
        """Test that enrolled students can retrieve thread details"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/discussions/{self.thread1.id}/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], self.thread1.id)
        self.assertIn('replies', response.data)
    
    def test_student_cannot_retrieve_thread_without_enrollment(self):
        """Test that students cannot retrieve threads from courses they're not enrolled in"""
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/discussions/{self.thread3.id}/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_update_thread_as_author(self):
        """Test that thread author can update their thread"""
        self.client.force_authenticate(user=self.student)
        data = {
            'title': 'Updated Title',
            'content': 'Updated content',
            'course': self.course.id
        }
        response = self.client.put(f'/api/discussions/{self.thread1.id}/', data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Updated Title')
    
    def test_update_thread_as_instructor(self):
        """Test that course instructor can update any thread in their course"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'title': 'Updated by Instructor',
            'content': 'Updated content',
            'course': self.course.id
        }
        response = self.client.put(f'/api/discussions/{self.thread1.id}/', data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Updated by Instructor')
    
    def test_cannot_update_other_users_thread(self):
        """Test that users cannot update threads they don't own"""
        # Create another student
        other_student = User.objects.create_user(
            username='other_student',
            email='other_student@test.com',
            password='testpass123',
            is_student=True
        )
        from courses.models import Enrollment
        Enrollment.objects.create(student=other_student, course=self.course)
        
        self.client.force_authenticate(user=other_student)
        data = {
            'title': 'Hacked Title',
            'content': 'Hacked content',
            'course': self.course.id
        }
        response = self.client.put(f'/api/discussions/{self.thread1.id}/', data)
        
        self.assertEqual(response.status_code, 403)
    
    def test_delete_thread_as_author(self):
        """Test that thread author can delete their thread (soft delete)"""
        self.client.force_authenticate(user=self.student)
        response = self.client.delete(f'/api/discussions/{self.thread1.id}/')
        
        self.assertEqual(response.status_code, 204)
        
        # Verify soft delete
        self.thread1.refresh_from_db()
        self.assertTrue(self.thread1.is_deleted)
    
    def test_delete_thread_as_instructor(self):
        """Test that course instructor can delete any thread in their course"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/discussions/{self.thread1.id}/')
        
        self.assertEqual(response.status_code, 204)
        
        # Verify soft delete
        self.thread1.refresh_from_db()
        self.assertTrue(self.thread1.is_deleted)
    
    def test_cannot_delete_other_users_thread(self):
        """Test that users cannot delete threads they don't own"""
        # Create another student
        other_student = User.objects.create_user(
            username='other_student',
            email='other_student@test.com',
            password='testpass123',
            is_student=True
        )
        from courses.models import Enrollment
        Enrollment.objects.create(student=other_student, course=self.course)
        
        self.client.force_authenticate(user=other_student)
        response = self.client.delete(f'/api/discussions/{self.thread1.id}/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_deleted_threads_not_in_list(self):
        """Test that soft-deleted threads are not returned in list"""
        self.thread1.is_deleted = True
        self.thread1.save()
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(f'/api/discussions/?course_id={self.course.id}')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.thread2.id)
    
    def test_add_reply_as_student(self):
        """Test that enrolled students can add replies to threads"""
        self.client.force_authenticate(user=self.student)
        data = {
            'content': 'This is my reply'
        }
        response = self.client.post(f'/api/discussions/{self.thread1.id}/replies/', data)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['content'], 'This is my reply')
        self.assertEqual(response.data['author']['username'], 'student')
        
        # Verify thread's last_activity_at was updated
        self.thread1.refresh_from_db()
        self.assertIsNotNone(self.thread1.last_activity_at)
    
    def test_add_reply_as_instructor(self):
        """Test that course instructor can add replies to threads"""
        self.client.force_authenticate(user=self.instructor)
        data = {
            'content': 'Instructor reply'
        }
        response = self.client.post(f'/api/discussions/{self.thread1.id}/replies/', data)
        
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['content'], 'Instructor reply')
        self.assertEqual(response.data['author']['username'], 'instructor')
    
    def test_student_cannot_reply_without_enrollment(self):
        """Test that students cannot reply to threads in courses they're not enrolled in"""
        self.client.force_authenticate(user=self.student)
        data = {
            'content': 'Unauthorized reply'
        }
        response = self.client.post(f'/api/discussions/{self.thread3.id}/replies/', data)
        
        self.assertEqual(response.status_code, 403)
    
    def test_cannot_reply_to_locked_thread(self):
        """Test that users cannot reply to locked threads"""
        self.thread1.is_locked = True
        self.thread1.save()
        
        self.client.force_authenticate(user=self.student)
        data = {
            'content': 'Reply to locked thread'
        }
        response = self.client.post(f'/api/discussions/{self.thread1.id}/replies/', data)
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('locked', response.data['error'].lower())
    
    def test_update_reply_as_author(self):
        """Test that reply author can update their reply"""
        # Create a reply first
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.student,
            content='Original content'
        )
        
        self.client.force_authenticate(user=self.student)
        data = {
            'content': 'Updated content'
        }
        response = self.client.put(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/', data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['content'], 'Updated content')
        
        # Verify database was updated
        reply.refresh_from_db()
        self.assertEqual(reply.content, 'Updated content')
    
    def test_cannot_update_other_users_reply(self):
        """Test that users cannot update replies they don't own"""
        # Create a reply by instructor
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.instructor,
            content='Instructor reply'
        )
        
        self.client.force_authenticate(user=self.student)
        data = {
            'content': 'Hacked content'
        }
        response = self.client.put(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/', data)
        
        self.assertEqual(response.status_code, 403)
    
    def test_mark_solution_as_instructor(self):
        """Test that course instructor can mark a reply as solution"""
        # Create a reply
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.student,
            content='Helpful answer'
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/mark_solution/')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_solution'])
        
        # Verify database was updated
        reply.refresh_from_db()
        self.assertTrue(reply.is_solution)
    
    def test_student_cannot_mark_solution(self):
        """Test that students cannot mark solutions"""
        # Create a reply
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.instructor,
            content='Helpful answer'
        )
        
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/mark_solution/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_mark_solution_unmarks_previous_solution(self):
        """Test that marking a new solution unmarks the previous one"""
        # Create two replies
        reply1 = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.student,
            content='First answer',
            is_solution=True
        )
        reply2 = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.instructor,
            content='Better answer'
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/replies/{reply2.id}/mark_solution/')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_solution'])
        
        # Verify first reply is no longer marked as solution
        reply1.refresh_from_db()
        self.assertFalse(reply1.is_solution)
        
        # Verify second reply is marked as solution
        reply2.refresh_from_db()
        self.assertTrue(reply2.is_solution)
    
    def test_pin_thread_as_instructor(self):
        """Test that course instructor can pin a thread"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/pin/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.data)
        self.assertIn('pinned', response.data['message'].lower())
        self.assertTrue(response.data['thread']['is_pinned'])
        
        # Verify database was updated
        self.thread1.refresh_from_db()
        self.assertTrue(self.thread1.is_pinned)
    
    def test_unpin_thread_as_instructor(self):
        """Test that course instructor can unpin a thread"""
        self.thread1.is_pinned = True
        self.thread1.save()
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/pin/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('unpinned', response.data['message'].lower())
        self.assertFalse(response.data['thread']['is_pinned'])
        
        # Verify database was updated
        self.thread1.refresh_from_db()
        self.assertFalse(self.thread1.is_pinned)
    
    def test_student_cannot_pin_thread(self):
        """Test that students cannot pin threads"""
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/pin/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_instructor_cannot_pin_thread_in_other_course(self):
        """Test that instructors cannot pin threads in other instructors' courses"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread3.id}/pin/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_lock_thread_as_instructor(self):
        """Test that course instructor can lock a thread"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/lock/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('message', response.data)
        self.assertIn('locked', response.data['message'].lower())
        self.assertTrue(response.data['thread']['is_locked'])
        
        # Verify database was updated
        self.thread1.refresh_from_db()
        self.assertTrue(self.thread1.is_locked)
    
    def test_unlock_thread_as_instructor(self):
        """Test that course instructor can unlock a thread"""
        self.thread1.is_locked = True
        self.thread1.save()
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/lock/')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('unlocked', response.data['message'].lower())
        self.assertFalse(response.data['thread']['is_locked'])
        
        # Verify database was updated
        self.thread1.refresh_from_db()
        self.assertFalse(self.thread1.is_locked)
    
    def test_student_cannot_lock_thread(self):
        """Test that students cannot lock threads"""
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/discussions/{self.thread1.id}/lock/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_instructor_cannot_lock_thread_in_other_course(self):
        """Test that instructors cannot lock threads in other instructors' courses"""
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(f'/api/discussions/{self.thread3.id}/lock/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_delete_reply_as_author(self):
        """Test that reply author can delete their reply (soft delete)"""
        # Create a reply
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.student,
            content='My reply'
        )
        
        self.client.force_authenticate(user=self.student)
        response = self.client.delete(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/')
        
        self.assertEqual(response.status_code, 204)
        
        # Verify soft delete
        reply.refresh_from_db()
        self.assertTrue(reply.is_deleted)
    
    def test_delete_reply_as_instructor(self):
        """Test that course instructor can delete any reply in their course"""
        # Create a reply by student
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.student,
            content='Student reply'
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/')
        
        self.assertEqual(response.status_code, 204)
        
        # Verify soft delete
        reply.refresh_from_db()
        self.assertTrue(reply.is_deleted)
    
    def test_student_cannot_delete_other_users_reply(self):
        """Test that students cannot delete replies they don't own"""
        # Create a reply by instructor
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.instructor,
            content='Instructor reply'
        )
        
        self.client.force_authenticate(user=self.student)
        response = self.client.delete(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_instructor_cannot_delete_reply_in_other_course(self):
        """Test that instructors cannot delete replies in other instructors' courses"""
        # Create a reply in other course
        reply = DiscussionReply.objects.create(
            thread=self.thread3,
            author=self.other_instructor,
            content='Other instructor reply'
        )
        
        self.client.force_authenticate(user=self.instructor)
        response = self.client.delete(f'/api/discussions/{self.thread3.id}/replies/{reply.id}/')
        
        self.assertEqual(response.status_code, 403)
    
    def test_cannot_delete_already_deleted_reply(self):
        """Test that attempting to delete an already deleted reply returns 404"""
        # Create and delete a reply
        reply = DiscussionReply.objects.create(
            thread=self.thread1,
            author=self.student,
            content='My reply',
            is_deleted=True
        )
        
        self.client.force_authenticate(user=self.student)
        response = self.client.delete(f'/api/discussions/{self.thread1.id}/replies/{reply.id}/')
        
        self.assertEqual(response.status_code, 404)
