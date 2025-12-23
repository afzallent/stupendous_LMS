#!/usr/bin/env python
"""Create test users for development."""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from core.models import User

def create_test_users():
    users = [
        {
            'email': 'admin@test.com',
            'username': 'admin',
            'first_name': 'Admin',
            'last_name': 'User',
            'is_staff': True,
            'is_superuser': True,
            'is_student': False,
            'is_instructor': False,
            'password': 'admin123',
        },
        {
            'email': 'trainer@test.com',
            'username': 'trainer',
            'first_name': 'John',
            'last_name': 'Trainer',
            'is_instructor': True,
            'is_student': False,
            'password': 'trainer123',
        },
        {
            'email': 'student@test.com',
            'username': 'student',
            'first_name': 'Jane',
            'last_name': 'Student',
            'is_student': True,
            'is_instructor': False,
            'password': 'student123',
        },
    ]

    for user_data in users:
        password = user_data.pop('password')
        email = user_data['email']
        
        user, created = User.objects.get_or_create(
            email=email,
            defaults=user_data
        )
        
        if created:
            user.set_password(password)
            user.save()
            role = 'admin' if user.is_superuser else ('trainer' if user.is_instructor else 'student')
            print(f"Created user: {email} (role: {role})")
        else:
            print(f"User already exists: {email}")

if __name__ == '__main__':
    create_test_users()
    print("\nTest users created successfully!")
    print("Login credentials:")
    print("  Admin:   admin@test.com / admin123")
    print("  Trainer: trainer@test.com / trainer123")
    print("  Student: student@test.com / student123")
