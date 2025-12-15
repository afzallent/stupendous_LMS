# SCORM Runtime API - Quick Reference

## Import

```python
from scorm.runtime_api import ScormAPIAdapter, ScormAPIError
```

## Basic Usage

```python
# Create adapter
adapter = ScormAPIAdapter(student_id=1, sco_id=1, version='1.2')

# Initialize session
adapter.initialize()  # Returns "true" or "false"

# Get value
value = adapter.get_value('cmi.core.lesson_status')

# Set value
adapter.set_value('cmi.core.lesson_status', 'completed')

# Commit changes
adapter.commit()

# End session
adapter.terminate()
```

## Common CMI Elements

### Read-Only
- `cmi.core.student_id` - Student ID
- `cmi.core.student_name` - Student name
- `cmi.core.total_time` - Total time spent
- `cmi.core.entry` - Entry mode (ab-initio, resume, empty)

### Writable
- `cmi.core.lesson_status` - Status (not attempted, incomplete, completed, passed, failed, browsed)
- `cmi.core.lesson_location` - Bookmark location
- `cmi.core.score.raw` - Raw score (0-100)
- `cmi.core.score.min` - Minimum score
- `cmi.core.score.max` - Maximum score
- `cmi.suspend_data` - Suspend data (any string)
- `cmi.core.session_time` - Session time (write-only, format: HHHH:MM:SS.SS)
- `cmi.core.exit` - Exit mode (time-out, suspend, logout, empty)

## Error Handling

```python
# Check last error
error_code = adapter.get_last_error()
if error_code != "0":
    error_msg = adapter.get_error_string(error_code)
    print(f"Error: {error_msg}")
```

## Common Error Codes

- `0` - No error
- `103` - Already initialized
- `122` - Retrieve data before initialization
- `132` - Store data before initialization
- `403` - Element is read only
- `404` - Element is write only
- `405` - Incorrect data type

## Complete Example

```python
from scorm.runtime_api import ScormAPIAdapter

# Initialize
adapter = ScormAPIAdapter(student_id=student.id, sco_id=sco.id)

if adapter.initialize() == "true":
    # Check if resuming
    entry = adapter.scorm_data.entry
    if entry == 'resume':
        # Get previous location
        location = adapter.get_value('cmi.core.lesson_location')
        suspend_data = adapter.get_value('cmi.suspend_data')
    
    # Update progress
    adapter.set_value('cmi.core.lesson_location', 'page10')
    adapter.set_value('cmi.core.session_time', '0000:15:30.00')
    
    # Commit periodically
    adapter.commit()
    
    # Complete lesson
    adapter.set_value('cmi.core.lesson_status', 'completed')
    adapter.set_value('cmi.core.score.raw', '95')
    
    # End session
    adapter.terminate()
```

## Time Format

Format: `HHHH:MM:SS.SS`

Examples:
- `0000:05:30.00` - 5 minutes 30 seconds
- `0001:15:45.50` - 1 hour 15 minutes 45.5 seconds

## Storing Complex Data

```python
import json

# Store as JSON in suspend_data
state = {'page': 10, 'answers': [1, 2, 3]}
adapter.set_value('cmi.suspend_data', json.dumps(state))

# Retrieve and parse
suspend_data = adapter.get_value('cmi.suspend_data')
state = json.loads(suspend_data)
```

## Session States

1. **NOT_INITIALIZED** - Before initialize()
2. **INITIALIZED** - After successful initialize()
3. **TERMINATED** - After terminate()

## Method Return Values

All methods return strings (not booleans):
- `"true"` - Success
- `"false"` - Failure

Check `get_last_error()` for error details.

## Testing

```bash
# Run all tests
pytest backend/scorm/test_runtime_api.py -v

# Run specific test
pytest backend/scorm/test_runtime_api.py::TestScormAPIAdapter::test_initialize_new_session -v
```

## Documentation

- Full documentation: `RUNTIME_API_DOCUMENTATION.md`
- Implementation summary: `RUNTIME_API_SUMMARY.md`
- This quick reference: `RUNTIME_API_QUICK_REFERENCE.md`
