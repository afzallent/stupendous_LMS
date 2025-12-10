# Discussion Moderation Endpoints Implementation

## Overview

This document describes the implementation of discussion moderation endpoints for the trainer dashboard features. These endpoints allow course instructors to moderate discussion threads and replies.

## Implemented Endpoints

### 1. Pin/Unpin Thread
**Endpoint:** `POST /api/discussions/{id}/pin/`

**Description:** Toggles the pinned status of a discussion thread. Pinned threads appear at the top of the discussion list.

**Permissions:** Only the course instructor can pin/unpin threads.

**Request:** No body required (toggle action)

**Response:**
```json
{
  "message": "Thread pinned successfully.",
  "thread": {
    "id": 1,
    "title": "Thread Title",
    "is_pinned": true,
    ...
  }
}
```

### 2. Lock/Unlock Thread
**Endpoint:** `POST /api/discussions/{id}/lock/`

**Description:** Toggles the locked status of a discussion thread. Locked threads cannot receive new replies.

**Permissions:** Only the course instructor can lock/unlock threads.

**Request:** No body required (toggle action)

**Response:**
```json
{
  "message": "Thread locked successfully.",
  "thread": {
    "id": 1,
    "title": "Thread Title",
    "is_locked": true,
    ...
  }
}
```

### 3. Soft Delete Reply
**Endpoint:** `DELETE /api/discussions/{id}/replies/{reply_id}/`

**Description:** Soft deletes a reply by setting `is_deleted=True`. The reply is preserved in the database but excluded from queries.

**Permissions:** 
- Reply author can delete their own reply
- Course instructor can delete any reply in their course

**Request:** No body required

**Response:**
```json
{
  "message": "Reply deleted successfully."
}
```
**Status Code:** 204 No Content

## Implementation Details

### Soft Delete for Threads
Thread soft delete was already implemented in the `perform_destroy` method:
- Sets `is_deleted=True` on the thread
- Thread author or course instructor can delete
- Deleted threads are filtered out in `get_queryset()`

### Soft Delete for Replies
Reply soft delete is now implemented in the `manage_reply` action:
- Sets `is_deleted=True` on the reply
- Reply author or course instructor can delete
- Deleted replies are excluded in serializers using `filter(is_deleted=False)`

### Permission Verification
All moderation actions verify that the user is the course instructor:
```python
if thread.course.instructor != user:
    raise PermissionDenied("Only the course instructor can [action] threads.")
```

### Combined Update/Delete Endpoint
The `manage_reply` action handles both PUT/PATCH (update) and DELETE (delete) methods for replies:
- **PUT/PATCH:** Only reply author can update
- **DELETE:** Reply author or course instructor can delete

## Testing

All moderation endpoints have comprehensive test coverage:

### Pin Tests
- ✅ `test_pin_thread_as_instructor` - Instructor can pin threads
- ✅ `test_unpin_thread_as_instructor` - Instructor can unpin threads
- ✅ `test_student_cannot_pin_thread` - Students cannot pin
- ✅ `test_instructor_cannot_pin_thread_in_other_course` - Cross-course protection

### Lock Tests
- ✅ `test_lock_thread_as_instructor` - Instructor can lock threads
- ✅ `test_unlock_thread_as_instructor` - Instructor can unlock threads
- ✅ `test_student_cannot_lock_thread` - Students cannot lock
- ✅ `test_instructor_cannot_lock_thread_in_other_course` - Cross-course protection
- ✅ `test_cannot_reply_to_locked_thread` - Locked threads reject new replies

### Delete Reply Tests
- ✅ `test_delete_reply_as_author` - Authors can delete their replies
- ✅ `test_delete_reply_as_instructor` - Instructors can delete any reply in their course
- ✅ `test_student_cannot_delete_other_users_reply` - Students cannot delete others' replies
- ✅ `test_instructor_cannot_delete_reply_in_other_course` - Cross-course protection
- ✅ `test_cannot_delete_already_deleted_reply` - Already deleted replies return 404

## Requirements Validation

This implementation satisfies **Requirement 5.7** from the requirements document:
- ✅ Pin action implemented (trainer only)
- ✅ Lock action implemented (trainer only)
- ✅ Soft delete for threads implemented
- ✅ Soft delete for replies implemented
- ✅ Trainer ownership verification for all moderation actions

## Usage Examples

### Pin a Thread
```bash
curl -X POST http://localhost:8000/api/discussions/1/pin/ \
  -H "Authorization: Bearer <token>"
```

### Lock a Thread
```bash
curl -X POST http://localhost:8000/api/discussions/1/lock/ \
  -H "Authorization: Bearer <token>"
```

### Delete a Reply
```bash
curl -X DELETE http://localhost:8000/api/discussions/1/replies/5/ \
  -H "Authorization: Bearer <token>"
```

## Database Schema

No database changes were required. The implementation uses existing fields:
- `DiscussionThread.is_pinned` (Boolean)
- `DiscussionThread.is_locked` (Boolean)
- `DiscussionThread.is_deleted` (Boolean)
- `DiscussionReply.is_deleted` (Boolean)

## Integration Notes

### Frontend Integration
The Astro frontend can now:
1. Display pinned threads at the top of lists
2. Show locked status and prevent reply attempts
3. Provide moderation controls for instructors
4. Hide soft-deleted content from users

### Ordering
Threads are automatically ordered by:
1. Pinned status (pinned first)
2. Last activity timestamp (most recent first)

This is handled in the model's `Meta.ordering` and the viewset's `get_queryset()`.

## Security Considerations

1. **Authorization:** All moderation actions verify course instructor status
2. **Cross-Course Protection:** Instructors cannot moderate threads in other instructors' courses
3. **Soft Delete:** Content is preserved for audit purposes
4. **Permission Checks:** Separate checks for different user roles (author vs instructor)

## Future Enhancements

Potential improvements for future iterations:
- Bulk moderation actions (pin/lock/delete multiple threads)
- Moderation history/audit log
- Restore deleted content functionality
- Moderation notifications to affected users
- Reason field for moderation actions
