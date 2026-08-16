from django.conf import settings
from django.db import migrations, models


def normalise_is_in_bank(apps, schema_editor):
    """
    Bring existing rows into agreement before the constraint is applied.

    `is_in_bank` was a free-floating boolean that nothing kept in sync with the
    `quiz` relation, so deployed data may contain either mismatch. The relation
    is the source of truth: a question with no quiz is a bank question.

    Without this step, AddConstraint below fails on any database holding a
    stale row.
    """
    Question = apps.get_model('quizzes', 'Question')
    Question.objects.filter(quiz__isnull=True, is_in_bank=False).update(is_in_bank=True)
    Question.objects.filter(quiz__isnull=False, is_in_bank=True).update(is_in_bank=False)


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0008_lesson_duration_couponredemption'),
        ('quizzes', '0002_quizattempt_attempt_number'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(normalise_is_in_bank, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='question',
            constraint=models.CheckConstraint(
                condition=models.Q(
                    models.Q(('is_in_bank', True), ('quiz__isnull', True)),
                    models.Q(('is_in_bank', False), ('quiz__isnull', False)),
                    _connector='OR',
                ),
                name='question_bank_flag_matches_quiz',
            ),
        ),
    ]
