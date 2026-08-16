from django.db import migrations


def backfill_completion_from_progress(apps, schema_editor):
    """
    Bring LessonTimeTracking.completed into agreement with courses.Progress.

    Nothing ever wrote LessonTimeTracking.completed — `mark_complete()` was
    defined but never called — so every report reading it showed zero
    completions no matter how much work students had done. Completion is now
    mirrored from Progress by a signal; this backfills the history that
    accumulated before the signal existed.
    """
    Progress = apps.get_model('courses', 'Progress')
    LessonTimeTracking = apps.get_model('activity', 'LessonTimeTracking')

    completed = Progress.objects.filter(completed=True).values_list(
        'student_id', 'lesson_id', 'completed_at'
    )

    updated = 0
    created = 0
    for student_id, lesson_id, completed_at in completed.iterator():
        rows = LessonTimeTracking.objects.filter(
            student_id=student_id, lesson_id=lesson_id
        )
        if rows.exists():
            updated += rows.filter(completed=False).update(
                completed=True, completed_at=completed_at
            )
        else:
            LessonTimeTracking.objects.create(
                student_id=student_id,
                lesson_id=lesson_id,
                completed=True,
                completed_at=completed_at,
                time_spent=0,
            )
            created += 1

    if updated or created:
        print(
            f"\n  Backfilled lesson completion: {updated} updated, {created} created."
        )


class Migration(migrations.Migration):

    dependencies = [
        ('activity', '0003_alter_activitylog_user'),
        ('courses', '0009_fix_misparented_lessons'),
    ]

    operations = [
        migrations.RunPython(
            backfill_completion_from_progress, migrations.RunPython.noop
        ),
    ]
