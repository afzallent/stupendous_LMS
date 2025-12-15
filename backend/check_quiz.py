#!/usr/bin/env python
"""
Script to check quiz questions and options.
Usage: python check_quiz.py <quiz_id>
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lms_project.settings')
django.setup()

from quizzes.models import Quiz, Question, QuestionOption


def check_quiz(quiz_id):
    """Check quiz questions and their options."""
    try:
        quiz = Quiz.objects.get(id=quiz_id)
        print(f"\n📝 Quiz: {quiz.title}")
        print(f"   Course: {quiz.course.title if quiz.course else 'N/A'}")
        print(f"   Passing Score: {quiz.passing_score}%")
        print(f"   Max Attempts: {quiz.max_attempts}")
        print(f"   Status: {quiz.status}")
        
        questions = quiz.questions.all().order_by('order')
        print(f"\n❓ Total Questions: {questions.count()}")
        
        if questions.count() == 0:
            print("   ⚠️  No questions in this quiz")
            return
        
        print("\n" + "=" * 80)
        
        for i, question in enumerate(questions, 1):
            print(f"\nQuestion {i} (ID: {question.id}):")
            print(f"   Type: {question.question_type}")
            print(f"   Points: {question.points}")
            print(f"   Order: {question.order}")
            print(f"   Text: {question.question_text[:100]}...")
            
            options = question.options.all().order_by('order')
            print(f"   Options: {options.count()}")
            
            if options.count() == 0:
                print("   ⚠️  WARNING: No options for this question!")
                if question.question_type in ['multiple_choice', 'true_false']:
                    print("   ❌ ERROR: Multiple choice and true/false questions must have options!")
            else:
                for j, option in enumerate(options, 1):
                    correct_mark = "✓" if option.is_correct else "✗"
                    print(f"      {j}. [{correct_mark}] {option.option_text}")
            
            if question.explanation:
                print(f"   Explanation: {question.explanation[:100]}...")
        
        print("\n" + "=" * 80)
        
        # Check for issues
        issues = []
        for question in questions:
            if question.question_type in ['multiple_choice', 'true_false']:
                if question.options.count() == 0:
                    issues.append(f"Question {question.id} has no options")
                elif not question.options.filter(is_correct=True).exists():
                    issues.append(f"Question {question.id} has no correct answer marked")
        
        if issues:
            print("\n⚠️  ISSUES FOUND:")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("\n✅ No issues found!")
        
    except Quiz.DoesNotExist:
        print(f"❌ Quiz with ID {quiz_id} not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python check_quiz.py <quiz_id>")
        print("\nExample:")
        print("  python check_quiz.py 5")
        sys.exit(1)
    
    quiz_id = sys.argv[1]
    check_quiz(quiz_id)
