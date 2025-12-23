#!/usr/bin/env python
"""Seed sample courses with chapters and lessons."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from core.models import User
from courses.models import Course, Chapter, Lesson, Category

def create_categories():
    """Create course categories"""
    categories = [
        {'name': 'Computer Science', 'slug': 'computer-science', 'description': 'Fundamental computer science concepts'},
        {'name': 'Programming', 'slug': 'programming', 'description': 'Programming languages and development'},
        {'name': 'Data Science', 'slug': 'data-science', 'description': 'Data analysis and machine learning'},
    ]
    
    created = []
    for cat_data in categories:
        cat, _ = Category.objects.get_or_create(
            slug=cat_data['slug'],
            defaults=cat_data
        )
        created.append(cat)
        print(f"Category: {cat.name}")
    
    return created

def create_courses():
    """Create sample courses with chapters and lessons"""
    
    # Get or create trainer user
    trainer = User.objects.filter(is_instructor=True).first()
    if not trainer:
        print("No trainer found! Run create_test_users.py first.")
        return
    
    # Create categories first
    categories = create_categories()
    cs_category = Category.objects.get(slug='computer-science')
    prog_category = Category.objects.get(slug='programming')
    
    courses_data = [
        {
            'title': 'Computer Science Fundamentals',
            'description': 'Learn the core concepts of computer science including algorithms, data structures, and computational thinking.',
            'category': cs_category,
            'level': 'Beginner',
            'status': 'published',
            'is_free': True,
            'chapters': [
                {
                    'title': 'Introduction to Computing',
                    'description': 'Basic concepts of how computers work',
                    'lessons': [
                        {
                            'title': 'What is Computer Science?',
                            'content': 'Computer science is the study of computation, automation, and information.',
                            'video_url': 'https://www.youtube.com/embed/SzJ46YA_RaA',
                        },
                        {
                            'title': 'Binary and Number Systems',
                            'content': 'Understanding how computers represent data using binary.',
                            'video_url': 'https://www.youtube.com/embed/1GSjbWt0c9M',
                        },
                    ]
                },
                {
                    'title': 'Algorithms and Problem Solving',
                    'description': 'Learn to think algorithmically',
                    'lessons': [
                        {
                            'title': 'What is an Algorithm?',
                            'content': 'An algorithm is a step-by-step procedure for solving a problem.',
                            'video_url': 'https://www.youtube.com/embed/6hfOvs8pY1k',
                        },
                        {
                            'title': 'Basic Sorting Algorithms',
                            'content': 'Introduction to bubble sort, selection sort, and insertion sort.',
                            'video_url': 'https://www.youtube.com/embed/kPRA0W1kECg',
                        },
                    ]
                },
            ]
        },
        {
            'title': 'Python Programming for Beginners',
            'description': 'Start your programming journey with Python - the most beginner-friendly language.',
            'category': prog_category,
            'level': 'Beginner',
            'status': 'published',
            'price': 29.99,
            'is_free': False,
            'chapters': [
                {
                    'title': 'Getting Started with Python',
                    'description': 'Set up your environment and write your first program',
                    'lessons': [
                        {
                            'title': 'Installing Python',
                            'content': 'How to download and install Python on your computer.',
                            'video_url': 'https://www.youtube.com/embed/YYXdXT2l-Gg',
                        },
                        {
                            'title': 'Your First Python Program',
                            'content': 'Write and run your first Hello World program in Python.',
                            'video_url': 'https://www.youtube.com/embed/kqtD5dpn9C8',
                        },
                    ]
                },
                {
                    'title': 'Python Basics',
                    'description': 'Learn variables, data types, and basic operations',
                    'lessons': [
                        {
                            'title': 'Variables and Data Types',
                            'content': 'Understanding strings, integers, floats, and booleans in Python.',
                            'video_url': 'https://www.youtube.com/embed/cQT33yu9pY8',
                        },
                        {
                            'title': 'Control Flow: If Statements',
                            'content': 'Making decisions in your code with conditional statements.',
                            'video_url': 'https://www.youtube.com/embed/DZwmZ8Usvnk',
                        },
                    ]
                },
            ]
        },
    ]
    
    for course_data in courses_data:
        chapters_data = course_data.pop('chapters')
        
        course, created = Course.objects.get_or_create(
            title=course_data['title'],
            instructor=trainer,
            defaults=course_data
        )
        
        if created:
            print(f"\nCreated course: {course.title}")
        else:
            print(f"\nCourse exists: {course.title}")
        
        lesson_order = 1
        for chapter_idx, chapter_data in enumerate(chapters_data):
            lessons_data = chapter_data.pop('lessons')
            
            chapter, _ = Chapter.objects.get_or_create(
                course=course,
                title=chapter_data['title'],
                defaults={
                    **chapter_data,
                    'order': chapter_idx
                }
            )
            print(f"  Chapter {chapter_idx + 1}: {chapter.title}")
            
            for lesson_data in lessons_data:
                lesson, _ = Lesson.objects.get_or_create(
                    course=course,
                    chapter=chapter,
                    title=lesson_data['title'],
                    defaults={
                        **lesson_data,
                        'order': lesson_order
                    }
                )
                print(f"    Lesson {lesson_order}: {lesson.title}")
                lesson_order += 1

if __name__ == '__main__':
    create_courses()
    print("\n✅ Sample courses created successfully!")
