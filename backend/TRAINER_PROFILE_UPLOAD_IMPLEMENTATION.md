# Trainer Profile Avatar Upload Implementation

## Overview

Successfully implemented the trainer profile avatar upload endpoint as specified in task 31 of the trainer dashboard features specification.

## Implementation Details

### Files Created/Modified

1. **backend/core/serializers.py**
   - Added `TrainerProfileSerializer` with avatar URL support
   - Includes validation for notification preferences JSON structure
   - Supports all trainer profile fields: first_name, last_name, email, phone, bio, expertise, avatar

2. **backend/core/trainer_views.py** (NEW)
   - Created `TrainerProfileViewSet` with the following actions:
     - `profile()` - GET /api/trainer/profile/ - Get trainer profile
     - `update_profile()` - PUT/PATCH /api/trainer/profile/update_profile/ - Update profile
     - `upload_avatar()` - POST /api/trainer/profile/upload_avatar/ - Upload avatar
     - `delete_avatar()` - DELETE /api/trainer/profile/delete_avatar/ - Delete avatar

3. **backend/core/permissions.py** (NEW)
   - Created `IsInstructor` permission class
   - Created `IsStudent` permission class
   - Created `IsOwner` permission class

4. **backend/core/api_urls.py**
   - Registered trainer profile endpoints
   - Routes:
     - `/api/trainer/profile/` - GET profile
     - `/api/trainer/profile/update_profile/` - PUT/PATCH update
     - `/api/trainer/profile/upload_avatar/` - POST upload
     - `/api/trainer/profile/delete_avatar/` - DELETE avatar

### Avatar Upload Endpoint Features

The `upload_avatar` endpoint implements all requirements from Requirement 6.2:

✅ **File Type Validation**
- Accepts: JPEG, PNG, GIF, WebP
- Rejects: All other file types with clear error message

✅ **File Size Validation**
- Maximum: 5MB
- Rejects larger files with clear error message

✅ **Storage**
- Saves to User.avatar field
- Files stored in `media/avatars/` directory
- Automatic filename handling to prevent conflicts

✅ **Response**
- Returns updated profile data including avatar URL
- Success message: "Avatar uploaded successfully."

✅ **Security**
- Requires authentication (IsAuthenticated)
- Requires instructor role (IsInstructor)
- Students and unauthenticated users receive 403/401 errors

## API Endpoints

### Upload Avatar
```
POST /api/trainer/profile/upload_avatar/
Content-Type: multipart/form-data

Body:
- avatar: <image file>

Response (200 OK):
{
  "detail": "Avatar uploaded successfully.",
  "profile": {
    "id": 1,
    "username": "trainer",
    "email": "trainer@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": null,
    "bio": null,
    "expertise": null,
    "avatar": "http://localhost:8000/media/avatars/avatar.jpg",
    "avatar_url": "http://localhost:8000/media/avatars/avatar.jpg",
    "notification_preferences": {}
  }
}

Error Responses:
- 400: File too large, invalid type, or missing file
- 401: Not authenticated
- 403: Not an instructor
```

### Get Profile
```
GET /api/trainer/profile/

Response (200 OK):
{
  "id": 1,
  "username": "trainer",
  "email": "trainer@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": null,
  "bio": null,
  "expertise": null,
  "avatar": "http://localhost:8000/media/avatars/avatar.jpg",
  "avatar_url": "http://localhost:8000/media/avatars/avatar.jpg",
  "notification_preferences": {}
}
```

### Delete Avatar
```
DELETE /api/trainer/profile/delete_avatar/

Response (200 OK):
{
  "detail": "Avatar deleted successfully."
}
```

## Testing

### Test Coverage

Created comprehensive test suite in `test_trainer_profile_upload.py`:

1. ✅ Valid JPEG upload
2. ✅ Valid PNG upload
3. ✅ File size validation (>5MB rejected)
4. ✅ File type validation (non-images rejected)
5. ✅ Missing file validation
6. ✅ Get trainer profile
7. ✅ Non-trainer access restriction
8. ✅ Avatar persistence in database

### Test Results

All tests passing:
```
============================================================
Testing Trainer Profile Avatar Upload Endpoint
============================================================

✅ Valid JPEG upload successful
✅ Valid PNG upload successful
✅ File size validation working
✅ File type validation working
✅ Missing file validation working
✅ Get profile successful
✅ Non-trainer access properly restricted
✅ Test data cleaned up

All tests completed!
============================================================
```

## Validation Rules

### File Type Validation
- Allowed MIME types:
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`

### File Size Validation
- Maximum size: 5,242,880 bytes (5MB)
- Validation occurs before file processing

### Permission Validation
- User must be authenticated
- User must have `is_instructor=True`

## Requirements Satisfied

✅ **Requirement 6.2**: WHEN a trainer uploads a profile image THEN the System SHALL validate file type (JPEG, PNG, GIF, WebP), validate file size (max 5MB), and store the image

### Validation Details:
1. File type validation: ✅ Implemented with allowed_types list
2. File size validation: ✅ Implemented with 5MB limit
3. Storage: ✅ Saves to User.avatar field
4. Returns updated profile: ✅ Returns full profile data with avatar URL

## Integration Notes

### Frontend Integration

The endpoint is ready for frontend integration:

```javascript
// Example: Upload avatar
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const response = await fetch('/api/trainer/profile/upload_avatar/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const data = await response.json();
console.log(data.profile.avatar_url); // Use this URL to display avatar
```

### Database Schema

Uses existing User model fields:
- `avatar`: ImageField (upload_to='avatars/')
- No migrations required (field already exists)

## Next Steps

The following related tasks should be implemented next:

- [ ] Task 29: Create TrainerProfileSerializer ✅ (Completed as part of this task)
- [ ] Task 30: Create TrainerProfileViewSet ✅ (Completed as part of this task)
- [ ] Task 32: Add password change endpoint
- [ ] Task 33: Register TrainerProfileViewSet in api_urls.py ✅ (Completed as part of this task)
- [ ] Task 34: Checkpoint - Verify trainer settings functionality

## Notes

- The implementation extends the existing User model which already has an avatar field
- No database migrations were required
- The endpoint follows Django REST Framework best practices
- All validation is performed server-side for security
- File uploads use MultiPartParser for proper handling
- Avatar URLs are absolute URLs including the domain (useful for frontend)
