"""
Manual verification script for xAPI signals

This script demonstrates that xAPI statements are automatically generated
when learning activities occur through Django signals.

Run this script with: python manage.py shell < xapi/verify_signals.py
"""
from django.contrib.auth import get_user_model
from courses.models import Course, Lesson, Enrollment, Progress
from quizzes.models import Quiz, QuizAttempt
from xapi.models import XAPIStatement
from django.utils import timezone

User = get_user_model()

print("\n" + "="*70)
print("xAPI Signals Verification Script")
print("="*70 + "\n")

# Clean up any existing test data
print("Cleaning up existing test data...")
User.objects.filter(username__in=['test_instructor', 'test_student']).delete()
Course.objects.filter(title='Signal Test Course').delete()

# Create test users
print("\n1. Creating test users...")
instructor = User.objects.create_user(
    username='test_instructor',
    email='instructor@test.com',
    password='testpass123',
    is_instructor=True
)
student = User.objects.create_user(
    username='test_student',
    email='student@test.com',
    password='testpass123',
    is_student=True
)
print(f"   ✓ Created instructor: {instructor.username}")
print(f"   ✓ Created student: {student.username}")

# Create course and lesson
print("\n2. Creating course and lesson...")
course = Course.objects.create(
    title='Signal Test Course',
    description='Testing automatic xAPI statement generation',
    instructor=instructor
)
lesson = Lesson.objects.create(
    course=course,
    title='Signal Test Lesson',
    order=1,
    content='Test content for signal verification'
)
print(f"   ✓ Created course: {course.title}")
print(f"   ✓ Created lesson: {lesson.title}")

# Create quiz
print("\n3. Creating quiz...")
quiz = Quiz.objects.create(
    course=course,
    title='Signal Test Quiz',
    passing_score=70
)
print(f"   ✓ Created quiz: {quiz.title}")

# Test 1: Enrollment Signal
print("\n4. Testing enrollment signal...")
initial_count = XAPIStatement.objects.count()
enrollment = Enrollment.objects.create(
    student=student,
    course=course
)
new_count = XAPIStatement.objects.count()
print(f"   ✓ Enrollment created")
print(f"   ✓ Statements before: {initial_count}, after: {new_count}")

enrollment_statement = XAPIStatement.objects.filter(
    user=student,
    course=course,
    verb_id="http://adlnet.gov/expapi/verbs/registered"
).first()

if enrollment_statement:
    print(f"   ✓ Generated statement: {enrollment_statement}")
    print(f"     - Actor: {enrollment_statement.actor_name}")
    print(f"     - Verb: {enrollment_statement.verb_display.get('en-US')}")
    print(f"     - Object: {enrollment_statement.object_id}")
else:
    print("   ✗ ERROR: No enrollment statement generated!")

# Test 2: Lesson Completion Signal
print("\n5. Testing lesson completion signal...")
initial_count = XAPIStatement.objects.count()
progress = Progress.objects.create(
    student=student,
    lesson=lesson,
    completed=True
)
new_count = XAPIStatement.objects.count()
print(f"   ✓ Progress created (completed)")
print(f"   ✓ Statements before: {initial_count}, after: {new_count}")

lesson_statement = XAPIStatement.objects.filter(
    user=student,
    lesson=lesson,
    verb_id="http://adlnet.gov/expapi/verbs/completed"
).first()

if lesson_statement:
    print(f"   ✓ Generated statement: {lesson_statement}")
    print(f"     - Actor: {lesson_statement.actor_name}")
    print(f"     - Verb: {lesson_statement.verb_display.get('en-US')}")
    print(f"     - Object: {lesson_statement.object_id}")
    print(f"     - Completion: {lesson_statement.result_completion}")
else:
    print("   ✗ ERROR: No lesson completion statement generated!")

# Test 3: Quiz Pass Signal
print("\n6. Testing quiz pass signal...")
initial_count = XAPIStatement.objects.count()
attempt = QuizAttempt.objects.create(
    quiz=quiz,
    student=student,
    score=85,
    max_score=100,
    percentage=85,
    passed=True,
    completed_at=timezone.now(),
    time_taken=300
)
new_count = XAPIStatement.objects.count()
print(f"   ✓ Quiz attempt created (passed)")
print(f"   ✓ Statements before: {initial_count}, after: {new_count}")

quiz_statement = XAPIStatement.objects.filter(
    user=student,
    quiz=quiz,
    verb_id="http://adlnet.gov/expapi/verbs/passed"
).first()

if quiz_statement:
    print(f"   ✓ Generated statement: {quiz_statement}")
    print(f"     - Actor: {quiz_statement.actor_name}")
    print(f"     - Verb: {quiz_statement.verb_display.get('en-US')}")
    print(f"     - Object: {quiz_statement.object_id}")
    print(f"     - Success: {quiz_statement.result_success}")
    print(f"     - Score: {quiz_statement.result_score_raw}/{quiz_statement.result_score_max}")
    print(f"     - Duration: {quiz_statement.result_duration}")
else:
    print("   ✗ ERROR: No quiz pass statement generated!")

# Summary
print("\n" + "="*70)
print("Summary")
print("="*70)
total_statements = XAPIStatement.objects.filter(user=student).count()
print(f"\nTotal xAPI statements generated for {student.username}: {total_statements}")
print("\nExpected statements:")
print("  1. Course registration (enrolled)")
print("  2. Lesson completion (completed)")
print("  3. Quiz pass (passed)")
print(f"\nActual statements: {total_statements}")

if total_statements == 3:
    print("\n✓ SUCCESS: All signals are working correctly!")
else:
    print(f"\n✗ ERROR: Expected 3 statements, got {total_statements}")

print("\nAll statements for this student:")
for stmt in XAPIStatement.objects.filter(user=student).order_by('timestamp'):
    verb = stmt.verb_display.get('en-US', 'unknown')
    print(f"  - {stmt.timestamp.strftime('%H:%M:%S')}: {stmt.actor_name} {verb} {stmt.object_id}")

print("\n" + "="*70 + "\n")
