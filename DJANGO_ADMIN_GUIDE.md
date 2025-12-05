# Django Admin User Management Guide

## Overview

The Django admin interface now includes comprehensive user management and password reset features. This guide explains how to use these features.

## Accessing Django Admin

1. Start the Django development server:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Navigate to: `http://localhost:8000/admin/`

3. Login with your admin credentials (superuser account)

## User Management Features

### User List View

The user list displays all users with the following information:

- **Username**: User's login name
- **Email**: User's email address
- **Full Name**: User's first and last name
- **Roles**: User's assigned roles (Superuser, Admin, Instructor, Student)
- **Status**: Active or Inactive badge
- **Date Joined**: When the user registered
- **Actions**: Quick edit link

### Filtering Users

Use the sidebar filters to narrow down the user list:

- **Active**: Filter by active/inactive status
- **Staff**: Filter by admin status
- **Student**: Filter by student role
- **Instructor**: Filter by instructor role
- **Date Joined**: Filter by registration date

### Searching Users

Search for users by:
- Username
- Email address
- First name
- Last name

## User Actions

### Bulk Actions

Select multiple users and perform bulk actions:

1. **Mark as Students**: Assign the student role to selected users
2. **Mark as Instructors**: Assign the instructor role to selected users
3. **Mark as Admins**: Assign the admin role to selected users
4. **Remove Student Role**: Remove the student role from selected users
5. **Remove Instructor Role**: Remove the instructor role from selected users
6. **Remove Admin Role**: Remove the admin role from selected users
7. **Activate Users**: Activate selected inactive users
8. **Deactivate Users**: Deactivate selected active users
9. **Reset Password**: Reset passwords for selected users

### How to Use Bulk Actions

1. Check the checkboxes next to the users you want to modify
2. Select an action from the "Action" dropdown at the top of the list
3. Click "Go" to execute the action
4. Confirm the action when prompted

### Individual User Management

Click on a username to edit individual user details:

#### Basic Information
- **Username**: User's login name (cannot be changed)
- **Password**: Change user's password
- **First Name**: User's first name
- **Last Name**: User's last name
- **Email**: User's email address
- **Phone**: Contact phone number
- **Location**: User's location
- **Website**: Personal website URL

#### Profile Information (Collapsible)
- **Avatar**: User's profile picture
- **Bio**: User biography
- **Notification Preferences**: JSON preferences for notifications

#### Roles & Permissions
- **Student**: Designates if user is a student
- **Instructor**: Designates if user is an instructor
- **Staff**: Designates if user is an admin
- **Superuser**: Designates if user is a superuser (full system access)

#### Status
- **Active**: Whether the user account is active

#### Important Dates (Collapsible)
- **Last Login**: When the user last logged in
- **Date Joined**: When the user registered
- **Created At**: When the user record was created
- **Updated At**: When the user record was last updated

## Password Reset

### Method 1: Bulk Password Reset

1. Select one or more users from the user list
2. Choose "Reset password for selected users" from the Actions dropdown
3. Click "Go"
4. A temporary password will be generated for each user
5. The temporary passwords will be displayed in a message

**Important**: Make note of the temporary passwords as they are only shown once. Users should change their password after logging in with the temporary password.

### Method 2: Individual Password Reset

1. Click on a user to edit their profile
2. Click the "Change password" link (or scroll to the password field)
3. Enter the new password
4. Click "Save"

### Method 3: Django Shell

For programmatic password resets:

```bash
cd backend
python manage.py shell
```

```python
from core.models import User

# Reset password for a specific user
user = User.objects.get(username='username')
user.set_password('new_password')
user.save()
print(f"Password reset for {user.username}")
```

## Creating New Users

### Via Django Admin

1. Click "Add User" button in the top right
2. Enter username and password
3. Click "Save and continue editing"
4. Assign roles (Student, Instructor, Admin)
5. Fill in additional profile information if needed
6. Click "Save"

### Via Django Shell

```bash
cd backend
python manage.py shell
```

```python
from core.models import User

# Create a new user
user = User.objects.create_user(
    username='newuser',
    email='newuser@example.com',
    password='secure_password',
    first_name='John',
    last_name='Doe',
    is_student=True
)
print(f"User {user.username} created successfully")
```

### Via Management Command

```bash
cd backend
python manage.py create_admin --username admin_user --email admin@example.com --password secure_password
```

## User Roles Explained

### Student
- Can enroll in courses
- Can view course content
- Can track their progress
- Cannot create courses

### Instructor
- Can create and manage courses
- Can add lessons to courses
- Can view student progress
- Cannot access admin panel (unless also marked as Staff)

### Admin (Staff)
- Can access Django admin panel
- Can manage all users
- Can reset passwords
- Can manage courses and lessons
- Can view all system data

### Superuser
- Full system access
- Can do everything an admin can do
- Can manage other admins
- Can access all Django features

## Best Practices

1. **Password Security**
   - Always use strong passwords (min 8 characters)
   - Encourage users to change temporary passwords immediately
   - Never share passwords via email or chat

2. **User Management**
   - Regularly review active users
   - Deactivate accounts for users who no longer need access
   - Keep user information up to date

3. **Role Assignment**
   - Assign the minimum necessary roles
   - Review role assignments periodically
   - Document why users have specific roles

4. **Admin Access**
   - Limit the number of admin users
   - Use strong passwords for admin accounts
   - Monitor admin activity

## Troubleshooting

### Can't Access Admin Panel
- Ensure you're logged in with a superuser or staff account
- Check that `is_staff` is set to `True` for your user
- Try logging out and logging back in

### Password Reset Not Working
- Ensure the user account is active (`is_active = True`)
- Check that you have admin permissions
- Try resetting via Django shell if admin interface fails

### User Not Appearing in List
- Check if the user is active (inactive users still appear but are marked)
- Try searching by username or email
- Check filters in the sidebar

## API Integration

The Django admin features complement the REST API endpoints:

- **API Endpoint**: `/api/users/` - List and manage users
- **API Endpoint**: `/api/users/{id}/reset_password/` - Reset password via API
- **API Endpoint**: `/api/users/create_user/` - Create new user via API

See `API_CLEANUP_GUIDE.md` for more information on API endpoints.

## Related Documentation

- `DEVELOPER_GUIDE.md` - General development guide
- `README.md` - Project overview
- `backend/README.md` - Backend-specific documentation
