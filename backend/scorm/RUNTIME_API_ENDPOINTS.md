# SCORM Runtime API Endpoints

This document describes the REST API endpoints that implement the SCORM runtime API for communication between SCORM content and the LMS backend.

## Overview

The SCORM runtime API endpoints provide a RESTful interface to the SCORM API adapter. These endpoints allow SCORM content running in the browser to communicate with the LMS backend to track student progress and store CMI data.

**Base URL:** `/api/scorm/runtime/`

**Authentication:** All endpoints require authentication (IsAuthenticated permission).

## Endpoints

### 1. Initialize Session

**POST** `/api/scorm/runtime/initialize/`

Initializes a SCORM session for a student and SCO. This must be called before any other SCORM API methods.

**Request Body:**
```json
{
    "student_id": 1,
    "sco_id": 1,
    "parameter": ""
}
```

**Response:**
```json
{
    "success": true,
    "result": "true",
    "error_code": "0",
    "error_message": "No error"
}
```

**SCORM Equivalent:** `LMSInitialize("")`

**Validates:** Requirements 2.1

---

### 2. Get Value

**POST** `/api/scorm/runtime/get-value/`

Retrieves the value of a CMI data model element.

**Request Body:**
```json
{
    "student_id": 1,
    "sco_id": 1,
    "element": "cmi.core.lesson_status"
}
```

**Response:**
```json
{
    "success": true,
    "value": "incomplete",
    "error_code": "0",
    "error_message": "No error"
}
```

**Common CMI Elements:**
- `cmi.core.student_id` - Student ID (read-only)
- `cmi.core.student_name` - Student name (read-only)
- `cmi.core.lesson_status` - Lesson status (not attempted, incomplete, completed, passed, failed, browsed)
- `cmi.core.lesson_location` - Bookmark/location in content
- `cmi.core.score.raw` - Raw score
- `cmi.core.score.min` - Minimum score
- `cmi.core.score.max` - Maximum score
- `cmi.suspend_data` - Suspend data for state persistence
- `cmi.core.total_time` - Total time spent (read-only)

**SCORM Equivalent:** `LMSGetValue("cmi.core.lesson_status")`

**Validates:** Requirements 2.2

---

### 3. Set Value

**POST** `/api/scorm/runtime/set-value/`

Sets the value of a CMI data model element. Changes are not persisted until commit is called.

**Request Body:**
```json
{
    "student_id": 1,
    "sco_id": 1,
    "element": "cmi.core.lesson_status",
    "value": "completed"
}
```

**Response:**
```json
{
    "success": true,
    "result": "true",
    "error_code": "0",
    "error_message": "No error"
}
```

**Writable CMI Elements:**
- `cmi.core.lesson_status` - Lesson status
- `cmi.core.lesson_location` - Bookmark/location
- `cmi.core.score.raw` - Raw score
- `cmi.core.score.min` - Minimum score
- `cmi.core.score.max` - Maximum score
- `cmi.core.session_time` - Session time (write-only)
- `cmi.core.exit` - Exit mode (time-out, suspend, logout, "")
- `cmi.suspend_data` - Suspend data

**SCORM Equivalent:** `LMSSetValue("cmi.core.lesson_status", "completed")`

**Validates:** Requirements 2.2

---

### 4. Commit

**POST** `/api/scorm/runtime/commit/`

Persists all CMI data changes to the database. Should be called periodically and before termination.

**Request Body:**
```json
{
    "student_id": 1,
    "sco_id": 1,
    "parameter": ""
}
```

**Response:**
```json
{
    "success": true,
    "result": "true",
    "error_code": "0",
    "error_message": "No error"
}
```

**SCORM Equivalent:** `LMSCommit("")`

**Validates:** Requirements 2.5

---

### 5. Terminate

**POST** `/api/scorm/runtime/terminate/`

Commits any pending changes and terminates the SCORM session. No further API calls should be made after termination.

**Request Body:**
```json
{
    "student_id": 1,
    "sco_id": 1,
    "parameter": ""
}
```

**Response:**
```json
{
    "success": true,
    "result": "true",
    "error_code": "0",
    "error_message": "No error"
}
```

**SCORM Equivalent:** `LMSFinish("")`

**Validates:** Requirements 2.5

---

## Error Codes

All endpoints return SCORM-compliant error codes:

| Code | Description |
|------|-------------|
| 0 | No error |
| 101 | General exception |
| 102 | General initialization failure |
| 103 | Already initialized |
| 104 | Content instance terminated |
| 111 | General termination failure |
| 112 | Termination before initialization |
| 113 | Termination after termination |
| 122 | Retrieve data before initialization |
| 123 | Retrieve data after termination |
| 132 | Store data before initialization |
| 133 | Store data after termination |
| 142 | Commit before initialization |
| 143 | Commit after termination |
| 201 | Element not specified |
| 301 | Invalid argument error |
| 403 | Element is read only |
| 404 | Element is write only |
| 405 | Incorrect data type |

## Usage Example

### JavaScript Frontend Integration

```javascript
// SCORM API Wrapper for REST endpoints
class ScormAPIWrapper {
    constructor(studentId, scoId, baseUrl = '/api/scorm/runtime') {
        this.studentId = studentId;
        this.scoId = scoId;
        this.baseUrl = baseUrl;
        this.initialized = false;
    }
    
    async initialize() {
        const response = await fetch(`${this.baseUrl}/initialize/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({
                student_id: this.studentId,
                sco_id: this.scoId,
                parameter: ''
            })
        });
        
        const data = await response.json();
        this.initialized = data.success;
        return data.result;
    }
    
    async getValue(element) {
        const response = await fetch(`${this.baseUrl}/get-value/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({
                student_id: this.studentId,
                sco_id: this.scoId,
                element: element
            })
        });
        
        const data = await response.json();
        return data.value;
    }
    
    async setValue(element, value) {
        const response = await fetch(`${this.baseUrl}/set-value/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({
                student_id: this.studentId,
                sco_id: this.scoId,
                element: element,
                value: value
            })
        });
        
        const data = await response.json();
        return data.result;
    }
    
    async commit() {
        const response = await fetch(`${this.baseUrl}/commit/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({
                student_id: this.studentId,
                sco_id: this.scoId,
                parameter: ''
            })
        });
        
        const data = await response.json();
        return data.result;
    }
    
    async terminate() {
        const response = await fetch(`${this.baseUrl}/terminate/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({
                student_id: this.studentId,
                sco_id: this.scoId,
                parameter: ''
            })
        });
        
        const data = await response.json();
        this.initialized = false;
        return data.result;
    }
    
    getAuthToken() {
        // Implement your authentication token retrieval logic
        return localStorage.getItem('authToken');
    }
}

// Usage
const scormAPI = new ScormAPIWrapper(studentId, scoId);

// Initialize session
await scormAPI.initialize();

// Get lesson status
const status = await scormAPI.getValue('cmi.core.lesson_status');
console.log('Lesson status:', status);

// Set lesson status to completed
await scormAPI.setValue('cmi.core.lesson_status', 'completed');

// Set score
await scormAPI.setValue('cmi.core.score.raw', '85');

// Commit changes
await scormAPI.commit();

// Terminate session
await scormAPI.terminate();
```

## Session Management

- Sessions are stored in memory on the backend (in production, use Redis or similar cache)
- Each student/SCO combination has a separate session
- Sessions persist across multiple API calls until terminate is called
- Initialize creates a new session (or resets an existing one)
- Terminate removes the session from memory

## Best Practices

1. **Always initialize first:** Call initialize before any other API methods
2. **Commit periodically:** Call commit every few minutes to prevent data loss
3. **Terminate on exit:** Always call terminate when the student exits the content
4. **Handle errors:** Check the error_code in responses and handle errors appropriately
5. **Use suspend_data:** Store complex state in suspend_data for session persistence
6. **Set session_time:** Track time spent and set cmi.core.session_time before commit

## Testing

See `test_runtime_api_endpoints.py` for comprehensive test examples covering:
- Successful initialization, get/set, commit, and terminate
- Error handling for invalid states
- Full session workflow
- Multiple student sessions
- Authentication requirements

## Related Documentation

- [SCORM Runtime API Adapter](./RUNTIME_API_DOCUMENTATION.md) - Backend adapter implementation
- [SCORM Models](./MODELS_DOCUMENTATION.md) - Database models for SCORM data
- [SCORM Package Manager](./PACKAGE_MANAGER_USAGE.md) - Package upload and management
