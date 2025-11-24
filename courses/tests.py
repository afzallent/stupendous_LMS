from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Enrollment, Progress

User = get_user_model()

class LMSTests(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(username='inst', password='password', is_instructor=True)
        self.student = User.objects.create_user(username='stu', password='password', is_student=True)
        self.course = Course.objects.create(title='Test Course', description='Desc', instructor=self.instructor)
        self.lesson = Lesson.objects.create(course=self.course, title='L1', video_url='http://vid.com', order=1)

    def test_enrollment(self):
        self.client.login(username='stu', password='password')
        response = self.client.post(reverse('course_detail', args=[self.course.id]))
        self.assertTrue(Enrollment.objects.filter(student=self.student, course=self.course).exists())

    def test_instructor_create_course(self):
        self.client.login(username='inst', password='password')
        response = self.client.post(reverse('create_course'), {
            'title': 'New Course',
            'description': 'New Desc'
        })
        self.assertEqual(Course.objects.count(), 2)

    def test_progress_tracking(self):
        Enrollment.objects.create(student=self.student, course=self.course)
        self.client.login(username='stu', password='password')
        
        # View lesson
        self.client.get(reverse('lesson_detail', args=[self.course.id, self.lesson.id]))
        self.assertTrue(Progress.objects.filter(student=self.student, lesson=self.lesson).exists())
        
        # Mark complete
        self.client.post(reverse('lesson_detail', args=[self.course.id, self.lesson.id]), {'toggle_complete': '1'})
        self.assertTrue(Progress.objects.get(student=self.student, lesson=self.lesson).completed)
