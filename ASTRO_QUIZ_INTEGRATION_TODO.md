# Astro Quiz/Assessment Integration - Action Plan

## Current Status
✅ **UI Components**: Fully built and functional  
✅ **Assessment Creation**: Connected to Django API  
⚠️ **Quiz Taking**: Uses mock data, needs API connection  
⚠️ **API Endpoints**: Mismatch between Astro (`/assessments/`) and Django (`/quizzes/`)

---

## Priority 1: Connect Quiz Taking to Django API

### File to Update: `frontend-astro/src/components/QuizPage.tsx`

**Current State**: Lines 34-82 use mock data
```typescript
// Mock quiz data
const mockQuiz: Quiz = {
  id: quizId,
  courseId: courseId,
  title: 'HTML Fundamentals Quiz',
  // ... mock data
};
```

**What to Change**:

```typescript
const fetchQuiz = async (quizId: string, courseId: string) => {
  setLoading(true);
  setError(null);
  
  try {
    // Import Django API client
    const { djangoApi } = await import('../utils/django-api-client');
    
    // Fetch quiz from Django
    const quizData = await djangoApi.get(`/api/quizzes/${quizId}/`);
    
    // Transform Django data to component format
    const transformedQuiz: Quiz = {
      id: quizData.id.toString(),
      courseId: courseId,
      title: quizData.title,
      description: quizData.description,
      questions: quizData.questions.map((q: any, index: number) => ({
        id: q.id.toString(),
        question: q.question_text,
        options: q.options.map((opt: any) => opt.option_text),
        correctAnswer: q.options.findIndex((opt: any) => opt.is_correct),
        explanation: q.explanation || ''
      })),
      passingScore: quizData.passing_score
    };
    
    setQuiz(transformedQuiz);
    setLoading(false);
  } catch (err: any) {
    setError(err.message || 'Failed to load quiz');
    setLoading(false);
  }
};
```

---

## Priority 2: Submit Quiz Results to Django

### File to Update: `frontend-astro/src/components/QuizPage.tsx`

**Current State**: Line 88 only logs to console
```typescript
const handleQuizComplete = (score: number, passed: boolean) => {
  console.log(`Quiz completed with score: ${score}, passed: ${passed}`);
};
```

**What to Change**:

```typescript
const handleQuizComplete = async (score: number, passed: boolean, userAnswers: (number | null)[]) => {
  try {
    const { djangoApi } = await import('../utils/django-api-client');
    
    // Prepare answers in Django format
    const answers = quiz!.questions.map((question, index) => {
      const selectedOptionIndex = userAnswers[index];
      if (selectedOptionIndex === null) return null;
      
      // Get the option ID from the question data
      // Note: You'll need to store option IDs when fetching the quiz
      return {
        question_id: parseInt(question.id),
        selected_option_id: question.optionIds[selectedOptionIndex] // Add this field
      };
    }).filter(a => a !== null);
    
    // Submit to Django
    const result = await djangoApi.post(`/api/quizzes/${quiz!.id}/submit/`, {
      answers: answers
    });
    
    console.log('Quiz submitted successfully:', result);
    
    // Optionally redirect or show success message
  } catch (err: any) {
    console.error('Failed to submit quiz:', err);
    setError('Failed to submit quiz results');
  }
};
```

---

## Priority 3: Update QuizComponent to Pass Answers

### File to Update: `frontend-astro/src/components/QuizComponent.tsx`

**Current State**: Line 125 calls onComplete with only score and passed
```typescript
onComplete(score, passed);
```

**What to Change**:

```typescript
// Update the interface
interface QuizProps {
  // ... existing props
  onComplete: (score: number, passed: boolean, userAnswers: (number | null)[]) => void;
}

// Update the call
onComplete(score, passed, state.userAnswers);
```

---

## Priority 4: Fix API Endpoint Naming

### Option A: Update Astro to Use `/api/quizzes/`

**File**: `frontend-astro/src/config/api.config.ts`

```typescript
export const API_ENDPOINTS = {
  // Change from:
  assessments: '/assessments',
  
  // To:
  quizzes: '/quizzes',
  assessments: '/quizzes', // Keep as alias for backward compatibility
};
```

**Then update**: `frontend-astro/src/components/AssessmentCreator.tsx`
```typescript
// Line 39: Change from
const response = await fetch(getApiUrl(`${API_ENDPOINTS.assessments}?course_id=1`), {

// To:
const response = await fetch(getApiUrl(`/api/quizzes/?course=${courseId}`), {
```

### Option B: Create Django Alias

**File**: `backend/lms_project/urls.py`

```python
urlpatterns = [
    # ... existing patterns
    path("api/", include("quizzes.api_urls")),
    path("api/assessments/", include("quizzes.api_urls")),  # Add alias
]
```

---

## Priority 5: Add Missing Features

### 5.1 Store Option IDs When Fetching Quiz

**File**: `frontend-astro/src/components/QuizPage.tsx`

```typescript
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  optionIds: number[];  // ADD THIS
  correctAnswer: number;
  explanation?: string;
}

// In fetchQuiz transformation:
questions: quizData.questions.map((q: any) => ({
  id: q.id.toString(),
  question: q.question_text,
  options: q.options.map((opt: any) => opt.option_text),
  optionIds: q.options.map((opt: any) => opt.id),  // ADD THIS
  correctAnswer: q.options.findIndex((opt: any) => opt.is_correct),
  explanation: q.explanation || ''
}))
```

### 5.2 Enable Timer

**File**: `frontend-astro/src/components/QuizComponent.tsx`

Uncomment lines 47-60 and add time limit from quiz data:

```typescript
// Add to QuizProps
interface QuizProps {
  // ... existing props
  timeLimit?: number; // in minutes
}

// In component
useEffect(() => {
  if (timeLimit) {
    const timerDuration = timeLimit * 60; // Convert to seconds
    setTimeRemaining(timerDuration);
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleQuizComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }
}, [timeLimit]);
```

### 5.3 Add Retake Functionality

**File**: `frontend-astro/src/components/QuizPage.tsx`

```typescript
// Fetch user's previous attempts
const [attempts, setAttempts] = useState<any[]>([]);
const [canRetake, setCanRetake] = useState(true);

useEffect(() => {
  const fetchAttempts = async () => {
    try {
      const { djangoApi } = await import('../utils/django-api-client');
      const attemptsData = await djangoApi.get('/api/quizzes/my_attempts/');
      const quizAttempts = attemptsData.filter((a: any) => a.quiz === parseInt(quizId));
      
      setAttempts(quizAttempts);
      
      // Check if can retake
      if (quiz && quizAttempts.length >= quiz.max_attempts) {
        setCanRetake(false);
      }
    } catch (err) {
      console.error('Failed to fetch attempts:', err);
    }
  };
  
  if (quiz) {
    fetchAttempts();
  }
}, [quiz, quizId]);
```

---

## Priority 6: Update AssessmentCreator API Calls

### File: `frontend-astro/src/components/AssessmentCreator.tsx`

**Current Issues**:
- Uses `/api/assessments/` instead of `/api/quizzes/`
- Data format might not match Django exactly

**Updates Needed**:

```typescript
// Line 172: Update endpoint
const response = await fetch(getApiUrl('/api/quizzes/'), {
  method: 'POST',
  headers,
  body: JSON.stringify({
    course: courseId, // Change from course_id
    title: assessment.title,
    description: assessment.description,
    passing_score: assessment.passingScore,
    time_limit: assessment.timeLimit,
    max_attempts: 3, // Add this
    is_active: true  // Add this
  })
});

// Then create questions separately
const quizId = result.id;
for (const question of assessment.questions) {
  await fetch(getApiUrl('/api/questions/'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      quiz: quizId,
      question_text: question.text,
      question_type: question.type === 'mcq' ? 'multiple_choice' : 'true_false',
      points: question.points,
      order: assessment.questions.indexOf(question),
      explanation: question.explanation
    })
  });
  
  // Then create options for each question
  // ... (similar to Next.js implementation)
}
```

---

## Testing Checklist

### After Completing Integration:

**Instructor/Trainer**:
- [ ] Create new assessment from `/dashboard/trainer/assessments/new`
- [ ] Verify assessment appears in list
- [ ] Edit existing assessment
- [ ] Check assessment is visible to students

**Student**:
- [ ] View available assessments
- [ ] Start an assessment
- [ ] Answer questions
- [ ] Navigate between questions
- [ ] Submit assessment
- [ ] View results (score, pass/fail)
- [ ] Review answers in review mode
- [ ] Attempt retake (if allowed)

**API Integration**:
- [ ] Quiz data loads from Django
- [ ] Answers submit to Django
- [ ] Results save correctly
- [ ] Attempt limits work
- [ ] Timer functions (if enabled)

---

## Estimated Time

| Task | Time | Priority |
|------|------|----------|
| Connect QuizPage to API | 1-2 hours | HIGH |
| Submit results to Django | 1 hour | HIGH |
| Fix endpoint naming | 30 min | HIGH |
| Store option IDs | 30 min | MEDIUM |
| Enable timer | 30 min | MEDIUM |
| Add retake logic | 1 hour | MEDIUM |
| Update AssessmentCreator | 1-2 hours | MEDIUM |
| Testing | 2 hours | HIGH |
| **TOTAL** | **7-9 hours** | |

---

## Quick Start Commands

```bash
# Navigate to Astro frontend
cd frontend-astro

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# Test pages:
# Trainer: http://localhost:4321/dashboard/trainer/assessments
# Student: http://localhost:4321/dashboard/student/assessments
```

---

## Notes

1. **Django Backend**: Already fully functional, no changes needed
2. **Astro Components**: Well-built, just need API connection
3. **Data Transformation**: Main work is mapping Django response to component format
4. **Authentication**: Use existing `django-api-client.js` utilities
5. **Error Handling**: Already in place, just needs real API calls

---

## Success Criteria

✅ Students can take quizzes loaded from Django  
✅ Quiz results save to Django backend  
✅ Instructors can create quizzes that students can take  
✅ Timer works (if quiz has time limit)  
✅ Retakes work within attempt limits  
✅ Review mode shows correct/incorrect answers  
✅ No console errors  
✅ Smooth user experience  

---

## Conclusion

The Astro quiz system is **90% complete**. The UI is excellent, components are well-structured, and assessment creation already works. You just need to connect the quiz-taking flow to the Django API, which is straightforward since the backend is ready and the components are built.

**Recommendation**: Start with Priority 1 (connecting QuizPage to API) and Priority 2 (submitting results). That will give you a working end-to-end flow in about 2-3 hours of work.
