from django.db import migrations, models


def reparent_mismatched_lessons(apps, schema_editor):
    """
    Detach lessons whose chapter belongs to a different course.

    Lesson.save() now rejects this state, but existing rows may already hold
    it — nothing previously enforced that chapter.course == lesson.course.
    Such a lesson is ambiguous: it is displayed under one course while its
    chapter lives in another, and the enrollment-scoped querysets filter by
    `course`, so it can surface in a course the student has not paid for.

    Clearing the chapter is the conservative repair: the lesson stays in its
    own course as an unchaptered lesson, and no content moves between courses.
    The alternative — reassigning `course` to match the chapter — would move
    paid material across course boundaries, which is worse.
    """
    Lesson = apps.get_model('courses', 'Lesson')
    mismatched = Lesson.objects.filter(chapter__isnull=False).exclude(
        chapter__course_id=models.F('course_id')
    )
    count = mismatched.count()
    if count:
        print(f"\n  Detaching {count} lesson(s) from chapters in a different course.")
    mismatched.update(chapter=None)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0008_lesson_duration_couponredemption'),
    ]

    operations = [
        migrations.RunPython(reparent_mismatched_lessons, migrations.RunPython.noop),
    ]
