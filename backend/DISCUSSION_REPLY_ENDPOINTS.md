# Discussion Reply Endpoints Implementation

## Overview
This document describes the implementation of discussion reply endpoints for the trainer dashboard features.

## Implemented Endpoints

### 1. Add Reply to Thread
**Endpoint:** `POST /api/discussions/{id}/replies/`

**Description:** Allows authenticated users to add replies to discussion threads.

**Permissions:**
- Students must be enrolled in the course
- Instructors must own the course
- Thread must not be locked

**Request Body:**
```json
{
  "content": "Reply content here"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "thread": 5,
  "author": {
    "id": 2,
    "username": "student1",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": null,
    "is_instructor": false
  },
  "content": "Reply content here",
  "is_solution": false,
  "is_deleted": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Features:**
- Automatically sets the current user as the author
- Updates the thread's `last_activity_at` timestamp
- Validates that the thread is not locked
- Verifies user has access to the course

---

### 2. Update Reply
**Endpoint:** `PUT /api/discussions/{id}/replies/{reply_id}/`

**Description:** Allows reply authors to update their own replies.

**Permissions:**
- Only the reply author can update their reply

**Request Body:**
```json
{
  "content": "Updated reply content"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "thread": 5,
  "author": {
    "id": 2,
    "username": "student1",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": null,
    "is_instructor": false
  },
  "content": "Updated reply content",
  "is_solution": false,
  "is_deleted": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

**Features:**
- Supports partial updates (PATCH-like behavior)
- Only the author can update their reply
- Updates the `updated_at` timestamp

---

### 3. Mark Reply as Solution
**Endpoint:** `POST /api/discussions/{id}/replies/{reply_id}/mark_solution/`

**Description:** Allows course instructors to mark a reply as the solution to the thread.

**Permissions:**
- Only the course instructor can mark solutions

**Request Body:** None required

**Response (200 OK):**
```json
{
  "id": 1,
  "thread": 5,
  "author": {
    "id": 2,
    "username": "student1",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": null,
    "is_instructor": false
  },
  "content": "This is the correct answer",
  "is_solution": true,
  "is_deleted": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:40:00Z"
}
```

**Features:**
- Automatically unmarks any previously marked solution in the thread
- Only one reply can be marked as solution per thread
- Only course instructors can mark solutions

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "This thread is locked and cannot receive new replies."
}
```

### 403 Forbidden
```json
{
  "detail": "You can only reply to threads in your own courses."
}
```

```json
{
  "detail": "You can only update your own replies."
}
```

```json
{
  "detail": "Only the course instructor can mark solutions."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

---

## Implementation Details

### Thread Last Activity Update
When a new reply is added, the thread's `last_activity_at` field is automatically updated to the current timestamp. This ensures threads with recent activity appear at the top of the list.

### Soft Delete Support
The endpoints respect the soft delete flag (`is_deleted`) and only operate on non-deleted replies.

### Permission Checks
All endpoints include comprehensive permission checks:
- Students must be enrolled in the course
- Instructors must own the course
- Reply authors can only update their own replies
- Only instructors can mark solutions

---

## Testing

All endpoints are covered by comprehensive unit tests in `discussions/tests.py`:

- `test_add_reply_as_student` - Students can add replies
- `test_add_reply_as_instructor` - Instructors can add replies
- `test_student_cannot_reply_without_enrollment` - Permission check
- `test_cannot_reply_to_locked_thread` - Locked thread validation
- `test_update_reply_as_author` - Authors can update replies
- `test_cannot_update_other_users_reply` - Permission check
- `test_mark_solution_as_instructor` - Instructors can mark solutions
- `test_student_cannot_mark_solution` - Permission check
- `test_mark_solution_unmarks_previous_solution` - Only one solution per thread

All tests pass successfully.

---

## Requirements Validation

This implementation satisfies the following requirements:

**Requirement 5.2:** WHEN a user replies to a thread THEN the System SHALL store reply content, author, parent thread, and timestamp
- ✅ All fields are stored correctly
- ✅ Author is automatically set to current user
- ✅ Timestamps are automatically managed

**Requirement 5.5:** WHEN a trainer marks a reply as solution THEN the System SHALL flag that reply and display it prominently
- ✅ `is_solution` flag is set correctly
- ✅ Only one solution per thread (previous solutions are unmarked)
- ✅ Only instructors can mark solutions

**Additional Features:**
- ✅ Thread's `last_activity_at` is updated on new reply
- ✅ Locked threads cannot receive new replies
- ✅ Comprehensive permission checks
- ✅ Soft delete support
