# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - [x] 1.1 Create Django apps for SCORM and xAPI
    - Create `scorm` app with models, views, serializers directories
    - Create `xapi` app with models, views, serializers directories
    - Register apps in Django settings
    - _Requirements: 1.1, 3.1_
  - [x] 1.2 Install required Python packages
    - Add lxml, jsonschema, python-dateutil, markdown, Pygments to requirements.txt
    - Add hypothesis for property-based testing
    - _Requirements: All_
  - [x] 1.3 Add content_type field to Lesson model
    - Add content_type choice field (video, markdown, scorm, h5p, html_embed)
    - Create migration
    - _Requirements: 11.1, 12.1, 13.1_

- [x] 2. Implement xAPI data models and LRS core
  - [x] 2.1 Create XAPIStatement model
    - Implement statement storage with all xAPI fields
    - Add indexes for query performance
    - _Requirements: 3.2, 3.3_
  - [x] 2.2 Create XAPIVerb and XAPIActivityType models
    - Seed common verbs (completed, passed, failed, registered, etc.)
    - Seed activity types (lesson, course, quiz, video)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 2.3 Write property test for xAPI statement validation






    - **Property 10: xAPI statement validation**
    - **Validates: Requirements 3.2**

  - [x] 2.4 Write property test for statement storage uniqueness





    - **Property 11: xAPI statement storage uniqueness**
    - **Validates: Requirements 3.3**

- [x] 3. Implement xAPI statement validation and storage





  - [x] 3.1 Create XAPIStatementValidator class


    - Validate required fields (actor, verb, object)
    - Validate IRI formats
    - Validate timestamp formats
    - _Requirements: 3.2_
  - [x] 3.2 Create XAPIStatementStore class


    - Implement store_statement method
    - Implement store_statements for batch operations
    - Generate UUIDs and timestamps
    - _Requirements: 3.3, 6.3_
  - [ ]* 3.3 Write property test for query filtering
    - **Property 13: xAPI query filtering correctness**
    - **Validates: Requirements 3.5, 6.2**

- [ ] 4. Implement xAPI REST API endpoints

  - [ ] 4.1 Create xAPI statements endpoint
    - POST /xapi/statements/ for single/batch submission
    - GET /xapi/statements/ with query parameters
    - PUT /xapi/statements/?statementId={uuid}
    - _Requirements: 3.1, 3.5, 6.2, 6.3_
  - [ ] 4.2 Implement xAPI authentication
    - HTTP Basic Auth support
    - Token-based authentication
    - _Requirements: 3.4_
  - [ ]* 4.3 Write property test for authentication enforcement
    - **Property 12: xAPI authentication enforcement**
    - **Validates: Requirements 3.4**
  - [ ]* 4.4 Write property test for HTTP status codes
    - **Property 22: HTTP status code correctness**
    - **Validates: Requirements 6.4**


- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement xAPI statement generator

  - [ ] 6.1 Create XAPIStatementGenerator class
    - Implement generate_lesson_completed method
    - Implement generate_quiz_passed method
    - Implement generate_quiz_failed method
    - Implement generate_course_registered method
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 6.2 Create Django signals for automatic statement generation
    - Signal on Progress.save() for lesson completion
    - Signal on QuizAttempt.save() for quiz results
    - Signal on Enrollment.save() for registration
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 6.3 Write property test for lesson completion statement
    - **Property 14: Lesson completion statement generation**
    - **Validates: Requirements 4.1**
  - [ ]* 6.4 Write property test for quiz pass/fail statements
    - **Property 15: Quiz pass statement generation**
    - **Property 16: Quiz fail statement generation**
    - **Validates: Requirements 4.2, 4.3**
  - [ ]* 6.5 Write property test for enrollment statement
    - **Property 17: Enrollment statement generation**
    - **Validates: Requirements 4.4**

- [ ] 7. Implement SCORM data models

  - [ ] 7.1 Create SCORM models (ScormPackage, ScormSCO, ScormData)
    - Create ScormPackage model with package metadata, version, content path
    - Create ScormSCO model with SCO metadata and launch URL
    - Create ScormData model for CMI data storage (support SCORM 1.2 and 2004)
    - Create migration
    - _Requirements: 1.1, 1.2, 1.3, 2.2, 9.1_

- [ ] 8. Implement SCORM package manager

  - [ ] 8.1 Create ScormPackageManager class
    - Implement validate_package method
    - Implement extract_manifest method
    - Implement extract_content method
    - _Requirements: 1.1, 1.2, 1.4_
  - [ ] 8.2 Create SCORM upload API endpoint
    - POST /api/scorm/upload/
    - Validate, extract, and store package
    - _Requirements: 1.1, 1.3_
  - [ ]* 8.3 Write property test for package validation
    - **Property 1: SCORM package validation consistency**
    - **Validates: Requirements 1.1, 1.4**
  - [ ]* 8.4 Write property test for manifest parsing
    - **Property 2: Manifest parsing completeness**
    - **Validates: Requirements 1.2**
  - [ ]* 8.5 Write property test for lesson creation
    - **Property 3: SCORM upload creates lesson**
    - **Validates: Requirements 1.3**

- [ ] 9. Implement SCORM runtime API

  - [ ] 9.1 Create ScormAPIAdapter class
    - Implement LMSInitialize
    - Implement LMSGetValue/LMSSetValue
    - Implement LMSCommit/LMSFinish
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ] 9.2 Create SCORM runtime API endpoints
    - POST /api/scorm/runtime/initialize/
    - POST /api/scorm/runtime/get-value/
    - POST /api/scorm/runtime/set-value/
    - POST /api/scorm/runtime/commit/
    - POST /api/scorm/runtime/terminate/
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ]* 9.3 Write property test for CMI data round-trip
    - **Property 6: CMI data round-trip**
    - **Validates: Requirements 2.2**
  - [ ]* 9.4 Write property test for SCORM state restoration
    - **Property 28: SCORM state restoration**
    - **Validates: Requirements 9.1, 9.2**

- [ ] 10. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement SCORM-xAPI synchronization
  - [ ] 11.1 Create DataSyncManager class
    - Implement sync_scorm_to_progress method
    - Implement sync_xapi_to_progress method
    - _Requirements: 8.1, 8.2_
  - [ ] 11.2 Add signals for SCORM completion sync
    - Update Progress when SCORM reports completion
    - Generate xAPI statement on SCORM completion
    - _Requirements: 2.3, 8.1_
  - [ ]* 11.3 Write property test for SCORM completion sync
    - **Property 7: SCORM completion synchronization**
    - **Validates: Requirements 2.3, 8.1**
  - [ ]* 11.4 Write property test for progress calculation consistency
    - **Property 26: Progress calculation consistency**
    - **Validates: Requirements 8.4**

- [ ] 12. Implement content type models
  - [ ] 12.1 Create MarkdownLesson model
    - Store raw Markdown and cached HTML
    - Support syntax highlighting configuration
    - Create migration
    - _Requirements: 11.1, 11.3_
  - [ ] 12.2 Create H5PPackage and H5PContentState models
    - Store package metadata and extracted content path
    - Store student state and scores
    - Create migration
    - _Requirements: 12.1, 12.4_
  - [ ] 12.3 Create HTMLEmbed model
    - Store embed configuration and sandbox settings
    - Store xAPI messaging configuration
    - Create migration
    - _Requirements: 13.1, 13.5_
  - [ ] 12.4 Create ContentInteraction model
    - Track interactions with non-video content
    - Store interaction type and data
    - Link to xAPI statements
    - Create migration
    - _Requirements: 15.1, 15.4_

- [ ] 13. Implement Markdown content manager
  - [ ] 13.1 Create MarkdownContentManager class
    - Implement render_markdown with Pygments highlighting
    - Implement extract_toc for navigation
    - _Requirements: 11.2, 11.3, 11.4_
  - [ ] 13.2 Create Markdown API endpoints
    - POST /api/lessons/{id}/markdown/
    - GET /api/lessons/{id}/markdown/
    - POST /api/lessons/{id}/markdown/complete/
    - _Requirements: 11.1, 11.2, 11.5_

- [ ] 14. Implement H5P content manager
  - [ ] 14.1 Create H5PContentManager class
    - Implement validate_package method
    - Implement extract_package method
    - Implement xAPI statement processing
    - _Requirements: 12.1, 12.2_
  - [ ] 14.2 Create H5P API endpoints
    - POST /api/h5p/upload/
    - GET /api/h5p/{id}/embed/
    - POST /api/h5p/{id}/xapi/
    - POST /api/h5p/{id}/state/
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

- [ ] 15. Implement HTML embed manager
  - [ ] 15.1 Create HTMLEmbedManager class
    - Implement generate_iframe_html with sandbox
    - Implement postMessage xAPI validation
    - _Requirements: 13.2, 13.3, 13.4_
  - [ ] 15.2 Create HTML embed API endpoints
    - POST /api/lessons/{id}/html-embed/
    - GET /api/lessons/{id}/html-embed/
    - POST /api/lessons/{id}/html-embed/xapi/
    - _Requirements: 13.1, 13.4_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement video interaction tracking
  - [ ] 17.1 Create video xAPI statement generator
    - Generate statements for play, pause, seek, complete
    - Include video position in result
    - _Requirements: 4.5_
  - [ ] 17.2 Create video tracking API endpoint
    - POST /api/lessons/{id}/video/interaction/
    - Accept interaction type and position
    - _Requirements: 4.5_
  - [ ]* 17.3 Write property test for video interaction statements
    - **Property 18: Video interaction statement generation**
    - **Validates: Requirements 4.5**

- [ ] 18. Implement analytics engine
  - [ ] 18.1 Create XAPIAnalytics class
    - Implement get_course_completion_rate
    - Implement get_average_quiz_scores
    - Implement get_student_activity_stream
    - Implement get_time_spent_per_lesson
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 18.2 Create analytics API endpoints
    - GET /api/analytics/course/{id}/completion-rate/
    - GET /api/analytics/course/{id}/quiz-scores/
    - GET /api/analytics/student/{id}/activity-stream/
    - GET /api/analytics/course/{id}/time-spent/
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 18.3 Implement xAPI data export
    - GET /api/analytics/export/
    - Export as JSON with filtering
    - _Requirements: 5.5_
  - [ ]* 18.4 Write property test for activity aggregation
    - **Property 19: Activity aggregation correctness**
    - **Validates: Requirements 5.4**
  - [ ]* 18.5 Write property test for export completeness
    - **Property 20: xAPI export completeness**
    - **Validates: Requirements 5.5**

- [ ] 19. Implement privacy and configuration
  - [ ] 19.1 Create XAPIConfiguration model
    - Store privacy and tracking settings
    - Implement singleton pattern
    - Create migration
    - _Requirements: 10.1_
  - [ ] 19.2 Create XAPIAuditLog model
    - Store access timestamp, user, operation type
    - Create migration
    - _Requirements: 10.5_
  - [ ] 19.3 Implement pseudonymous actor generation
    - Generate consistent pseudonyms per student
    - Apply when privacy mode enabled
    - _Requirements: 10.2_
  - [ ] 19.4 Implement student data export
    - GET /api/xapi/my-data/
    - Export all statements for authenticated student
    - _Requirements: 10.3_
  - [ ] 19.5 Implement student data deletion
    - DELETE /api/xapi/my-data/
    - Remove all statements for authenticated student
    - _Requirements: 10.4_
  - [ ] 19.6 Add audit logging middleware
    - Log all xAPI data access
    - _Requirements: 10.5_
  - [ ]* 19.7 Write property test for pseudonymization
    - **Property 32: Privacy mode pseudonymization**
    - **Validates: Requirements 10.2**
  - [ ]* 19.8 Write property test for data export completeness
    - **Property 33: Student data export completeness**
    - **Validates: Requirements 10.3**
  - [ ]* 19.9 Write property test for data deletion
    - **Property 34: Student data deletion completeness**
    - **Validates: Requirements 10.4**
  - [ ]* 19.10 Write property test for audit logging
    - **Property 35: xAPI access audit logging**
    - **Validates: Requirements 10.5**

- [ ] 20. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Implement frontend content type components
  - [ ] 21.1 Create SCORM player component
    - Initialize SCORM API adapter
    - Handle content loading in iframe
    - Communicate with backend API
    - Create SCORM lesson page with session management
    - _Requirements: 2.1, 9.1_
  - [ ] 21.2 Create Markdown viewer component
    - Render HTML with syntax highlighting styles
    - Display table of contents
    - Track scroll progress
    - _Requirements: 11.2, 11.3, 11.4_
  - [ ] 21.3 Create Markdown editor component for instructors
    - Live preview
    - Toolbar for common formatting
    - _Requirements: 11.1_
  - [ ] 21.4 Create H5P player component
    - Load H5P content in iframe
    - Handle xAPI messages from H5P
    - _Requirements: 12.2, 12.3_
  - [ ] 21.5 Create H5P upload component for instructors
    - Package upload with validation feedback
    - Library management interface
    - _Requirements: 12.1, 12.5_
  - [ ] 21.6 Create HTML embed viewer component
    - Render sandboxed iframe
    - Set up postMessage listener for xAPI
    - _Requirements: 13.2, 13.3_
  - [ ] 21.7 Create HTML embed configuration component
    - URL/inline HTML input
    - Sandbox permission toggles
    - _Requirements: 13.1, 13.5_
  - [ ] 21.8 Update lesson detail page to support all content types
    - Route to appropriate component based on content_type
    - Display content type icons
    - _Requirements: 15.2, 15.3_

- [ ] 22. Implement frontend analytics dashboard
  - [ ] 22.1 Create course analytics page
    - Completion rate charts
    - Quiz score visualizations
    - Time spent per lesson
    - _Requirements: 5.1, 5.2_
  - [ ] 22.2 Create student activity stream component
    - Timeline of learning activities
    - Verb-based filtering
    - _Requirements: 5.3, 5.4_
  - [ ] 22.3 Create xAPI export functionality
    - Export button with date range filter
    - Download as JSON
    - _Requirements: 5.5_

- [ ] 23. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
