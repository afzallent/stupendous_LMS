# Design Document: Course Editor Redesign

## Overview

This design separates the course management experience into two distinct interfaces:

1. **Course Creator** - A streamlined 3-step wizard for creating new courses
2. **Course Editor** - A comprehensive tabbed interface for managing existing course content

The architecture follows a clean separation of concerns, with the Course Creator handling initial course setup and the Course Editor providing full curriculum management capabilities.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Instructor Dashboard                             │
│  ┌─────────────────┐              ┌─────────────────────────────┐   │
│  │  Create Course  │──────────────▶│     Course Creator         │   │
│  │     Button      │              │   /instructor/create-course │   │
│  └─────────────────┘              └──────────────┬──────────────┘   │
│                                                  │                   │
│  ┌─────────────────┐              ┌──────────────▼──────────────┐   │
│  │   Course Card   │──────────────▶│      Course Editor         │   │
│  │   Edit Button   │              │ /instructor/courses/{id}/edit│   │
│  └─────────────────┘              └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Frontend Route Structure

```
/instructor/
├── page.tsx                          # Dashboard
├── create-course/
│   └── page.tsx                      # Course Creator Wizard (NEW - simplified)
├── courses/
│   └── [id]/
│       ├── page.tsx                  # Redirect to edit
│       └── edit/
│           └── page.tsx              # Course Editor (NEW - full featured)
└── import-export/
    └── page.tsx                      # CSV Import/Export
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Course Creator                                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │   Step 1      │  │   Step 2      │  │   Step 3      │           │
│  │  Basic Info   │──▶│ Category &   │──▶│   Pricing    │──▶ Create │
│  │ Title, Desc   │  │ Level, Image  │  │ Price/Free   │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Course Editor                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Overview] [Curriculum] [Quizzes] [Settings] [Analytics]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Tab Content Area                          │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  Curriculum Tab:                                     │    │   │
│  │  │  ┌─────────────────────────────────────────────┐    │    │   │
│  │  │  │ Summary Bar: 5 Chapters | 24 Lessons | 4h   │    │    │   │
│  │  │  └─────────────────────────────────────────────┘    │    │   │
│  │  │  ┌─────────────────────────────────────────────┐    │    │   │
│  │  │  │ Chapter 1: Introduction           [▼] [⚙]  │    │    │   │
│  │  │  │  ├─ 📹 Lesson 1: Welcome (5:30)            │    │    │   │
│  │  │  │  ├─ 📝 Lesson 2: Overview (Markdown)       │    │    │   │
│  │  │  │  └─ 📋 Quiz: Chapter 1 Assessment          │    │    │   │
│  │  │  └─────────────────────────────────────────────┘    │    │   │
│  │  │  ┌─────────────────────────────────────────────┐    │    │   │
│  │  │  │ Chapter 2: Getting Started    🔒  [▼] [⚙]  │    │    │   │
│  │  │  │  ├─ 📹 Lesson 3: Setup (10:00)             │    │    │   │
│  │  │  │  └─ 🎮 Lesson 4: Interactive (H5P)         │    │    │   │
│  │  │  └─────────────────────────────────────────────┘    │    │   │
│  │  │  ┌─────────────────────────────────────────────┐    │    │   │
│  │  │  │ + Add Chapter                               │    │    │   │
│  │  │  └─────────────────────────────────────────────┘    │    │   │
│  │  │  ┌─────────────────────────────────────────────┐    │    │   │
│  │  │  │ Unassigned Lessons (3)                      │    │    │   │
│  │  │  │  ├─ 📹 Orphan Lesson 1  [Move to ▼]        │    │    │   │
│  │  │  │  └─ 📹 Orphan Lesson 2  [Move to ▼]        │    │    │   │
│  │  │  └─────────────────────────────────────────────┘    │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [Save Draft]  [Preview]  [Publish]    Saved at 2:30 PM ✓   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Course Creator Components

```typescript
// Course Creator Wizard
interface CourseCreatorProps {
  onComplete: (courseId: string) => void;
}

interface WizardStep {
  id: number;
  title: string;
  component: React.ComponentType<StepProps>;
  isValid: (data: CourseFormData) => boolean;
}

interface CourseFormData {
  title: string;
  description: string;
  category_id: number | null;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail: File | null;
  price: number;
  is_free: boolean;
}
```

### Course Editor Components

```typescript
// Main Editor
interface CourseEditorProps {
  courseId: string;
}

// Tab Components
interface EditorTab {
  id: string;
  label: string;
  icon: React.ComponentType;
  component: React.ComponentType<TabProps>;
}

// Curriculum Tab
interface CurriculumTabProps {
  courseId: string;
  chapters: Chapter[];
  lessons: Lesson[];
  onChapterCreate: (chapter: ChapterInput) => Promise<void>;
  onChapterUpdate: (id: number, data: Partial<Chapter>) => Promise<void>;
  onChapterDelete: (id: number) => Promise<void>;
  onChapterReorder: (chapters: Chapter[]) => Promise<void>;
  onLessonCreate: (lesson: LessonInput) => Promise<void>;
  onLessonUpdate: (id: number, data: Partial<Lesson>) => Promise<void>;
  onLessonDelete: (id: number) => Promise<void>;
  onLessonMove: (lessonId: number, chapterId: number | null, order: number) => Promise<void>;
}

// Chapter Component
interface ChapterCardProps {
  chapter: Chapter;
  lessons: Lesson[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onAddQuiz: () => void;
}

// Lesson Component
interface LessonItemProps {
  lesson: Lesson;
  onEdit: () => void;
  onDelete: () => void;
  isDragging: boolean;
}

// Lesson Editor Dialog
interface LessonEditorProps {
  lesson?: Lesson;
  chapterId: number | null;
  courseId: string;
  onSave: (lesson: LessonInput) => Promise<void>;
  onClose: () => void;
}

// Content Type Editors
interface VideoEditorProps {
  value: VideoContent;
  onChange: (content: VideoContent) => void;
  onFetchYouTube: (url: string) => Promise<YouTubeInfo>;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (content: string) => void;
}

interface H5PEditorProps {
  value: H5PContent;
  onChange: (content: H5PContent) => void;
  existingPackages: H5PPackage[];
}

interface HTMLEmbedEditorProps {
  value: HTMLEmbedContent;
  onChange: (content: HTMLEmbedContent) => void;
}
```

## Data Models

### TypeScript Interfaces (Frontend)

```typescript
interface Course {
  id: number;
  title: string;
  description: string;
  instructor_id: number;
  category_id: number | null;
  category?: Category;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail_url: string | null;
  status: 'draft' | 'published' | 'archived';
  price: number;
  is_free: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  // Computed
  chapter_count?: number;
  lesson_count?: number;
  total_duration?: string;
}

interface Chapter {
  id: number;
  course_id: number;
  title: string;
  description: string;
  order: number;
  is_locked: boolean;
  prerequisite_chapter_id: number | null;
  created_at: string;
  updated_at: string;
  // Computed
  lesson_count?: number;
  total_duration?: string;
  has_quiz?: boolean;
}

interface Lesson {
  id: number;
  course_id: number;
  chapter_id: number | null;
  title: string;
  content_type: 'video' | 'markdown' | 'h5p' | 'html_embed' | 'scorm';
  order: number;
  // Video fields
  video_url: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  is_embeddable: boolean;
  // Content field (for markdown, html)
  content: string;
  created_at: string;
  updated_at: string;
}

interface Quiz {
  id: number;
  course_id: number;
  chapter_id: number | null;
  lesson_id: number | null;
  title: string;
  description: string;
  passing_score: number;
  time_limit: number | null;
  max_attempts: number;
  is_active: boolean;
  question_count?: number;
}

// Content type specific
interface VideoContent {
  url: string;
  thumbnail_url: string | null;
  duration: string | null;
  is_embeddable: boolean;
}

interface H5PContent {
  package_id: number | null;
  package_file: File | null;
}

interface HTMLEmbedContent {
  html: string;
  css: string;
  js: string;
}
```

### API Endpoints

```typescript
// Course Creator
POST   /api/courses/                    // Create course
GET    /api/categories/                 // Get categories

// Course Editor
GET    /api/courses/{id}/               // Get course details
PUT    /api/courses/{id}/               // Update course
DELETE /api/courses/{id}/               // Delete course

// Chapters
GET    /api/chapters/?course_id={id}    // Get chapters for course
POST   /api/chapters/                   // Create chapter
PUT    /api/chapters/{id}/              // Update chapter
DELETE /api/chapters/{id}/              // Delete chapter
POST   /api/chapters/reorder/           // Reorder chapters

// Lessons
GET    /api/lessons/?course_id={id}     // Get lessons for course
POST   /api/lessons/                    // Create lesson
PUT    /api/lessons/{id}/               // Update lesson
DELETE /api/lessons/{id}/               // Delete lesson
POST   /api/lessons/{id}/move/          // Move lesson to chapter
POST   /api/lessons/fetch_youtube_info/ // Fetch YouTube metadata

// Quizzes
GET    /api/quizzes/?course_id={id}     // Get quizzes for course
POST   /api/quizzes/                    // Create quiz
PUT    /api/quizzes/{id}/               // Update quiz
DELETE /api/quizzes/{id}/               // Delete quiz
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Chapter Order Consistency
*For any* course with chapters, when chapters are reordered via drag-and-drop, the persisted order should match the visual order displayed to the user.
**Validates: Requirements 3.2**

### Property 2: Lesson Chapter Assignment
*For any* lesson moved to a chapter, the lesson's chapter_id should be updated to the target chapter's id, and the lesson should appear in that chapter's lesson list.
**Validates: Requirements 7.3**

### Property 3: Unassigned Lessons Visibility
*For any* course, the "Unassigned Lessons" section should be visible if and only if there exists at least one lesson with chapter_id = null.
**Validates: Requirements 7.1, 7.5**

### Property 4: Chapter Lesson Count Accuracy
*For any* chapter displayed in the curriculum, the lesson count shown should equal the actual number of lessons with that chapter's id.
**Validates: Requirements 3.5**

### Property 5: Locked Chapter Icon Display
*For any* chapter with is_locked = true, the chapter header should display a lock icon.
**Validates: Requirements 6.3**

### Property 6: Quiz Display in Chapter
*For any* chapter that has an associated quiz, the quiz should be displayed as a special item at the end of the chapter's lesson list.
**Validates: Requirements 5.3**

### Property 7: YouTube URL Detection
*For any* video lesson with a URL matching YouTube patterns (youtube.com/watch, youtu.be), the "Fetch Info" button should be displayed.
**Validates: Requirements 9.1**

### Property 8: Curriculum Summary Accuracy
*For any* course displayed in the editor, the summary bar should show accurate counts: chapter_count = number of chapters, lesson_count = total lessons across all chapters + unassigned.
**Validates: Requirements 8.3**

### Property 9: Validation Error Highlighting
*For any* form field with invalid data (empty required field, invalid format), the field should be highlighted with an error indicator.
**Validates: Requirements 11.4**

### Property 10: Settings Persistence Round-Trip
*For any* course settings saved, reloading the course should display the same settings values that were saved.
**Validates: Requirements 10.4**

### Property 11: Content Type Icon Display
*For any* lesson displayed in the curriculum, the icon shown should correspond to the lesson's content_type (video → 📹, markdown → 📝, h5p → 🎮, html_embed → 🌐).
**Validates: Requirements 4.7**

### Property 12: CSV Import Structure Preservation
*For any* CSV import with chapters and lessons, the resulting course structure should preserve the chapter-lesson relationships defined in the CSV.
**Validates: Requirements 2.4**

## Error Handling

### API Errors
- **401 Unauthorized**: Redirect to login page with return URL
- **403 Forbidden**: Display "You don't have permission to edit this course"
- **404 Not Found**: Display "Course not found" with link to dashboard
- **422 Validation Error**: Highlight invalid fields with error messages
- **500 Server Error**: Display generic error with retry option

### Client-Side Validation
- Required fields: title, description (Course Creator Step 1)
- Price validation: Must be >= 0, numeric
- YouTube URL validation: Must match youtube.com or youtu.be patterns
- File upload validation: Check file type and size limits

### Auto-Save Error Recovery
- On save failure: Show error toast, keep local changes, retry after 5 seconds
- On network disconnect: Queue changes, sync when reconnected
- On conflict: Show diff dialog, allow user to choose version

## Testing Strategy

### Unit Testing
- Test individual components in isolation
- Test form validation logic
- Test URL pattern matching for YouTube detection
- Test computed values (lesson counts, durations)

### Property-Based Testing
Using a property-based testing library (e.g., fast-check for TypeScript):

1. **Chapter Reorder Property**: Generate random chapter orders, apply reorder, verify persistence matches display
2. **Lesson Move Property**: Generate random lesson-chapter assignments, verify chapter_id updates correctly
3. **Summary Count Property**: Generate courses with random chapters/lessons, verify counts are accurate
4. **Validation Property**: Generate invalid form data, verify all invalid fields are highlighted

### Integration Testing
- Test Course Creator → Course Editor flow
- Test CSV import → curriculum display
- Test auto-save with simulated network issues
- Test drag-and-drop reordering with backend persistence

### E2E Testing
- Complete course creation flow
- Complete curriculum editing flow
- Quiz creation and assignment
- Chapter locking configuration

## UI/UX Considerations

### Course Creator
- Progress indicator showing current step
- "Back" and "Next" navigation
- Form validation on step transition
- Preview of entered data before creation

### Course Editor
- Sticky header with save status
- Collapsible chapters for large courses
- Keyboard shortcuts for common actions
- Undo/redo for recent changes
- Confirmation dialogs for destructive actions

### Responsive Design
- Mobile: Single column layout, touch-friendly drag handles
- Tablet: Two-column layout for lesson editing
- Desktop: Full sidebar + content area layout

### Accessibility
- ARIA labels for all interactive elements
- Keyboard navigation for drag-and-drop
- Screen reader announcements for save status
- High contrast mode support
