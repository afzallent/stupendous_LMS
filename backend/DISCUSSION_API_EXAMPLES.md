# Discussion Forum API - Usage Examples

## Base URL
All endpoints are prefixed with: `http://localhost:8000/api/`

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. List Discussion Threads

**Request:**
```http
GET /api/discussions/?course_id=1
```

**Response:**
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "course": 1,
      "author": {
        "id": 2,
        "username": "student1",
        "first_name": "John",
        "last_name": "Doe",
        "is_instructor": false,
        "avatar_url": null
      },
      "title": "Question about Lesson 3",
      "content": "I don't understand the concept explained in lesson 3...",
      "is_pinned": false,
      "is_locked": false,
      "is_deleted": false,
      "reply_count": 5,
      "created_at": "2024-12-10T10:30:00Z",
      "updated_at": "2024-12-10T10:30:00Z",
      "last_activity_at": "2024-12-10T14:25:00Z"
    }
  ]
}
```

### 2. Create Discussion Thread

**Request:**
```http
POST /api/discussions/
Content-Type: application/json

{
  "course": 1,
  "title": "Question about Assignment 2",
  "content": "Can someone explain the requirements for assignment 2?"
}
```

**Response:**
```json
{
  "id": 3,
  "course": 1,
  "author": {
    "id": 2,
    "username": "student1",
    "first_name": "John",
    "last_name": "Doe",
    "is_instructor": false,
    "avatar_url": null
  },
  "title": "Question about Assignment 2",
  "content": "Can someone explain the requirements for assignment 2?",
  "is_pinned": false,
  "is_locked": false,
  "is_deleted": false,
  "reply_count": 0,
  "created_at": "2024-12-10T15:00:00Z",
  "updated_at": "2024-12-10T15:00:00Z",
  "last_activity_at": "2024-12-10T15:00:00Z"
}
```

### 3. Get Thread Details with Replies

**Request:**
```http
GET /api/discussions/1/
```

**Response:**
```json
{
  "id": 1,
  "course": 1,
  "author": {
    "id": 2,
    "username": "student1",
    "first_name": "John",
    "last_name": "Doe",
    "is_instructor": false,
    "avatar_url": null
  },
  "title": "Question about Lesson 3",
  "content": "I don't understand the concept explained in lesson 3...",
  "is_pinned": false,
  "is_locked": false,
  "is_deleted": false,
  "reply_count": 2,
  "replies": [
    {
      "id": 1,
      "author": {
        "id": 1,
        "username": "instructor",
        "first_name": "Jane",
        "last_name": "Smith",
        "is_instructor": true,
        "avatar_url": null
      },
      "content": "Great question! Let me explain...",
      "is_solution": true,
      "is_deleted": false,
      "created_at": "2024-12-10T11:00:00Z",
      "updated_at": "2024-12-10T11:00:00Z"
    },
    {
      "id": 2,
      "author": {
        "id": 3,
        "username": "student2",
        "first_name": "Bob",
        "last_name": "Johnson",
        "is_instructor": false,
        "avatar_url": null
      },
      "content": "Thanks for the explanation!",
      "is_solution": false,
      "is_deleted": false,
      "created_at": "2024-12-10T14:25:00Z",
      "updated_at": "2024-12-10T14:25:00Z"
    }
  ],
  "created_at": "2024-12-10T10:30:00Z",
  "updated_at": "2024-12-10T10:30:00Z",
  "last_activity_at": "2024-12-10T14:25:00Z"
}
```

### 4. Update Thread

**Request:**
```http
PUT /api/discussions/1/
Content-Type: application/json

{
  "course": 1,
  "title": "Question about Lesson 3 (Updated)",
  "content": "I don't understand the concept explained in lesson 3... [Additional details]"
}
```

**Response:**
```json
{
  "id": 1,
  "course": 1,
  "author": {...},
  "title": "Question about Lesson 3 (Updated)",
  "content": "I don't understand the concept explained in lesson 3... [Additional details]",
  "is_pinned": false,
  "is_locked": false,
  "is_deleted": false,
  "reply_count": 2,
  "created_at": "2024-12-10T10:30:00Z",
  "updated_at": "2024-12-10T15:30:00Z",
  "last_activity_at": "2024-12-10T14:25:00Z"
}
```

### 5. Delete Thread (Soft Delete)

**Request:**
```http
DELETE /api/discussions/1/
```

**Response:**
```http
204 No Content
```

### 6. Add Reply to Thread

**Request:**
```http
POST /api/discussions/1/replies/
Content-Type: application/json

{
  "content": "This is my reply to the thread"
}
```

**Response:**
```json
{
  "id": 3,
  "author": {
    "id": 2,
    "username": "student1",
    "first_name": "John",
    "last_name": "Doe",
    "is_instructor": false,
    "avatar_url": null
  },
  "content": "This is my reply to the thread",
  "is_solution": false,
  "is_deleted": false,
  "created_at": "2024-12-10T16:00:00Z",
  "updated_at": "2024-12-10T16:00:00Z"
}
```

### 7. Update Reply

**Request:**
```http
PUT /api/discussions/1/replies/3/
Content-Type: application/json

{
  "content": "This is my updated reply"
}
```

**Response:**
```json
{
  "id": 3,
  "author": {...},
  "content": "This is my updated reply",
  "is_solution": false,
  "is_deleted": false,
  "created_at": "2024-12-10T16:00:00Z",
  "updated_at": "2024-12-10T16:15:00Z"
}
```

### 8. Delete Reply (Soft Delete)

**Request:**
```http
DELETE /api/discussions/1/replies/3/
```

**Response:**
```http
204 No Content
```

### 9. Mark Reply as Solution (Instructor Only)

**Request:**
```http
POST /api/discussions/1/replies/1/mark_solution/
```

**Response:**
```json
{
  "id": 1,
  "author": {...},
  "content": "Great question! Let me explain...",
  "is_solution": true,
  "is_deleted": false,
  "created_at": "2024-12-10T11:00:00Z",
  "updated_at": "2024-12-10T16:30:00Z"
}
```

### 10. Pin Thread (Instructor Only)

**Request:**
```http
POST /api/discussions/1/pin/
```

**Response:**
```json
{
  "message": "Thread pinned successfully.",
  "thread": {
    "id": 1,
    "course": 1,
    "author": {...},
    "title": "Question about Lesson 3",
    "content": "...",
    "is_pinned": true,
    "is_locked": false,
    "is_deleted": false,
    "reply_count": 2,
    "created_at": "2024-12-10T10:30:00Z",
    "updated_at": "2024-12-10T16:35:00Z",
    "last_activity_at": "2024-12-10T14:25:00Z"
  }
}
```

### 11. Unpin Thread (Instructor Only)

**Request:**
```http
POST /api/discussions/1/pin/
```
(Same endpoint toggles pin status)

**Response:**
```json
{
  "message": "Thread unpinned successfully.",
  "thread": {
    "id": 1,
    "is_pinned": false,
    ...
  }
}
```

### 12. Lock Thread (Instructor Only)

**Request:**
```http
POST /api/discussions/1/lock/
```

**Response:**
```json
{
  "message": "Thread locked successfully.",
  "thread": {
    "id": 1,
    "course": 1,
    "author": {...},
    "title": "Question about Lesson 3",
    "content": "...",
    "is_pinned": false,
    "is_locked": true,
    "is_deleted": false,
    "reply_count": 2,
    "created_at": "2024-12-10T10:30:00Z",
    "updated_at": "2024-12-10T16:40:00Z",
    "last_activity_at": "2024-12-10T14:25:00Z"
  }
}
```

### 13. Unlock Thread (Instructor Only)

**Request:**
```http
POST /api/discussions/1/lock/
```
(Same endpoint toggles lock status)

**Response:**
```json
{
  "message": "Thread unlocked successfully.",
  "thread": {
    "id": 1,
    "is_locked": false,
    ...
  }
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You must be enrolled in this course to view threads."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 400 Bad Request (Locked Thread)
```json
{
  "error": "This thread is locked and cannot receive new replies."
}
```

## Permission Rules

### Students
- ✅ Can list threads in courses they're enrolled in
- ✅ Can create threads in courses they're enrolled in
- ✅ Can reply to threads in courses they're enrolled in
- ✅ Can edit their own threads and replies
- ✅ Can delete their own threads and replies
- ❌ Cannot pin/unpin threads
- ❌ Cannot lock/unlock threads
- ❌ Cannot mark solutions
- ❌ Cannot access threads in courses they're not enrolled in

### Instructors
- ✅ Can list threads in their own courses
- ✅ Can create threads in their own courses
- ✅ Can reply to threads in their own courses
- ✅ Can edit any thread in their courses
- ✅ Can delete any thread/reply in their courses
- ✅ Can pin/unpin threads in their courses
- ✅ Can lock/unlock threads in their courses
- ✅ Can mark solutions in their courses
- ❌ Cannot access threads in other instructors' courses

## Notes

1. **Soft Delete:** Deleted threads and replies are marked as `is_deleted=true` but remain in the database
2. **Last Activity:** Thread's `last_activity_at` is updated whenever a new reply is added
3. **Reply Count:** Only counts non-deleted replies
4. **Pinned Threads:** Appear first in the list, regardless of activity
5. **Locked Threads:** Cannot receive new replies
6. **Solution:** Only one reply per thread can be marked as solution
7. **Ordering:** Threads are ordered by pinned status first, then by last activity (most recent first)
