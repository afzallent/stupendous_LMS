#!/usr/bin/env python
"""
Manual test script to verify activity signals are working correctly.
Run with: python manage.py shell < test_activity_signals.py
"""

from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Enrollment, Progress
from quizzes.models import Quiz, QuizAttempt
from discussions.models import DiscussionThread, DiscussionReply
from activity.models import ActivityLog
from django.utils import timezone

User = get_user_model()

print("\n" + "="*60)
print("ACTIVITY SIGNALS VERIFICATION TEST")
print("="*60 + "\n")

# Clean up any existing test data
print("Cleaning up test data...")
User.objects.filter(username__in=['test_student_sig', 'test_instructor_sig']).delete()

# Create test users
print("Creating test users...")
student = User.objects.create_user(
    username='test_student_sig',
    password='testpass123',
    email='student@test.com',
    is_student=True
)
instructor = User.objects.create_user(
    username='test_instructor_sig',
    password='testpass123',
    email='instructor@test.com',
    is_instructor=True
)
print(f"✓ Created student: {student.username}")
print(f"✓ Created instructor: {instructor.username}")

# Create course
print("\nCreating course...")
course = Course.objects.create(
    title='Signal Test Course',
    description='Testing activity signals',
    instructor=instructor
)
print(f"✓ Created course: {course.title}")

# Create lesson
print("\nCreating lesson...")
lesson = Lesson.objects.create(
    course=course,
    title='Signal Test Lesson',
    video_url='https://example.com/video',
    order=1
)
print(f"✓ Created lesson: {lesson.title}")

# Get initial activity count
initial_count = ActivityLog.objects.filter(user=student).count()
print(f"\nInitial activity count for student: {initial_count}")

# Test 1: Enrollment Signal
print("\n" + "-"*60)
print("TEST 1: Enrollment Signal")
print("-"*60)
enrollment = Enrollment.objects.create(
    student=student,
    course=course
)
enroll_logs = ActivityLog.objects.filter(
    user=student,
    action_type='course_enroll'
)
print(f"✓ Created enrollment")
print(f"✓ Activity logs created: {enroll_logs.count()}")
if enroll_logs.exists():
    log = enroll_logs.first()
    print(f"  - Description: {log.description}")
    print(f"  - Content object: {log.content_object}")
    print("  ✅ PASS: Enrollment signal working")
else:
    print("  ❌ FAIL: No activity log created")

# Test 2: Lesson Completion Signal
print("\n" + "-"*60)
print("TEST 2: Lesson Completion Signal")
print("-"*60)
progress = Progress.objects.create(
    student=student,
    lesson=lesson,
    completed=True,
    completed_at=timezone.now()
)
completion_logs = ActivityLog.objects.filter(
    user=student,
    action_type='lesson_complete'
)
print(f"✓ Created lesson progress (completed)")
print(f"✓ Activity logs created: {completion_logs.count()}")
if completion_logs.exists():
    log = completion_logs.first()
    print(f"  - Description: {log.description}")
    print(f"  - Content object: {log.content_object}")
    print("  ✅ PASS: Lesson completion signal working")
else:
    print("  ❌ FAIL: No activity log created")

# Test 3: Quiz Submission Signal
print("\n" + "-"*60)
print("TEST 3: Quiz Submission Signal")
print("-"*60)
quiz = Quiz.objects.create(
    course=course,
    title='Signal Test Quiz',
    passing_score=70
)
attempt = QuizAttempt.objects.create(
    quiz=quiz,
    student=student,
    score=85,
    percentage=85,
    passed=True,
    attempt_number=1,
    completed_at=timezone.now(),
    time_taken=300
)
quiz_logs = ActivityLog.objects.filter(
    user=student,
    action_type='quiz_submit'
)
print(f"✓ Created quiz attempt (completed)")
print(f"✓ Activity logs created: {quiz_logs.count()}")
if quiz_logs.exists():
    log = quiz_logs.first()
    print(f"  - Description: {log.description}")
    print(f"  - Content object: {log.content_object}")
    print(f"  - Metadata: {log.metadata}")
    print("  ✅ PASS: Quiz submission signal working")
else:
    print("  ❌ FAIL: No activity log created")

# Test 4: Discussion Thread Signal
print("\n" + "-"*60)
print("TEST 4: Discussion Thread Signal")
print("-"*60)
thread = DiscussionThread.objects.create(
    course=course,
    author=student,
    title='Signal Test Thread',
    content='Testing discussion signals'
)
thread_logs = ActivityLog.objects.filter(
    user=student,
    action_type='discussion_post'
)
print(f"✓ Created discussion thread")
print(f"✓ Activity logs created: {thread_logs.count()}")
if thread_logs.exists():
    log = thread_logs.first()
    print(f"  - Description: {log.description}")
    print(f"  - Content object: {log.content_object}")
    print(f"  - Metadata: {log.metadata}")
    print("  ✅ PASS: Discussion thread signal working")
else:
    print("  ❌ FAIL: No activity log created")

# Test 5: Discussion Reply Signal
print("\n" + "-"*60)
print("TEST 5: Discussion Reply Signal")
print("-"*60)
reply = DiscussionReply.objects.create(
    thread=thread,
    author=instructor,
    content='Reply to test thread'
)
reply_logs = ActivityLog.objects.filter(
    user=instructor,
    action_type='discussion_reply'
)
print(f"✓ Created discussion reply")
print(f"✓ Activity logs created: {reply_logs.count()}")
if reply_logs.exists():
    log = reply_logs.first()
    print(f"  - Description: {log.description}")
    print(f"  - Content object: {log.content_object}")
    print(f"  - Metadata: {log.metadata}")
    print("  ✅ PASS: Discussion reply signal working")
else:
    print("  ❌ FAIL: No activity log created")

# Summary
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
final_count = ActivityLog.objects.filter(user=student).count()
instructor_count = ActivityLog.objects.filter(user=instructor).count()
print(f"Student activity logs: {final_count} (started with {initial_count})")
print(f"Instructor activity logs: {instructor_count}")
print(f"Total new logs created: {final_count - initial_count + instructor_count}")

# List all activities
print("\nAll student activities:")
for log in ActivityLog.objects.filter(user=student).order_by('timestamp'):
    print(f"  - {log.timestamp.strftime('%H:%M:%S')} | {log.get_action_type_display()} | {log.description[:50]}")

print("\nAll instructor activities:")
for log in ActivityLog.objects.filter(user=instructor).order_by('timestamp'):
    print(f"  - {log.timestamp.strftime('%H:%M:%S')} | {log.get_action_type_display()} | {log.description[:50]}")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60 + "\n")
