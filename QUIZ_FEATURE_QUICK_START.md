# Quiz Feature - Quick Start Guide

## For Instructors

### Creating a Quiz

#### Option 1: From Dashboard
1. Go to `/instructor` (Instructor Dashboard)
2. Find your course card
3. Click "Add Quiz" button
4. Fill out quiz details and add questions
5. Click "Save Quiz"

#### Option 2: From Course Page
1. Go to `/instructor/courses/{courseId}`
2. Click "Quizzes" tab
3. Click "Create Quiz" button
4. Fill out quiz details and add questions
5. Click "Save Quiz"

#### Option 3: For a Specific Lesson
1. Go to `/instructor/courses/{courseId}`
2. Click "Lessons" tab
3. Find the lesson you want
4. Click "Add Quiz" button next to the lesson
5. Fill out quiz details and add questions
6. Click "Save Quiz"

### Quiz Settings

**Basic Settings**:
- **Title**: Name of the quiz
- **Description**: What the quiz covers
- **Passing Score**: Percentage needed to pass (0-100%)
- **Time Limit**: Optional time limit in minutes

**Quiz Options**:
- **Allow Retakes**: Let students retake the quiz
- **Maximum Retakes**: How many times students can attempt (default: 3)
- **Show Explanations**: Show answer explanations after submission
- **Randomize Questions**: Shuffle question order (not yet implemented)

### Question Types

1. **Multiple Choice**
   - Add 2+ options
   - Select one correct answer
   - Students can only pick one option

2. **True/False**
   - Automatically creates True/False options
   - Select the correct answer

3. **Fill in the Blank**
   - Students type their answer
   - Requires manual grading (future feature)

4. **Multiple Answer**
   - Add 2+ options
   - Select multiple correct answers
   - Students can pick multiple options

### Managing Quizzes

**View All Quizzes**:
- Go to `/instructor/courses/{courseId}`
- Click "Quizzes" tab
- See all quizzes for the course

**Edit Quiz**:
- Currently: Delete and recreate
- Future: Edit button will be added

**Delete Quiz**:
- Go to course page → Quizzes tab
- Click trash icon on quiz card
- Confirm deletion

**View Results**:
- Coming soon: `/instructor/quiz/{quizId}/results`

---

## For Students

### Finding Quizzes

1. Go to your course page: `/learn/{courseId}`
2. Click the "Quizzes" tab
3. See all available quizzes

### Taking a Quiz

1. Click "Start Quiz" button
2. Read the quiz information:
   - Number of questions
   - Passing score
   - Time limit (if any)
3. Answer questions one by one
4. Use navigation dots to jump between questions
5. Click "Submit Quiz" when done

### During the Quiz

**Navigation**:
- "Previous" button: Go to previous question
- "Next" button: Go to next question
- Question dots: Click to jump to any question
- Green dots: Answered questions
- Gray dots: Unanswered questions

**Timer** (if quiz has time limit):
- Shows remaining time at top right
- Turns red when < 1 minute left
- Auto-submits when time runs out

**Question Overview Panel**:
- Shows all questions numbered
- Click any number to jump to that question
- See which questions are answered

### After Submission

**Results Screen Shows**:
- Your score (points earned / total points)
- Percentage score
- Pass/Fail status
- Previous attempts (if any)

**Options**:
- "Back to Course": Return to course page
- "Retake Quiz": Try again (if retakes allowed and attempts remaining)

### Retaking Quizzes

- Check if retakes are allowed
- Check remaining attempts
- Click "Retake Quiz" button
- All answers will be cleared
- Timer resets (if applicable)

---

## API Endpoints Reference

### For Frontend Developers

**Quiz Management**:
```typescript
// List quizzes for a course
GET /api/quizzes/?course={courseId}

// Get quiz details with questions
GET /api/quizzes/{quizId}/

// Create quiz (instructor only)
POST /api/quizzes/
Body: {
  course: number,
  lesson?: number,
  title: string,
  description: string,
  passing_score: number,
  time_limit?: number,
  max_attempts: number,
  is_active: boolean
}

// Delete quiz
DELETE /api/quizzes/{quizId}/
```

**Question Management**:
```typescript
// Create question
POST /api/questions/
Body: {
  quiz: number,
  question_text: string,
  question_type: 'multiple_choice' | 'true_false' | 'short_answer',
  points: number,
  order: number,
  explanation?: string
}

// Create option
POST /api/questions/{questionId}/options/
Body: {
  question: number,
  option_text: string,
  is_correct: boolean,
  order: number
}
```

**Quiz Taking**:
```typescript
// Get user's attempts
GET /api/quizzes/my_attempts/

// Submit quiz
POST /api/quizzes/{quizId}/submit/
Body: {
  answers: [
    {
      question_id: number,
      selected_option_id?: number,  // For multiple choice/true-false
      text_answer?: string          // For short answer
    }
  ]
}
```

---

## Troubleshooting

### Quiz Not Showing for Students
- Check if quiz `is_active` is set to `true`
- Verify student is enrolled in the course
- Check if quiz is assigned to correct course

### Can't Submit Quiz
- Ensure all required questions are answered
- Check if time limit has expired
- Verify student hasn't exceeded max attempts

### Quiz Creation Fails
- Verify you're the course instructor
- Check all required fields are filled
- Ensure at least one question is added
- Verify questions have correct answers selected

### Questions Not Saving
- Check that options are filled out
- Verify correct answer is selected
- Ensure question text is not empty

---

## Best Practices

### For Instructors

**Quiz Design**:
- Keep quizzes focused on specific topics
- Mix question types for variety
- Set reasonable time limits (2-3 min per question)
- Allow 2-3 retakes for learning
- Set passing score at 70-80%

**Question Writing**:
- Write clear, unambiguous questions
- Avoid trick questions
- Use realistic distractors (wrong answers)
- Add explanations to help learning
- Order questions logically

**Quiz Placement**:
- Add quizzes after key lessons
- Create course-level final assessment
- Use quizzes to reinforce learning
- Don't over-quiz (1 quiz per 3-5 lessons)

### For Students

**Taking Quizzes**:
- Read all options before answering
- Use the question overview to track progress
- Don't rush - take your time
- Review answers before submitting
- Learn from mistakes on retakes

---

## Quick Links

**Instructor**:
- Dashboard: `/instructor`
- Course Management: `/instructor/courses/{courseId}`
- Create Quiz: `/instructor/quiz/create?courseId={id}`

**Student**:
- My Courses: `/learn`
- Course Page: `/learn/{courseId}`
- Take Quiz: `/learn/{courseId}/quiz/{quizId}`

---

## Support

For issues or questions:
1. Check this guide first
2. Review the API documentation
3. Check browser console for errors
4. Verify Django backend is running
5. Check network tab for failed requests

**Common Issues**:
- 401 Unauthorized: Login again
- 403 Forbidden: Check permissions (instructor vs student)
- 404 Not Found: Verify IDs are correct
- 400 Bad Request: Check request data format
