#!/usr/bin/env python
"""
Script to add sample progress for student 'anil' in enrolled courses
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from core.models import User
from courses.models import Course, Lesson, Enrollment, Progress
from django.utils import timezone

def add_progress():
    # Get the student
    student = User.objects.get(username='anil')
    print(f"Adding progress for student: {student.username}")
    
    # Get enrolled courses
    enrollments = Enrollment.objects.filter(student=student)
    
    for enrollment in enrollments:
        course = enrollment.course
        lessons = course.lessons.all().order_by('order')
        total_lessons = lessons.count()
        
        print(f"\nCourse: {course.title}")
        print(f"Total lessons: {total_lessons}")
        
        # Mark first 3 lessons as completed (60% progress)
        completed_count = min(3, total_lessons)
        
        for i, lesson in enumerate(lessons[:completed_count]):
            progress, created = Progress.objects.get_or_create(
                student=student,
                lesson=lesson,
                defaults={
                    'completed': True,
                    'completed_at': timezone.now()
                }
            )
            
            if created:
                print(f"  ✓ Marked lesson {lesson.order} as completed: {lesson.title}")
            else:
                if not progress.completed:
                    progress.completed = True
                    progress.completed_at = timezone.now()
                    progress.save()
                    print(f"  ✓ Updated lesson {lesson.order} to completed: {lesson.title}")
                else:
                    print(f"  - Already completed: {lesson.title}")
        
        # Create progress entries for remaining lessons (not completed)
        for lesson in lessons[completed_count:]:
            progress, created = Progress.objects.get_or_create(
                student=student,
                lesson=lesson,
                defaults={
                    'completed': False
                }
            )
            if created:
                print(f"  ○ Created progress entry for: {lesson.title}")
    
    print("\n✅ Progress added successfully!")

if __name__ == '__main__':
    add_progress()
