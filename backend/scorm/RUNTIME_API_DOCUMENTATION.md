# SCORM Runtime API Documentation

## Overview

The SCORM Runtime API Adapter (`ScormAPIAdapter`) provides a Python implementation of the SCORM 1.2 and SCORM 2004 runtime API. This adapter enables SCORM content to communicate with the LMS by implementing the standard SCORM API methods.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           SCORM Content (JavaScript)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  window.API (SCORM 1.2)                          │  │
│  │  - LMSInitialize()                               │  │
│  │  - LMSGetValue()                                 │  │
│  │  - LMSSetValue()                                 │  │
│  │  - LMSCommit()                                   │  │
│  │  - LMSFinish()                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ (HTTP/AJAX)
┌─────────────────────────────────────────────────────────┐
│           Django Backend (Python)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  ScormAPIAdapter                                 │  │
│  │  - initialize()                                  │  │
│  │  - get_value()                                   │  │
│  │  - set_value()                                   │  │
│  │  - commit()                                      │  │
│  │  - terminate()                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Database (ScormData Model)                     │
│  - lesson_status, lesson_location                       │
│  - score_raw, score_min, score_max                      │
│  - suspend_data, session_time, total_time               │
│  - cmi_data (JSON)                                       │
└─────────────────────────────────────────────────────────┘
```

## ScormAPIAdapter Class

### Initialization

```python
from scorm.runtime_api import ScormAPIAdapter

adapter = ScormAPIAdapter(
    student_id=student.id,
    sco_id=sco.id,
    version='1.2'  # or '2004'
)
```

**Parameters:**
- `student_id` (int): ID of the student
- `sco_id` (int): ID of the SCO (Sharable Content Object)
- `version` (str): SCORM version ('1.2' or '2004')

### Session States

The adapter maintains three session states:

1. **NOT_INITIALIZED**: Initial state before `initialize()` is called
2. **INITIALIZED**: Active session after successful initialization
3. **TERMINATED**: Session ended after `terminate()` is called

### Core API Methods

#### initialize(parameter="")

Initializes a SCORM session. Must be called before any other API methods.

**Behavior:**
- Loads existing CMI data or creates new session
- Sets entry mode: 'ab-initio' (first time) or 'resume' (returning)
- Returns "true" on success, "false" on failure

**Example:**
```python
result = adapter.initialize()
if result == "true":
    print("Session initialized successfully")
```

**Validates: Requirements 2.1**

#### get_value(element)

Retrieves a CMI data model value.

**Parameters:**
- `element` (str): CMI element path (e.g., "cmi.core.lesson_status")

**Returns:**
- String value of the element, or empty string on error

**Common Elements:**
- `cmi.core.student_id` - Student ID (read-only)
- `cmi.core.student_name` - Student name (read-only)
- `cmi.core.lesson_status` - Current status (not attempted, incomplete, completed, passed, failed, browsed)
- `cmi.core.lesson_location` - Bookmark location
- `cmi.core.score.raw` - Raw score
- `cmi.core.score.min` - Minimum score
- `cmi.core.score.max` - Maximum score
- `cmi.suspend_data` - Suspend data for session restoration
- `cmi.core.total_time` - Total time spent (read-only)

**Example:**
```python
status = adapter.get_value('cmi.core.lesson_status')
location = adapter.get_value('cmi.core.lesson_location')
score = adapter.get_value('cmi.core.score.raw')
```

**Validates: Requirements 2.2**

#### set_value(element, value)

Sets a CMI data model value. Changes are not persisted until `commit()` is called.

**Parameters:**
- `element` (str): CMI element path
- `value` (str): Value to set

**Returns:**
- "true" on success, "false" on failure

**Common Elements:**
- `cmi.core.lesson_status` - Set status (passed, completed, failed, incomplete, browsed)
- `cmi.core.lesson_location` - Set bookmark
- `cmi.core.score.raw` - Set raw score (numeric)
- `cmi.core.score.min` - Set minimum score (numeric)
- `cmi.core.score.max` - Set maximum score (numeric)
- `cmi.core.session_time` - Set session time (HHHH:MM:SS.SS format)
- `cmi.core.exit` - Set exit mode (time-out, suspend, logout, or empty)
- `cmi.suspend_data` - Set suspend data (any string)

**Example:**
```python
adapter.set_value('cmi.core.lesson_status', 'completed')
adapter.set_value('cmi.core.lesson_location', 'page10')
adapter.set_value('cmi.core.score.raw', '85')
adapter.set_value('cmi.suspend_data', '{"page": 10, "answers": [1,2,3]}')
```

**Validates: Requirements 2.2**

#### commit(parameter="")

Persists all CMI data changes to the database.

**Behavior:**
- Saves all modified CMI values
- Updates total_time by adding session_time
- Stores session data in cmi_data JSON field

**Returns:**
- "true" on success, "false" on failure

**Example:**
```python
adapter.set_value('cmi.core.lesson_status', 'completed')
result = adapter.commit()
if result == "true":
    print("Data saved successfully")
```

**Validates: Requirements 2.5**

#### terminate(parameter="")

Terminates the SCORM session. Commits any pending changes and closes the session.

**Behavior:**
- Calls `commit()` to save pending changes
- Sets session state to TERMINATED
- No further API calls allowed after termination

**Returns:**
- "true" on success, "false" on failure

**Example:**
```python
result = adapter.terminate()
if result == "true":
    print("Session terminated successfully")
```

**Validates: Requirements 2.5**

### Error Handling Methods

#### get_last_error()

Returns the error code from the last API call.

**Returns:**
- Error code as string (e.g., "0" for no error, "103" for already initialized)

**Example:**
```python
error_code = adapter.get_last_error()
if error_code != "0":
    print(f"Error occurred: {error_code}")
```

#### get_error_string(error_code)

Returns a short description of an error code.

**Parameters:**
- `error_code` (str): Error code to look up

**Returns:**
- Error description string

**Example:**
```python
error_code = adapter.get_last_error()
error_msg = adapter.get_error_string(error_code)
print(f"Error: {error_msg}")
```

#### get_diagnostic(error_code)

Returns detailed diagnostic information for an error.

**Parameters:**
- `error_code` (str): Error code to get diagnostics for

**Returns:**
- Diagnostic information string

**Example:**
```python
diagnostic = adapter.get_diagnostic(adapter.get_last_error())
print(f"Diagnostic: {diagnostic}")
```

## Error Codes

### General Errors
- `0` - No error
- `101` - General exception
- `102` - General initialization failure
- `103` - Already initialized
- `104` - Content instance terminated
- `111` - General termination failure
- `112` - Termination before initialization
- `113` - Termination after termination

### Data Access Errors
- `122` - Retrieve data before initialization
- `123` - Retrieve data after termination
- `132` - Store data before initialization
- `133` - Store data after termination
- `142` - Commit before initialization
- `143` - Commit after termination

### Data Model Errors
- `201` - Element not specified
- `301` - Invalid argument error / Element not initialized
- `403` - Element is read only
- `404` - Element is write only
- `405` - Incorrect data type

## Usage Examples

### Basic Session Flow

```python
from scorm.runtime_api import ScormAPIAdapter

# Initialize adapter
adapter = ScormAPIAdapter(
    student_id=student.id,
    sco_id=sco.id,
    version='1.2'
)

# Start session
if adapter.initialize() == "true":
    # Get initial values
    status = adapter.get_value('cmi.core.lesson_status')
    location = adapter.get_value('cmi.core.lesson_location')
    
    # Update values
    adapter.set_value('cmi.core.lesson_location', 'page5')
    adapter.set_value('cmi.core.session_time', '0000:10:30.00')
    
    # Commit changes periodically
    adapter.commit()
    
    # Complete the lesson
    adapter.set_value('cmi.core.lesson_status', 'completed')
    adapter.set_value('cmi.core.score.raw', '95')
    
    # End session
    adapter.terminate()
```

### Resuming a Session

```python
# Initialize adapter for returning student
adapter = ScormAPIAdapter(
    student_id=student.id,
    sco_id=sco.id,
    version='1.2'
)

# Initialize - will load previous state
adapter.initialize()

# Check entry mode
entry = adapter.scorm_data.entry
if entry == 'resume':
    # Restore previous location
    location = adapter.get_value('cmi.core.lesson_location')
    suspend_data = adapter.get_value('cmi.suspend_data')
    print(f"Resuming from: {location}")
```

### Handling Errors

```python
adapter = ScormAPIAdapter(student_id=student.id, sco_id=sco.id)

# Try to get value before initialization
value = adapter.get_value('cmi.core.lesson_status')

# Check for error
error_code = adapter.get_last_error()
if error_code != "0":
    error_msg = adapter.get_error_string(error_code)
    print(f"Error {error_code}: {error_msg}")
    # Output: Error 122: Retrieve data before initialization
```

### Storing Complex Data

```python
import json

adapter = ScormAPIAdapter(student_id=student.id, sco_id=sco.id)
adapter.initialize()

# Store complex state as JSON in suspend_data
state = {
    'current_page': 10,
    'answers': [1, 2, 3, 4],
    'bookmarks': ['page5', 'page8'],
    'progress': 75
}

adapter.set_value('cmi.suspend_data', json.dumps(state))
adapter.commit()

# Later, retrieve and parse
suspend_data = adapter.get_value('cmi.suspend_data')
restored_state = json.loads(suspend_data)
```

## Read-Only Elements (SCORM 1.2)

The following elements cannot be modified by content:

- `cmi.core._children`
- `cmi.core.student_id`
- `cmi.core.student_name`
- `cmi.core.credit`
- `cmi.core.entry`
- `cmi.core.total_time`
- `cmi.core.lesson_mode`
- `cmi.launch_data`
- `cmi.comments_from_lms`
- `cmi.student_data._children`
- `cmi.student_data.mastery_score`
- `cmi.student_data.max_time_allowed`
- `cmi.student_data.time_limit_action`

## Write-Only Elements (SCORM 1.2)

The following elements can only be written, not read:

- `cmi.core.session_time`

## Time Format

SCORM uses the format `HHHH:MM:SS.SS` for time values:
- Hours: 0000-9999
- Minutes: 00-59
- Seconds: 00.00-59.99

**Examples:**
- `0000:05:30.00` - 5 minutes 30 seconds
- `0001:15:45.50` - 1 hour 15 minutes 45.5 seconds
- `0000:00:10.25` - 10.25 seconds

## Database Schema

The adapter stores data in the `ScormData` model:

```python
class ScormData(models.Model):
    student = ForeignKey(User)
    sco = ForeignKey(ScormSCO)
    
    # Core CMI elements
    lesson_status = CharField(max_length=20)
    lesson_location = CharField(max_length=255)
    suspend_data = TextField()
    score_raw = DecimalField(max_digits=5, decimal_places=2)
    score_min = DecimalField(max_digits=5, decimal_places=2)
    score_max = DecimalField(max_digits=5, decimal_places=2)
    session_time = CharField(max_length=50)
    total_time = CharField(max_length=50)
    
    # Additional data
    entry = CharField(max_length=20)
    exit = CharField(max_length=20)
    credit = CharField(max_length=20)
    mode = CharField(max_length=20)
    
    # Full CMI data as JSON
    cmi_data = JSONField(default=dict)
    
    # Timestamps
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    last_accessed = DateTimeField(auto_now=True)
```

## Testing

The adapter includes comprehensive unit tests covering:

- Session initialization (new and resume)
- Getting and setting CMI values
- Committing and terminating sessions
- Error handling for invalid operations
- State restoration across sessions
- Time accumulation
- Nested CMI data structures

Run tests with:
```bash
pytest backend/scorm/test_runtime_api.py -v
```

## Integration with Frontend

The adapter is designed to be called from Django views that handle AJAX requests from SCORM content:

```python
# Example view (to be implemented in task 9.2)
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from scorm.runtime_api import ScormAPIAdapter

@csrf_exempt
def scorm_api_initialize(request):
    student_id = request.user.id
    sco_id = request.POST.get('sco_id')
    
    adapter = ScormAPIAdapter(student_id=student_id, sco_id=sco_id)
    result = adapter.initialize()
    
    return JsonResponse({
        'result': result,
        'error_code': adapter.get_last_error()
    })
```

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 2.1**: SCORM API initialization for student-content sessions
- **Requirement 2.2**: CMI data model get/set operations
- **Requirement 2.5**: Session data persistence and termination

## Next Steps

Task 9.2 will implement the REST API endpoints that expose these adapter methods to SCORM content via HTTP/AJAX calls.
