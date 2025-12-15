# Fix: "Only instructors can import courses" Error

## Problem
When trying to use the import/export feature at `/instructor/import-export`, you're getting the error:
```
Only instructors can import courses.
```

This happens because the backend checks if `request.user.is_instructor` is `True`, but your user account doesn't have this flag set.

## Root Cause
The Django backend uses the `is_instructor` boolean field on the User model to determine if a user can perform instructor actions. When you registered your account, this flag may not have been set to `True`.

## Solution

You have three options to fix this:

### Option 1: Use Django Management Command (Recommended)

Run this command in your backend directory:

```bash
cd backend
python manage.py set_instructor <your_username_or_email>
```

**Example:**
```bash
python manage.py set_instructor john@example.com
```

To remove instructor role:
```bash
python manage.py set_instructor <username_or_email> --remove
```

### Option 2: Use the Python Script

Run this script from the backend directory:

```bash
cd backend
python set_instructor_role.py <your_username_or_email>
```

**Example:**
```bash
python set_instructor_role.py john@example.com
```

### Option 3: Use Django Admin Panel

1. Start your Django server:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. Go to the admin panel: http://localhost:8000/admin/

3. Log in with a superuser account (create one if needed with `python manage.py createsuperuser`)

4. Navigate to **Users** → Find your user → Edit

5. Check the **"Is instructor"** checkbox

6. Save the user

## Verification

After setting the instructor role, verify it worked:

```bash
cd backend
python manage.py shell
```

Then in the Python shell:
```python
from core.models import User
user = User.objects.get(email='your_email@example.com')
print(f"is_instructor: {user.is_instructor}")
print(f"is_student: {user.is_student}")
```

You should see `is_instructor: True`.

## Why This Happens

The Django backend has a custom User model with role flags:
- `is_student`: Boolean flag for student role
- `is_instructor`: Boolean flag for instructor/trainer role
- `is_staff`: Boolean flag for admin role

The frontend maps these to:
- `is_instructor=True` → `TRAINER` role
- `is_student=True` → `STUDENT` role
- `is_staff=True` → `ADMIN` role

When you register a new account, the default role is `STUDENT` (only `is_student=True`). To access instructor features like import/export, you need `is_instructor=True`.

## Files Created

I've created two tools to help you set the instructor role:

1. **Management Command**: `backend/core/management/commands/set_instructor.py`
   - Proper Django way to manage user roles
   - Can be run with `python manage.py set_instructor`

2. **Standalone Script**: `backend/set_instructor_role.py`
   - Quick script for one-off role changes
   - Can be run with `python set_instructor_role.py`

## Next Steps

After setting your user as an instructor:

1. Log out of the frontend application
2. Log back in
3. Navigate to `/instructor/import-export`
4. The import/export feature should now work

The frontend will automatically detect your new role on the next login and map it to `TRAINER`.
