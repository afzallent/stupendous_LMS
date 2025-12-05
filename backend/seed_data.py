"""
Django management script to seed the database with dummy data.
Run with: python manage.py shell < seed_data.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Category

User = get_user_model()

# Create admin user
print("Creating admin user...")
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'email': 'admin@coursecompass.com',
        'first_name': 'Admin',
        'last_name': 'User',
        'is_staff': True,
        'is_superuser': True,
        'is_instructor': True,
        'is_student': False,
    }
)

if created:
    admin_user.set_password('Admin@123')
    admin_user.save()
    print(f"✅ Admin user created: {admin_user.username}")
else:
    print(f"⚠️  Admin user already exists: {admin_user.username}")

# Create instructor user for courses
print("\nCreating instructor user...")
instructor_user, created = User.objects.get_or_create(
    username='instructor',
    defaults={
        'email': 'instructor@coursecompass.com',
        'first_name': 'John',
        'last_name': 'Instructor',
        'is_staff': False,
        'is_superuser': False,
        'is_instructor': True,
        'is_student': False,
    }
)

if created:
    instructor_user.set_password('Instructor@123')
    instructor_user.save()
    print(f"✅ Instructor user created: {instructor_user.username}")
else:
    print(f"⚠️  Instructor user already exists: {instructor_user.username}")

# Create or get categories
print("\nCreating categories...")
categories_data = [
    {'name': 'Web Development', 'description': 'Learn web development technologies'},
    {'name': 'Data Science', 'description': 'Master data science and analytics'},
    {'name': 'Mobile Development', 'description': 'Build mobile applications'},
    {'name': 'Cloud Computing', 'description': 'Learn cloud platforms and services'},
    {'name': 'AI & Machine Learning', 'description': 'Explore artificial intelligence'},
]

categories = {}
for cat_data in categories_data:
    cat, created = Category.objects.get_or_create(
        name=cat_data['name'],
        defaults={'description': cat_data['description']}
    )
    categories[cat_data['name']] = cat
    status = "✅ Created" if created else "⚠️  Exists"
    print(f"{status}: {cat.name}")

# Create dummy courses
print("\nCreating dummy courses...")
courses_data = [
    {
        'title': 'Python for Beginners',
        'description': 'Learn Python programming from scratch. Perfect for beginners with no prior coding experience.',
        'category': 'Web Development',
        'instructor': instructor_user,
        'video_url': 'https://www.youtube.com/embed/kqtZrmDKwOc',
    },
    {
        'title': 'Advanced JavaScript & React',
        'description': 'Master modern JavaScript and React.js. Build interactive web applications with React hooks and state management.',
        'category': 'Web Development',
        'instructor': instructor_user,
        'video_url': 'https://www.youtube.com/embed/SqcY0GlETPk',
    },
    {
        'title': 'Data Science with Python',
        'description': 'Learn data analysis, visualization, and machine learning using Python libraries like Pandas, NumPy, and Scikit-learn.',
        'category': 'Data Science',
        'instructor': instructor_user,
        'video_url': 'https://www.youtube.com/embed/LHBE6QB23Ks',
    },
    {
        'title': 'AWS Cloud Fundamentals',
        'description': 'Get started with Amazon Web Services. Learn EC2, S3, RDS, and other core AWS services.',
        'category': 'Cloud Computing',
        'instructor': instructor_user,
        'video_url': 'https://www.youtube.com/embed/SOTamCx_auA',
    },
    {
        'title': 'Introduction to Machine Learning',
        'description': 'Understand the fundamentals of machine learning. Learn supervised and unsupervised learning algorithms.',
        'category': 'AI & Machine Learning',
        'instructor': instructor_user,
        'video_url': 'https://www.youtube.com/embed/aircAruvnKk',
    },
]

created_courses = []
for course_data in courses_data:
    category = categories[course_data.pop('category')]
    
    course, created = Course.objects.get_or_create(
        title=course_data['title'],
        instructor=course_data['instructor'],
        defaults={
            'description': course_data['description'],
            'category': category,
            'video_url': course_data['video_url'],
        }
    )
    
    created_courses.append(course)
    status = "✅ Created" if created else "⚠️  Exists"
    print(f"{status}: {course.title}")

# Create sample lessons for each course
print("\nCreating sample lessons...")
lessons_data = [
    {'title': 'Introduction to Python', 'order': 1},
    {'title': 'Variables and Data Types', 'order': 2},
    {'title': 'Control Flow', 'order': 3},
    {'title': 'Functions and Modules', 'order': 4},
    {'title': 'Object-Oriented Programming', 'order': 5},
]

for course in created_courses:
    for lesson_data in lessons_data:
        lesson, created = Lesson.objects.get_or_create(
            course=course,
            title=lesson_data['title'],
            defaults={
                'order': lesson_data['order'],
                'video_url': 'https://www.youtube.com/embed/kqtZrmDKwOc',
                'description': f'{lesson_data["title"]} - Learn the fundamentals',
            }
        )
        if created:
            print(f"  ✅ Created lesson: {course.title} > {lesson.title}")

print("\n" + "="*60)
print("✅ DATABASE SEEDING COMPLETE!")
print("="*60)
print("\n📋 CREDENTIALS FOR VERIFICATION:\n")
print("Admin User:")
print("  Username: admin")
print("  Email: admin@coursecompass.com")
print("  Password: Admin@123")
print("\nInstructor User:")
print("  Username: instructor")
print("  Email: instructor@coursecompass.com")
print("  Password: Instructor@123")
print("\n📊 Data Created:")
print(f"  - 1 Admin User")
print(f"  - 1 Instructor User")
print(f"  - 5 Dummy Courses")
print(f"  - 25 Sample Lessons (5 per course)")
print(f"  - 5 Course Categories")
print("\n🔗 Access Points:")
print("  - Admin Panel: http://localhost:8000/admin/")
print("  - API: http://localhost:8000/api/")
print("  - Frontend: http://localhost:3000/")
print("="*60)
