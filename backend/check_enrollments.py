#!/usr/bin/env python
"""
Script to check enrollments for a specific course.
Usage: python check_enrollments.py <course_id>
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from courses.models import Course, Enrollment, Progress


def check_enrollments(course_id):
    """Check enrollments and progress for a course."""
    try:
        course = Course.objects.get(id=course_id)
        print(f"\n📚 Course: {course.title}")
        print(f"   Instructor: {course.instructor.username} ({course.instructor.email})")
        print(f"   Total Lessons: {course.lessons.count()}")
        print(f"   Status: {course.status}")
        
        enrollments = Enrollment.objects.filter(course=course).select_related('student')
        print(f"\n👥 Total Enrollments: {enrollments.count()}")
        
        if enrollments.count() == 0:
            print("   ⚠️  No students enrolled in this course")
            return
        
        print("\n📊 Student Progress:")
        print("-" * 80)
        
        for enrollment in enrollments:
            student = enrollment.student
            total_lessons = course.lessons.count()
            completed = Progress.objects.filter(
                student=student,
                lesson__course=course,
                completed=True
            ).count()
            percentage = int((completed / total_lessons) * 100) if total_lessons > 0 else 0
            
            print(f"\n   Student: {student.username} ({student.email})")
            print(f"   - ID: {student.id}")
            print(f"   - Is Student: {student.is_student}")
            print(f"   - Is Instructor: {student.is_instructor}")
            print(f"   - Enrolled: {enrollment.enrolled_at}")
            print(f"   - Progress: {completed}/{total_lessons} lessons ({percentage}%)")
        
        print("\n" + "=" * 80)
        
    except Course.DoesNotExist:
        print(f"❌ Course with ID {course_id} not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python check_enrollments.py <course_id>")
        print("\nExample:")
        print("  python check_enrollments.py 14")
        sys.exit(1)
    
    course_id = sys.argv[1]
    check_enrollments(course_id)
