from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_user_preferred_language'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sitesettings',
            name='default_from_email',
            field=models.EmailField(default='noreply@example.com', help_text="Default 'from' email address for system emails", max_length=254),
        ),
        migrations.AlterField(
            model_name='sitesettings',
            name='site_name',
            field=models.CharField(default='Stupendous LMS', help_text='Name of the site (used in emails, UI, documents and certificates)', max_length=100),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='logo',
            field=models.ImageField(blank=True, help_text='Brand logo shown in the frontend header, auth pages and certificates', null=True, upload_to='branding/'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='tagline',
            field=models.CharField(blank=True, help_text='Optional brand tagline shown alongside the site name', max_length=200),
        ),
    ]
