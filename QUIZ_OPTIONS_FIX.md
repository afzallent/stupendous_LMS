# Fix: No Options Shown for Quiz Questions

## Problem
When taking a quiz at `/learn/14/quiz/5`, no options are displayed for multiple choice questions.

## Root Cause
The issue could be one of several things:
1. Questions in the database have no options
2. Frontend is incorrectly mapping question types
3. Backend API isn't returning options properly

## Solution Applied

### 1. Fixed Question Type Mapping
The frontend was incorrectly handling question types. The backend supports:
- `'multiple_choice'` → Multiple Choice
- `'true_false'` → True/False  
- `'short_answer'` → Fill in the Blank

The frontend was trying to use `'MULTIPLE_ANSWER'` which doesn't exist in the backend.

**Fixed mapping:**
```typescript
if (q.question_type === 'multiple_choice') {
  questionType = 'MULTIPLE_CHOICE'
} else if (q.question_type === 'true_false') {
  questionType = 'TRUE_FALSE'
} else if (q.question_type === 'short_answer') {
  questionType = 'FILL_IN_THE_BLANK'
}
```

### 2. Added Debug Logging
Added console logging to see what data is being received from the backend.

## How to Diagnose

### Step 1: Check Quiz in Database

Run this script to inspect quiz 5:
```bash
cd backend
python check_quiz.py 5
```

This will show:
- All questions in the quiz
- Question types
- Options for each question
- Which options are marked as correct
- Any issues (missing options, no correct answer, etc.)

### Step 2: Check Browser Console

1. Open the quiz page: http://localhost:4000/learn/14/quiz/5
2. Open browser DevTools (F12)
3. Look at the Console tab
4. You should see logs like:
   ```
   📝 Quiz data from backend: {...}
   📝 Questions: [...]
   ```
5. Expand the questions array and check if options are present

### Step 3: Check Backend API Directly

Test the API endpoint:
```bash
# Get your access token (login first)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Then fetch the quiz
curl -X GET http://localhost:8000/api/quizzes/5/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Look for the `questions` array and check if each question has an `options` array.

## Common Issues & Fixes

### Issue 1: Questions Have No Options

If `check_quiz.py` shows "No options for this question", you need to add options.

**Via Django Admin:**
1. Go to http://localhost:8000/admin/quizzes/question/
2. Find the question
3. Click to edit
4. Scroll down to "Question options"
5. Add options and mark at least one as correct

**Via Django Shell:**
```python
from quizzes.models import Question, QuestionOption

question = Question.objects.get(id=QUESTION_ID)

# Add options
QuestionOption.objects.create(
    question=question,
    option_text="Option A",
    is_correct=True,
    order=1
)
QuestionOption.objects.create(
    question=question,
    option_text="Option B",
    is_correct=False,
    order=2
)
```

### Issue 2: No Correct Answer Marked

Every multiple choice or true/false question must have at least one option marked as correct.

**Fix in Django Admin:**
1. Edit the question
2. Check the "Is correct" checkbox for the correct option(s)
3. Save

### Issue 3: Options Not Being Serialized

Check the backend serializer includes options:

```python
# In backend/quizzes/serializers.py
class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'points', 
                  'order', 'explanation', 'options']
```

## Backend Question Types

The backend supports these question types:

1. **Multiple Choice** (`'multiple_choice'`)
   - Requires 2+ options
   - Exactly one option should be marked correct
   - Student selects one answer

2. **True/False** (`'true_false'`)
   - Requires exactly 2 options: "True" and "False"
   - One option marked correct
   - Student selects one answer

3. **Short Answer** (`'short_answer'`)
   - No options needed
   - Student types their answer
   - Manual grading may be required

## Note on Multiple Answer Questions

The backend currently does NOT support multiple answer questions (where students can select multiple correct options). If you need this feature, it would require:

1. Adding a new question type to the backend
2. Updating the Question model
3. Modifying the answer checking logic
4. Updating the frontend to handle it

For now, use multiple choice questions with only one correct answer.

## Files Modified

1. **frontend/src/app/learn/[courseId]/quiz/[quizId]/page.tsx**
   - Fixed question type mapping
   - Added debug logging

2. **backend/check_quiz.py** (new)
   - Utility script to inspect quiz questions and options
   - Helps diagnose missing options issues

## Next Steps

1. Run `python check_quiz.py 5` to see if questions have options
2. If no options, add them via Django admin
3. Refresh the quiz page
4. Check browser console for any errors
5. Options should now display correctly
