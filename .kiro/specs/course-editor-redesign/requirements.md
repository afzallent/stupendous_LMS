# Requirements Document

## Introduction

This document specifies the requirements for redesigning the course management experience by separating it into two distinct interfaces:

1. **Course Creator** (`/instructor/create-course`) - A streamlined wizard for creating new courses with basic info only
2. **Course Editor** (`/instructor/courses/{id}/edit`) - A full-featured editor for managing existing course content

The current implementation combines both into a confusing single page with duplicate sections ("Course Curriculum (Legacy)") and doesn't properly display imported chapter/lesson structures. The separate `/instructor/courses/{id}` page will be deprecated in favor of the unified Course Editor.

## Glossary

- **Course Creator**: Simplified wizard for creating new courses (basic info, category, pricing)
- **Course Editor**: Full-featured interface for editing existing courses (curriculum, content, quizzes, settings)
- **Course**: A complete learning unit containing chapters and lessons
- **Chapter**: A logical grouping of lessons within a course (e.g., "Introduction", "Advanced Topics")
- **Lesson**: An individual learning unit within a chapter, supporting multiple content types
- **Content Type**: The format of lesson content (Video, Markdown, H5P, HTML Embed, SCORM)
- **Quiz**: An assessment attached to a chapter or lesson to test student knowledge
- **Progressive Unlocking**: Feature that locks chapters until prerequisite chapters are completed
- **Curriculum**: The complete structure of chapters and lessons in a course

## Requirements

### Requirement 1: Separate Course Creator Wizard

**User Story:** As an instructor, I want a simple wizard to create new courses quickly, so that I can get started without being overwhelmed by options.

#### Acceptance Criteria

1. WHEN the instructor clicks "Create Course" THEN the Course_Creator SHALL display a 3-step wizard: Basic Info → Category & Level → Pricing
2. WHEN the instructor completes the wizard THEN the Course_Creator SHALL create the course and redirect to the Course Editor
3. WHEN the instructor is on Step 1 THEN the Course_Creator SHALL require only title and description
4. WHEN the instructor is on Step 2 THEN the Course_Creator SHALL allow selecting category, level, and thumbnail
5. WHEN the instructor is on Step 3 THEN the Course_Creator SHALL allow setting price or marking as free
6. WHEN the instructor clicks "Create & Edit Content" THEN the Course_Creator SHALL save the course and open the Course Editor

### Requirement 2: Dedicated Course Editor Page

**User Story:** As an instructor, I want a dedicated editor page for existing courses, so that I can manage all course content in one comprehensive interface.

#### Acceptance Criteria

1. WHEN the instructor opens `/instructor/courses/{id}/edit` THEN the Course_Editor SHALL load the course and display a tabbed interface
2. WHEN the Course_Editor loads THEN the Course_Editor SHALL display tabs: Overview, Curriculum, Quizzes, Settings, Analytics
3. WHEN the instructor views the Curriculum tab THEN the Course_Editor SHALL display chapters in correct order with nested lessons
4. WHEN the instructor imports a CSV THEN the Course_Editor SHALL display the imported structure accurately
5. WHEN the instructor accesses the old `/instructor/courses/{id}` URL THEN the System SHALL redirect to `/instructor/courses/{id}/edit`

### Requirement 3: Chapter Management

**User Story:** As an instructor, I want to create, edit, reorder, and delete chapters, so that I can organize my course content logically.

#### Acceptance Criteria

1. WHEN the instructor clicks "Add Chapter" THEN the Course_Editor SHALL create a new chapter with a title input field and optional description
2. WHEN the instructor drags a chapter THEN the Course_Editor SHALL allow reordering chapters via drag-and-drop and persist the new order
3. WHEN the instructor clicks the edit icon on a chapter THEN the Course_Editor SHALL open a dialog to edit chapter title, description, and settings
4. WHEN the instructor clicks delete on a chapter THEN the Course_Editor SHALL prompt for confirmation and move contained lessons to "Unassigned" or delete them
5. WHEN the instructor views a chapter THEN the Course_Editor SHALL display lesson count, total duration, and completion requirements

### Requirement 4: Lesson Management with Multiple Content Types

**User Story:** As an instructor, I want to add lessons with different content types (Video, Markdown, H5P, HTML), so that I can create diverse learning experiences.

#### Acceptance Criteria

1. WHEN the instructor adds a new lesson THEN the Course_Editor SHALL prompt to select content type: Video, Markdown, H5P Interactive, HTML Embed
2. WHEN the instructor selects Video content type THEN the Course_Editor SHALL display fields for YouTube URL, video file upload, title, description, and duration
3. WHEN the instructor selects Markdown content type THEN the Course_Editor SHALL display a rich markdown editor with preview capability
4. WHEN the instructor selects H5P content type THEN the Course_Editor SHALL allow uploading H5P packages or selecting from existing library
5. WHEN the instructor selects HTML Embed content type THEN the Course_Editor SHALL provide a code editor for custom HTML/CSS/JS content
6. WHEN the instructor drags a lesson THEN the Course_Editor SHALL allow reordering within a chapter or moving between chapters
7. WHEN the instructor views a lesson THEN the Course_Editor SHALL display content type icon, title, duration, and completion status indicator

### Requirement 5: Quiz Integration per Chapter

**User Story:** As an instructor, I want to attach quizzes to chapters, so that I can assess student understanding before they proceed.

#### Acceptance Criteria

1. WHEN the instructor views a chapter THEN the Course_Editor SHALL display an "Add Quiz" button at the end of the chapter
2. WHEN the instructor clicks "Add Quiz" THEN the Course_Editor SHALL open a quiz creation dialog with title, passing score, time limit, and max attempts
3. WHEN a chapter has a quiz THEN the Course_Editor SHALL display the quiz as a special item at the end of the chapter with quiz icon
4. WHEN the instructor clicks on an existing quiz THEN the Course_Editor SHALL navigate to the quiz editor to manage questions
5. WHEN the instructor enables "Require Quiz to Pass" THEN the Course_Editor SHALL mark the chapter as requiring quiz completion for progression

### Requirement 6: Progressive Chapter Unlocking

**User Story:** As an instructor, I want to lock chapters until students complete prerequisites, so that I can enforce a structured learning path.

#### Acceptance Criteria

1. WHEN the instructor edits chapter settings THEN the Course_Editor SHALL display a toggle for "Lock until previous chapter completed"
2. WHEN the instructor enables chapter locking THEN the Course_Editor SHALL allow selecting a prerequisite chapter from a dropdown
3. WHEN a chapter is locked THEN the Course_Editor SHALL display a lock icon on the chapter header
4. WHEN the instructor views locked chapter settings THEN the Course_Editor SHALL show which chapter is the prerequisite
5. WHEN the instructor disables locking THEN the Course_Editor SHALL remove the prerequisite requirement and unlock the chapter

### Requirement 7: Unassigned Lessons Management

**User Story:** As an instructor, I want to manage lessons that aren't assigned to any chapter, so that I can organize imported or orphaned content.

#### Acceptance Criteria

1. WHEN lessons exist without a chapter assignment THEN the Course_Editor SHALL display an "Unassigned Lessons" section at the bottom of the curriculum
2. WHEN the instructor views unassigned lessons THEN the Course_Editor SHALL display each lesson with a "Move to Chapter" dropdown
3. WHEN the instructor selects a chapter from the dropdown THEN the Course_Editor SHALL move the lesson to that chapter and update the display
4. WHEN the instructor drags an unassigned lesson THEN the Course_Editor SHALL allow dropping it into any chapter
5. WHEN all lessons are assigned THEN the Course_Editor SHALL hide the "Unassigned Lessons" section

### Requirement 8: Visual Curriculum Overview

**User Story:** As an instructor, I want a clear visual representation of my course structure, so that I can quickly understand and navigate the curriculum.

#### Acceptance Criteria

1. WHEN the instructor views the curriculum THEN the Course_Editor SHALL display chapters as expandable/collapsible cards with lesson lists
2. WHEN the instructor hovers over a lesson THEN the Course_Editor SHALL display a tooltip with lesson details (type, duration, description preview)
3. WHEN the instructor views the curriculum THEN the Course_Editor SHALL display total course duration, lesson count, and chapter count in a summary bar
4. WHEN the instructor collapses a chapter THEN the Course_Editor SHALL show a compact view with chapter title and lesson count only
5. WHEN the instructor expands a chapter THEN the Course_Editor SHALL show all lessons with their content type icons and titles

### Requirement 9: YouTube Integration Enhancement

**User Story:** As an instructor, I want to fetch video details from YouTube automatically, so that I can quickly populate lesson information.

#### Acceptance Criteria

1. WHEN the instructor pastes a YouTube URL THEN the Course_Editor SHALL display a "Fetch Info" button
2. WHEN the instructor clicks "Fetch Info" THEN the Course_Editor SHALL retrieve title, description, duration, thumbnail, and embeddability status
3. WHEN the video is not embeddable THEN the Course_Editor SHALL display a warning message to the instructor
4. WHEN the fetch succeeds THEN the Course_Editor SHALL auto-populate the lesson fields with retrieved data
5. WHEN the fetch fails THEN the Course_Editor SHALL display an error message and allow manual entry

### Requirement 10: Course Settings and Metadata

**User Story:** As an instructor, I want to configure course-level settings, so that I can control how students experience the course.

#### Acceptance Criteria

1. WHEN the instructor views Settings tab THEN the Course_Editor SHALL display options for: sequential progression, certificate on completion, discussion forums
2. WHEN the instructor enables sequential progression THEN the Course_Editor SHALL require students to complete lessons in order
3. WHEN the instructor configures certificate settings THEN the Course_Editor SHALL allow setting minimum completion percentage
4. WHEN the instructor saves settings THEN the Course_Editor SHALL persist all configuration to the backend
5. WHEN the instructor views the course THEN the Course_Editor SHALL display current settings status in the Settings tab

### Requirement 11: Real-time Save and Validation

**User Story:** As an instructor, I want my changes to be saved automatically with validation feedback, so that I don't lose work and know when there are issues.

#### Acceptance Criteria

1. WHEN the instructor makes changes THEN the Course_Editor SHALL auto-save after 3 seconds of inactivity
2. WHEN auto-save occurs THEN the Course_Editor SHALL display a subtle "Saving..." indicator
3. WHEN save completes THEN the Course_Editor SHALL display "All changes saved" with timestamp
4. WHEN validation errors exist THEN the Course_Editor SHALL highlight problematic fields with error messages
5. WHEN the instructor attempts to publish with errors THEN the Course_Editor SHALL display a summary of all validation issues


### Requirement 12: Instructor Dashboard Integration

**User Story:** As an instructor, I want clear navigation between my dashboard and course editing, so that I can efficiently manage my courses.

#### Acceptance Criteria

1. WHEN the instructor views the dashboard THEN the Dashboard SHALL display course cards with "Edit" button linking to Course Editor
2. WHEN the instructor clicks "Edit" on a course card THEN the Dashboard SHALL navigate to `/instructor/courses/{id}/edit`
3. WHEN the instructor clicks "Create Course" THEN the Dashboard SHALL navigate to the Course Creator wizard
4. WHEN the instructor is in the Course Editor THEN the Course_Editor SHALL display a "Back to Dashboard" link
5. WHEN the instructor completes the Course Creator THEN the System SHALL redirect to the Course Editor for the new course

### Requirement 13: URL Structure and Navigation

**User Story:** As an instructor, I want consistent and intuitive URLs, so that I can bookmark and share course editing links.

#### Acceptance Criteria

1. THE System SHALL use `/instructor/create-course` for the Course Creator wizard
2. THE System SHALL use `/instructor/courses/{id}/edit` for the Course Editor
3. WHEN accessing `/instructor/create-course?edit={id}` THEN the System SHALL redirect to `/instructor/courses/{id}/edit`
4. WHEN accessing `/instructor/courses/{id}` THEN the System SHALL redirect to `/instructor/courses/{id}/edit`
5. THE System SHALL deprecate the combined create/edit page in favor of separate interfaces
