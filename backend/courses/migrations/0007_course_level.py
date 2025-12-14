# Generated migration for adding level field to Course model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0006_chapter_lesson_chapter'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='level',
            field=models.CharField(
                choices=[('Beginner', 'Beginner'), ('Intermediate', 'Intermediate'), ('Advanced', 'Advanced')],
                default='Beginner',
                help_text='Course difficulty level',
                max_length=20
            ),
        ),
    ]
