#!/usr/bin/env python
"""
Django management script to seed the database with 5 courses and YouTube videos.
Run with: python manage.py shell < seed_courses.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Category
from django.utils import timezone

User = get_user_model()

print("\n" + "="*70)
print("SEEDING DATABASE WITH 5 COURSES AND YOUTUBE VIDEOS")
print("="*70 + "\n")

# Ensure instructor exists
print("Step 1: Creating/Getting Instructor User...")
instructor, created = User.objects.get_or_create(
    username='instructor',
    defaults={
        'email': 'instructor@lms.com',
        'first_name': 'John',
        'last_name': 'Instructor',
        'is_instructor': True,
        'is_student': False,
    }
)
if created:
    instructor.set_password('Instructor@123')
    instructor.save()
    print(f"✓ Created instructor: {instructor.username}\n")
else:
    print(f"✓ Instructor already exists: {instructor.username}\n")

# Create categories
print("Step 2: Creating Course Categories...")
categories_data = [
    {'name': 'Web Development', 'slug': 'web-development', 'description': 'Learn web development technologies'},
    {'name': 'Data Science', 'slug': 'data-science', 'description': 'Master data science and analytics'},
    {'name': 'Mobile Development', 'slug': 'mobile-development', 'description': 'Build mobile applications'},
    {'name': 'Cloud Computing', 'slug': 'cloud-computing', 'description': 'Learn cloud platforms and services'},
    {'name': 'AI & Machine Learning', 'slug': 'ai-ml', 'description': 'Explore artificial intelligence'},
]

categories = {}
for cat_data in categories_data:
    cat, created = Category.objects.get_or_create(
        name=cat_data['name'],
        defaults={
            'slug': cat_data['slug'],
            'description': cat_data['description']
        }
    )
    categories[cat_data['name']] = cat
    status = "✓" if created else "→"
    print(f"  {status} {cat.name}")

print()

# Create 5 courses with YouTube videos
print("Step 3: Creating 5 Courses with YouTube Videos...\n")

courses_data = [
    {
        'title': 'Python for Beginners',
        'description': 'Learn Python programming from scratch. Perfect for beginners with no prior coding experience. This comprehensive course covers all the fundamentals you need to start your programming journey.',
        'category': 'Web Development',
        'lessons': [
            {'title': 'Introduction to Python', 'order': 1, 'video_url': 'https://www.youtube.com/embed/kqtZrmDKwOc', 'content': 'Learn what Python is and why it\'s popular'},
            {'title': 'Setting Up Your Environment', 'order': 2, 'video_url': 'https://www.youtube.com/embed/YYXdyKSrF9w', 'content': 'Install Python and set up your development environment'},
            {'title': 'Variables and Data Types', 'order': 3, 'video_url': 'https://www.youtube.com/embed/OziWlHvAqS4', 'content': 'Understand variables, strings, numbers, and lists'},
            {'title': 'Control Flow: If Statements', 'order': 4, 'video_url': 'https://www.youtube.com/embed/f4KOjWS_KZs', 'content': 'Learn conditional statements and logic'},
            {'title': 'Loops and Iteration', 'order': 5, 'video_url': 'https://www.youtube.com/embed/beA8IsY3mQs', 'content': 'Master for and while loops'},
        ]
    },
    {
        'title': 'Advanced JavaScript & React',
        'description': 'Master modern JavaScript and React.js. Build interactive web applications with React hooks, state management, and component architecture. Learn best practices for production-ready code.',
        'category': 'Web Development',
        'lessons': [
            {'title': 'JavaScript ES6+ Fundamentals', 'order': 1, 'video_url': 'https://www.youtube.com/embed/SqcY0GlETPk', 'content': 'Arrow functions, destructuring, and spread operator'},
            {'title': 'Introduction to React', 'order': 2, 'video_url': 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'content': 'Components, JSX, and React basics'},
            {'title': 'React Hooks Deep Dive', 'order': 3, 'video_url': 'https://www.youtube.com/embed/TNhaISOUy6Q', 'content': 'useState, useEffect, and custom hooks'},
            {'title': 'State Management with Redux', 'order': 4, 'video_url': 'https://www.youtube.com/embed/1w7Oz1zj_0c', 'content': 'Redux store, actions, and reducers'},
            {'title': 'Building Real-World Applications', 'order': 5, 'video_url': 'https://www.youtube.com/embed/w7ejDZ8SWv8', 'content': 'Project structure and best practices'},
        ]
    },
    {
        'title': 'Data Science with Python',
        'description': 'Learn data analysis, visualization, and machine learning using Python libraries like Pandas, NumPy, and Scikit-learn. Work with real datasets and build predictive models.',
        'category': 'Data Science',
        'lessons': [
            {'title': 'NumPy Essentials', 'order': 1, 'video_url': 'https://www.youtube.com/embed/LHBE6QB23Ks', 'content': 'Arrays, operations, and linear algebra'},
            {'title': 'Pandas for Data Manipulation', 'order': 2, 'video_url': 'https://www.youtube.com/embed/vmEHCJofslg', 'content': 'DataFrames, indexing, and data cleaning'},
            {'title': 'Data Visualization with Matplotlib', 'order': 3, 'video_url': 'https://www.youtube.com/embed/UO98lJQ3QGY', 'content': 'Creating plots, charts, and visualizations'},
            {'title': 'Statistical Analysis', 'order': 4, 'video_url': 'https://www.youtube.com/embed/xxpc-HPKN28', 'content': 'Descriptive statistics and hypothesis testing'},
            {'title': 'Introduction to Machine Learning', 'order': 5, 'video_url': 'https://www.youtube.com/embed/aircAruvnKk', 'content': 'Supervised learning and model evaluation'},
        ]
    },
    {
        'title': 'AWS Cloud Fundamentals',
        'description': 'Get started with Amazon Web Services. Learn EC2, S3, RDS, and other core AWS services. Understand cloud architecture and best practices for scalable applications.',
        'category': 'Cloud Computing',
        'lessons': [
            {'title': 'AWS Basics and Account Setup', 'order': 1, 'video_url': 'https://www.youtube.com/embed/SOTamCx_auA', 'content': 'AWS console, regions, and availability zones'},
            {'title': 'EC2: Compute Services', 'order': 2, 'video_url': 'https://www.youtube.com/embed/Ia-UEYYR44s', 'content': 'Launch and manage virtual machines'},
            {'title': 'S3: Object Storage', 'order': 3, 'video_url': 'https://www.youtube.com/embed/e6w9LwZJFIA', 'content': 'Store and retrieve data at scale'},
            {'title': 'RDS: Database Services', 'order': 4, 'video_url': 'https://www.youtube.com/embed/eMzCI7S1P9M', 'content': 'Managed relational databases'},
            {'title': 'Security and IAM', 'order': 5, 'video_url': 'https://www.youtube.com/embed/SvdTv2l4DHc', 'content': 'Identity and access management'},
        ]
    },
    {
        'title': 'Introduction to Machine Learning',
        'description': 'Understand the fundamentals of machine learning. Learn supervised and unsupervised learning algorithms, model evaluation, and real-world applications. Build your first ML models.',
        'category': 'AI & Machine Learning',
        'lessons': [
            {'title': 'ML Concepts and Terminology', 'order': 1, 'video_url': 'https://www.youtube.com/embed/aircAruvnKk', 'content': 'Supervised vs unsupervised learning'},
            {'title': 'Linear Regression', 'order': 2, 'video_url': 'https://www.youtube.com/embed/4b4MfhrZM-I', 'content': 'Predict continuous values'},
            {'title': 'Classification Algorithms', 'order': 3, 'video_url': 'https://www.youtube.com/embed/7VeUPZLppQE', 'content': 'Logistic regression and decision trees'},
            {'title': 'Clustering and Dimensionality Reduction', 'order': 4, 'video_url': 'https://www.youtube.com/embed/4ZGtPUcSH58', 'content': 'K-means and PCA'},
            {'title': 'Model Evaluation and Validation', 'order': 5, 'video_url': 'https://www.youtube.com/embed/Gol_qOgRqfA', 'content': 'Cross-validation and performance metrics'},
        ]
    },
]

created_count = 0
for course_data in courses_data:
    category = categories[course_data['category']]
    lessons_data = course_data.pop('lessons')
    
    course, created = Course.objects.get_or_create(
        title=course_data['title'],
        instructor=instructor,
        defaults={
            'description': course_data['description'],
            'category': category,
            'status': 'published',
            'published_at': timezone.now(),
        }
    )
    
    if created:
        created_count += 1
        print(f"✓ Created Course: {course.title}")
        
        # Create lessons for this course
        for lesson_data in lessons_data:
            lesson, _ = Lesson.objects.get_or_create(
                course=course,
                order=lesson_data['order'],
                defaults={
                    'title': lesson_data['title'],
                    'video_url': lesson_data['video_url'],
                    'content': lesson_data['content'],
                }
            )
            print(f"  └─ Lesson {lesson.order}: {lesson.title}")
    else:
        print(f"→ Course already exists: {course.title}")

print()
print("="*70)
print("✓ DATABASE SEEDING COMPLETE!")
print("="*70)
print(f"\n📊 Summary:")
print(f"  • Courses created: {created_count}/5")
print(f"  • Total lessons: {Lesson.objects.count()}")
print(f"  • Instructor: {instructor.username}")
print(f"  • Categories: {Category.objects.count()}")

print(f"\n🔐 Instructor Credentials:")
print(f"  • Username: {instructor.username}")
print(f"  • Email: {instructor.email}")
print(f"  • Password: Instructor@123")

print(f"\n🔗 Access Points:")
print(f"  • Frontend: http://localhost:3000")
print(f"  • Backend API: http://localhost:8000/api/")
print(f"  • Admin Panel: http://localhost:8000/admin/")

print("\n" + "="*70 + "\n")
