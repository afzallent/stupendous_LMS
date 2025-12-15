# SCORM/xAPI Data Synchronization Manager

## Overview

The Data Synchronization Manager ensures consistency between SCORM CMI data, xAPI statements, and the existing Progress/QuizAttempt models in the LMS. This maintains a unified view of student progress across all tracking mechanisms.

## Components

### 1. DataSyncManager Class (`scorm/sync_manager.py`)

The core synchronization engine that provides methods for:

- **sync_scorm_to_progress()**: Updates Progress model when SCORM content reports completion
- **sync_xapi_to_progress()**: Updates Progress model from xAPI completion statements
- **sync_xapi_to_quiz_attempt()**: Updates QuizAttempt model from xAPI quiz statements
- **sync_content_interaction_to_progress()**: Updates Progress from content interactions
- **reconcile_discrepancies()**: Finds and fixes synchronization inconsistencies
- **calculate_course_progress_from_xapi()**: Calculates progress from xAPI statements
- **calculate_course_progress_from_model()**: Calculates progress from Progress model
- **verify_progress_consistency()**: Verifies consistency between tracking systems

### 2. Django Signals (`scorm/signals.py`)

Automatic synchronization triggers:

#### sync_scorm_completion Signal
- **Trigger**: When ScormData is saved with lesson_status = 'completed' or 'passed'
- **Actions**:
  1. Updates corresponding Progress record to mark lesson as completed
  2. Generates xAPI completion statement
  3. Links statement to student, course, and lesson

#### sync_scorm_score Signal
- **Trigger**: When ScormData is saved with a score_raw value
- **Actions**:
  1. Generates xAPI statement with score information
  2. Uses appropriate verb (passed/failed/completed) based on lesson_status
  3. Includes scaled score calculation
  4. Links statement to student, course, and lesson

## Usage Examples

### Manual Synchronization

```python
from scorm.sync_manager import DataSyncManager
from scorm.models import ScormData

# Initialize the sync manager
sync_manager = DataSyncManager()

# Sync SCORM data to Progress
scorm_data = ScormData.objects.get(id=1)
progress = sync_manager.sync_scorm_to_progress(scorm_data)

# Sync xAPI statement to Progress
from xapi.models import XAPIStatement
statement = XAPIStatement.objects.get(statement_id='...')
progress = sync_manager.sync_xapi_to_progress(statement)

# Verify progress consistency
from core.models import User
from courses.models import Course

student = User.objects.get(id=1)
course = Course.objects.get(id=1)
result = sync_manager.verify_progress_consistency(student, course)
print(f"xAPI Progress: {result['xapi_progress']}%")
print(f"Model Progress: {result['model_progress']}%")
print(f"Consistent: {result['is_consistent']}")
```

### Reconciliation

```python
# Find and fix synchronization discrepancies
issues = sync_manager.reconcile_discrepancies()

for issue in issues:
    print(f"Issue Type: {issue['type']}")
    print(f"Fixed: {issue['fixed']}")
    print(f"Details: {issue}")
```

### Automatic Synchronization

Synchronization happens automatically when SCORM data is saved:

```python
from scorm.models import ScormData, ScormSCO
from core.models import User

# Get student and SCO
student = User.objects.get(username='john')
sco = ScormSCO.objects.get(id=1)

# Update SCORM data - signals will fire automatically
scorm_data, created = ScormData.objects.get_or_create(
    student=student,
    sco=sco
)
scorm_data.lesson_status = 'completed'
scorm_data.score_raw = 85
scorm_data.score_max = 100
scorm_data.save()  # Triggers sync_scorm_completion and sync_scorm_score signals

# Progress is now automatically updated
# xAPI statements are automatically generated
```

## Data Flow

### SCORM Completion Flow

```
SCORM Content Reports Completion
         ↓
ScormData.save() with lesson_status='completed'
         ↓
sync_scorm_completion signal fires
         ↓
DataSyncManager.sync_scorm_to_progress()
         ↓
Progress model updated (completed=True)
         ↓
XAPIStatementGenerator.generate_lesson_completed()
         ↓
xAPI statement stored in LRS
```

### xAPI to Progress Flow

```
xAPI Statement Received (verb='completed')
         ↓
Statement stored with lesson/user relations
         ↓
DataSyncManager.sync_xapi_to_progress()
         ↓
Progress model updated (completed=True)
```

## Error Handling

All synchronization methods include comprehensive error handling:

- **Logging**: All errors are logged with context (student_id, lesson_id, etc.)
- **Graceful Degradation**: Sync failures don't break the main operation
- **Retry Queue**: Failed operations can be retried via reconciliation
- **Audit Trail**: All sync operations are logged for troubleshooting

### Common Error Scenarios

1. **Missing Lesson Association**: SCORM package has no linked lesson
   - Logged as warning
   - Sync skipped gracefully

2. **Missing Progress Record**: Progress doesn't exist for student/lesson
   - Automatically created during sync
   - Logged as info

3. **Inconsistent Data**: xAPI and Progress show different completion status
   - Detected by reconciliation
   - Automatically fixed if possible
   - Logged as warning

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 2.3**: SCORM completion updates Progress records
- **Requirement 2.4**: SCORM scores are stored and tracked
- **Requirement 8.1**: SCORM data syncs to Progress model
- **Requirement 8.2**: xAPI statements sync to Progress model
- **Requirement 8.3**: xAPI statements sync to QuizAttempt model
- **Requirement 8.4**: Progress calculations are consistent across systems
- **Requirement 8.5**: Synchronization failures are logged and recoverable

## Performance Considerations

- **Signal Efficiency**: Signals only fire when relevant data changes
- **Selective Processing**: Only completion/score changes trigger sync
- **Batch Reconciliation**: Reconciliation can be run as a periodic job
- **Database Queries**: Optimized with select_related() and prefetch_related()

## Testing

The synchronization manager includes comprehensive test coverage:

- Unit tests for each sync method
- Integration tests for signal handlers
- Property-based tests for consistency verification
- Error handling and edge case tests

Run tests with:
```bash
python manage.py test scorm.test_sync_manager
```

## Monitoring

Key metrics to monitor:

- Sync success/failure rate
- Reconciliation issues found/fixed
- Progress consistency percentage
- Signal processing time

## Future Enhancements

Potential improvements for future versions:

1. **Async Processing**: Move sync operations to background tasks
2. **Conflict Resolution**: Advanced strategies for handling conflicts
3. **Audit Dashboard**: UI for viewing sync status and issues
4. **Webhooks**: Notify external systems of sync events
5. **Batch Operations**: Bulk sync for data migrations

## Related Documentation

- [SCORM Models Documentation](./MODELS_DOCUMENTATION.md)
- [xAPI Statement Generator](../xapi/STATEMENT_GENERATOR_USAGE.md)
- [xAPI Signals Documentation](../xapi/SIGNALS_DOCUMENTATION.md)
