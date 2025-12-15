"""
Management command to seed xAPI verbs and activity types
"""
from django.core.management.base import BaseCommand
from xapi.models import XAPIVerb, XAPIActivityType


class Command(BaseCommand):
    help = 'Seeds common xAPI verbs and activity types'

    def handle(self, *args, **options):
        self.stdout.write('Seeding xAPI verbs...')
        self.seed_verbs()
        
        self.stdout.write('Seeding xAPI activity types...')
        self.seed_activity_types()
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded xAPI data'))

    def seed_verbs(self):
        """Seed common xAPI verbs"""
        verbs = [
            {
                'iri': 'http://adlnet.gov/expapi/verbs/completed',
                'display': {'en-US': 'completed'},
                'description': 'Indicates the actor finished or concluded the activity normally.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/passed',
                'display': {'en-US': 'passed'},
                'description': 'Indicates the actor successfully passed an activity to a level of predetermined satisfaction.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/failed',
                'display': {'en-US': 'failed'},
                'description': 'Indicates the actor did not successfully pass an activity to a level of predetermined satisfaction.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/registered',
                'display': {'en-US': 'registered'},
                'description': 'Indicates the actor enrolled or registered for a learning activity.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/attempted',
                'display': {'en-US': 'attempted'},
                'description': 'Indicates the actor made an effort to access the activity.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/experienced',
                'display': {'en-US': 'experienced'},
                'description': 'Indicates the actor experienced the activity.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/answered',
                'display': {'en-US': 'answered'},
                'description': 'Indicates the actor replied to a question.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/interacted',
                'display': {'en-US': 'interacted'},
                'description': 'Indicates the actor engaged with the activity.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/launched',
                'display': {'en-US': 'launched'},
                'description': 'Indicates the actor started or opened an activity.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/initialized',
                'display': {'en-US': 'initialized'},
                'description': 'Indicates the activity was started.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/terminated',
                'display': {'en-US': 'terminated'},
                'description': 'Indicates the actor ended the activity.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/suspended',
                'display': {'en-US': 'suspended'},
                'description': 'Indicates the actor temporarily halted the activity with the intent to resume.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/verbs/resumed',
                'display': {'en-US': 'resumed'},
                'description': 'Indicates the actor continued or reopened a suspended activity.'
            },
            {
                'iri': 'https://w3id.org/xapi/video/verbs/played',
                'display': {'en-US': 'played'},
                'description': 'Indicates the actor started experiencing the recorded media object.'
            },
            {
                'iri': 'https://w3id.org/xapi/video/verbs/paused',
                'display': {'en-US': 'paused'},
                'description': 'Indicates the actor temporarily stopped experiencing the recorded media object.'
            },
            {
                'iri': 'https://w3id.org/xapi/video/verbs/seeked',
                'display': {'en-US': 'seeked'},
                'description': 'Indicates the actor changed the progress towards a specific point.'
            },
        ]
        
        for verb_data in verbs:
            verb, created = XAPIVerb.objects.get_or_create(
                iri=verb_data['iri'],
                defaults={
                    'display': verb_data['display'],
                    'description': verb_data['description']
                }
            )
            if created:
                self.stdout.write(f'  Created verb: {verb}')
            else:
                self.stdout.write(f'  Verb already exists: {verb}')

    def seed_activity_types(self):
        """Seed common xAPI activity types"""
        activity_types = [
            {
                'iri': 'http://adlnet.gov/expapi/activities/lesson',
                'display': {'en-US': 'lesson'},
                'description': 'A lesson is a learning activity that is typically part of a course.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/activities/course',
                'display': {'en-US': 'course'},
                'description': 'A course represents an entire course of study.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/activities/assessment',
                'display': {'en-US': 'assessment'},
                'description': 'An assessment is an activity that evaluates a learner.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/activities/question',
                'display': {'en-US': 'question'},
                'description': 'A question is an activity that requires a response.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/activities/module',
                'display': {'en-US': 'module'},
                'description': 'A module is a standard unit of instruction within a course.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/activities/interaction',
                'display': {'en-US': 'interaction'},
                'description': 'An interaction is an activity that requires learner input.'
            },
            {
                'iri': 'https://w3id.org/xapi/video/activity-type/video',
                'display': {'en-US': 'video'},
                'description': 'A recorded media object containing visual content.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/activities/simulation',
                'display': {'en-US': 'simulation'},
                'description': 'A simulation is an interactive learning experience.'
            },
            {
                'iri': 'http://adlnet.gov/expapi/activities/media',
                'display': {'en-US': 'media'},
                'description': 'Media content such as audio, video, or images.'
            },
        ]
        
        for activity_type_data in activity_types:
            activity_type, created = XAPIActivityType.objects.get_or_create(
                iri=activity_type_data['iri'],
                defaults={
                    'display': activity_type_data['display'],
                    'description': activity_type_data['description']
                }
            )
            if created:
                self.stdout.write(f'  Created activity type: {activity_type}')
            else:
                self.stdout.write(f'  Activity type already exists: {activity_type}')
