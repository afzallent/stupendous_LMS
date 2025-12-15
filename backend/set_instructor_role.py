#!/usr/bin/env python
"""
Script to set a user as an instructor.
Usage: python set_instructor_role.py <username_or_email>
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from core.models import User


def set_instructor_role(identifier):
    """Set a user as an instructor by username or email."""
    try:
        # Try to find user by username first
        try:
            user = User.objects.get(username=identifier)
        except User.DoesNotExist:
            # Try by email
            user = User.objects.get(email=identifier)
        
        # Set instructor flag
        user.is_instructor = True
        user.save()
        
        print(f"✅ Successfully set {user.username} ({user.email}) as an instructor")
        print(f"   - is_instructor: {user.is_instructor}")
        print(f"   - is_student: {user.is_student}")
        print(f"   - is_staff: {user.is_staff}")
        
        return True
        
    except User.DoesNotExist:
        print(f"❌ User not found: {identifier}")
        print("   Please check the username or email and try again.")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python set_instructor_role.py <username_or_email>")
        print("\nExample:")
        print("  python set_instructor_role.py john_doe")
        print("  python set_instructor_role.py john@example.com")
        sys.exit(1)
    
    identifier = sys.argv[1]
    success = set_instructor_role(identifier)
    sys.exit(0 if success else 1)
