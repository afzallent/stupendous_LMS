# Generated migration for adding content_type field to Lesson model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0007_course_level'),
    ]

    operations = [
        migrations.AddField(
            model_name='lesson',
            name='content_type',
            field=models.CharField(
                choices=[
                    ('video', 'Video'),
                    ('markdown', 'Markdown Document'),
                    ('scorm', 'SCORM Package'),
                    ('h5p', 'H5P Interactive Content'),
                    ('html_embed', 'HTML Embed'),
                ],
                default='video',
                help_text='Type of content for this lesson',
                max_length=20,
            ),
        ),
    ]
