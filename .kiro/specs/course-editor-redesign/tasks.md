# Implementation Plan

- [x] 1. Set up new route structure and redirect logic





  - [x] 1.1 Create `/instructor/courses/[id]/edit/page.tsx` skeleton


    - Create the new Course Editor page file with basic layout
    - Set up tab navigation structure
    - _Requirements: 2.1, 2.2, 13.2_

  - [x] 1.2 Add redirect from `/instructor/courses/[id]` to `/instructor/courses/[id]/edit`

    - Create redirect page or middleware
    - _Requirements: 2.5, 13.4_

  - [x] 1.3 Add redirect from `/instructor/create-course?edit={id}` to `/instructor/courses/{id}/edit`

    - Update create-course page to detect edit param and redirect
    - _Requirements: 13.3_
  - [x] 1.4 Write property test for redirect logic






    - **Property 12: URL Redirect Consistency**
    - **Validates: Requirements 13.3, 13.4**

- [x] 2. Simplify Course Creator wizard






  - [x] 2.1 Refactor create-course page to 3-step wizard only

    - Remove curriculum editing from create-course page
    - Keep only: Basic Info → Category & Level → Pricing
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 2.2 Update wizard completion to redirect to Course Editor

    - On "Create & Edit Content" click, create course and redirect to editor
    - _Requirements: 1.2, 1.6_


  - [x] 2.3 Write unit tests for Course Creator wizard









    - Test step navigation and validation
    - _Requirements: 1.1, 1.3, 1.4, 1.5_


- [x] 3. Checkpoint - Ensure route structure works




  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Build Course Editor Overview Tab




  - [x] 4.1 Create Overview tab component


    - Display course title, description, status
    - Show quick stats: chapters, lessons, duration
    - Add publish/unpublish actions
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 Implement course data fetching

    - Fetch course details on editor load
    - Handle loading and error states
    - _Requirements: 2.1_

- [x] 5. Build Curriculum Tab - Chapter Management





  - [x] 5.1 Create CurriculumTab component structure


    - Summary bar with chapter/lesson counts
    - Expandable chapter cards
    - Unassigned lessons section
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

  - [x] 5.2 Implement chapter CRUD operations

    - Add Chapter button and dialog
    - Edit chapter title/description
    - Delete chapter with confirmation
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 5.3 Implement chapter drag-and-drop reordering

    - Use dnd-kit or similar library
    - Persist order to backend
    - _Requirements: 3.2_
  - [ ]* 5.4 Write property test for chapter order consistency
    - **Property 1: Chapter Order Consistency**
    - **Validates: Requirements 3.2**

  - [x] 5.5 Display chapter metadata

    - Show lesson count, duration, lock status
    - _Requirements: 3.5, 6.3_
  - [ ]* 5.6 Write property test for chapter lesson count accuracy
    - **Property 4: Chapter Lesson Count Accuracy**
    - **Validates: Requirements 3.5**


- [x] 6. Checkpoint - Ensure chapter management works




  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Build Curriculum Tab - Lesson Management





  - [x] 7.1 Create LessonItem component


    - Display content type icon, title, duration
    - Edit and delete actions
    - _Requirements: 4.7, 8.2_
  - [ ]* 7.2 Write property test for content type icon display
    - **Property 11: Content Type Icon Display**
    - **Validates: Requirements 4.7**

  - [x] 7.3 Implement lesson CRUD operations

    - Add Lesson button with content type selection
    - Edit lesson dialog
    - Delete lesson with confirmation
    - _Requirements: 4.1, 4.6_

  - [x] 7.4 Implement lesson drag-and-drop

    - Reorder within chapter
    - Move between chapters
    - _Requirements: 4.6_
  - [ ]* 7.5 Write property test for lesson chapter assignment
    - **Property 2: Lesson Chapter Assignment**
    - **Validates: Requirements 7.3**

- [x] 8. Build Unassigned Lessons Section





  - [x] 8.1 Create UnassignedLessons component


    - Display lessons with chapter_id = null
    - "Move to Chapter" dropdown for each lesson
    - _Requirements: 7.1, 7.2_

  - [x] 8.2 Implement move to chapter functionality

    - Update lesson chapter_id on selection
    - Refresh curriculum display
    - _Requirements: 7.3, 7.4_

  - [x] 8.3 Hide section when no unassigned lessons

    - Conditional rendering based on lesson count
    - _Requirements: 7.5_
  - [ ]* 8.4 Write property test for unassigned lessons visibility
    - **Property 3: Unassigned Lessons Visibility**
    - **Validates: Requirements 7.1, 7.5**

- [x] 9. Checkpoint - Ensure lesson management works





  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Content Type Editors





  - [x] 10.1 Create VideoEditor component


    - YouTube URL input with Fetch Info button
    - Duration, thumbnail display
    - Embeddability warning
    - _Requirements: 4.2, 9.1, 9.2, 9.3, 9.4, 9.5_
  - [ ]* 10.2 Write property test for YouTube URL detection
    - **Property 7: YouTube URL Detection**
    - **Validates: Requirements 9.1**

  - [x] 10.3 Create MarkdownEditor component

    - Rich markdown editor with preview
    - _Requirements: 4.3_

  - [x] 10.4 Create H5PEditor component

    - Upload H5P package or select from library
    - _Requirements: 4.4_

  - [x] 10.5 Create HTMLEmbedEditor component

    - Code editor for HTML/CSS/JS
    - Preview capability
    - _Requirements: 4.5_


- [x] 11. Build Quizzes Tab

  - [x] 11.1 Create QuizzesTab component


    - List quizzes by chapter
    - Add Quiz button per chapter
    - _Requirements: 5.1, 5.3_

  - [x] 11.2 Implement quiz creation dialog
    - Title, passing score, time limit, max attempts
    - _Requirements: 5.2_

  - [x] 11.3 Display quiz in chapter curriculum
    - Show quiz as special item at chapter end
    - Quiz icon and title
    - _Requirements: 5.3_
  - [ ]* 11.4 Write property test for quiz display in chapter
    - **Property 6: Quiz Display in Chapter**
    - **Validates: Requirements 5.3**

  - [x] 11.5 Link to quiz editor

    - Navigate to quiz question management
    - _Requirements: 5.4_


- [x] 12. Checkpoint - Ensure quiz integration works




  - Ensure all tests pass, ask the user if questions arise.


- [-] 13. Implement Progressive Chapter Unlocking


  - [x] 13.1 Add chapter locking settings UI


    - Toggle for "Lock until previous chapter completed"
    - Prerequisite chapter dropdown
    - _Requirements: 6.1, 6.2_
  - [x] 13.2 Display lock icon on locked chapters


    - Visual indicator in chapter header
    - _Requirements: 6.3_
  - [ ]* 13.3 Write property test for locked chapter icon display
    - **Property 5: Locked Chapter Icon Display**
    - **Validates: Requirements 6.3**
  - [x] 13.4 Show prerequisite information


    - Display which chapter is prerequisite
    - _Requirements: 6.4_
  - [x] 13.5 Implement unlock functionality


    - Remove prerequisite on toggle off
    - _Requirements: 6.5_

- [ ] 14. Build Settings Tab

  - [ ] 14.1 Create SettingsTab component
    - Sequential progression toggle
    - Certificate settings
    - Discussion forum toggle
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 14.2 Implement settings persistence
    - Save settings to backend
    - Load settings on tab open
    - _Requirements: 10.4, 10.5_
  - [ ]* 14.3 Write property test for settings persistence round-trip
    - **Property 10: Settings Persistence Round-Trip**
    - **Validates: Requirements 10.4**


- [ ] 15. Implement Auto-Save and Validation
  - [ ] 15.1 Add auto-save functionality
    - Debounced save after 3 seconds of inactivity
    - "Saving..." and "All changes saved" indicators
    - _Requirements: 11.1, 11.2, 11.3_
  - [ ] 15.2 Implement field validation
    - Highlight invalid fields with error messages
    - _Requirements: 11.4_
  - [ ]* 15.3 Write property test for validation error highlighting
    - **Property 9: Validation Error Highlighting**
    - **Validates: Requirements 11.4**
  - [ ] 15.4 Add publish validation
    - Show summary of issues before publish
    - _Requirements: 11.5_


- [ ] 16. Checkpoint - Ensure settings and validation work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Update Instructor Dashboard

  - [ ] 17.1 Update course card Edit button
    - Link to `/instructor/courses/{id}/edit`
    - _Requirements: 12.1, 12.2_
  - [ ] 17.2 Update Create Course button
    - Link to Course Creator wizard
    - _Requirements: 12.3_
  - [ ] 17.3 Add Back to Dashboard link in Course Editor
    - Navigation breadcrumb
    - _Requirements: 12.4_
  - [ ] 17.4 Handle Course Creator completion redirect
    - Redirect to Course Editor after creation
    - _Requirements: 12.5_

- [ ] 18. Build Analytics Tab (Optional)

  - [ ]* 18.1 Create AnalyticsTab component
    - Student enrollment count
    - Completion rates by chapter
    - Average quiz scores
    - _Requirements: 2.2_

- [ ] 19. Verify CSV Import Structure

  - [ ] 19.1 Test CSV import displays correctly in new editor
    - Import CSV with chapters and lessons
    - Verify structure in Curriculum tab
    - _Requirements: 2.4_
  - [ ]* 19.2 Write property test for CSV import structure preservation
    - **Property 12: CSV Import Structure Preservation**
    - **Validates: Requirements 2.4**

- [ ] 20. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
