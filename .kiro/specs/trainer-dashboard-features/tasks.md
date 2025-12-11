# Implementation Plan: Trainer Dashboard Features

## Overview

This implementation plan builds comprehensive trainer dashboard features by **extending existing Django apps** (quizzes, activity, core) and adding new discussion forum and notification systems. Tasks are organized to build incrementally with early validation through testing.

---

## Phase 1: Database Models and Migrations

- [x] 1. Extend existing models with new fields





  - Add `expertise` TextField to User model in core/models.py
  - Add `attempt_number` IntegerField to QuizAttempt model in quizzes/models.py
  - Update ActivityLog ACTION_TYPES to include quiz and discussion actions
  - Create and run migrations for these changes
  - _Requirements: 6.1, 10.2_


- [x] 2. Create Discussion Forum models




  - Create DiscussionThread model with course, author, title, content, is_pinned, is_locked, is_deleted, timestamps
  - Create DiscussionReply model with thread, author, content, is_solution, is_deleted, timestamps
  - Add indexes on created_at and last_activity_at fields
  - Register models in admin.py
  - Create and run migrations
  - _Requirements: 5.1, 5.2_

- [ ]* 2.1 Write property test for discussion thread persistence
  - **Property 9: Discussion thread data is fully persisted**
  - **Validates: Requirements 5.1, 5.2**


- [x] 3. Create Notification model



  - Create Notification model with recipient, notification_type, title, message, related_course, related_user, link, is_read, created_at
  - Add index on recipient and is_read fields
  - Add index on created_at field
  - Register model in admin.py
  - Create and run migrations
  - _Requirements: 7.1, 7.4_


- [x] 4. Checkpoint - Verify migrations and model structure




  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 2: Quiz/Assessment API (Extending Existing Quizzes App)


- [x] 5. Create Quiz serializers



  - Create QuizSerializer with all Quiz fields
  - Create QuestionSerializer with nested QuestionOptionSerializer
  - Create QuizDetailSerializer with nested questions
  - Create QuizAttemptSerializer with nested answers
  - Create QuizSubmissionSerializer for answer submission
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 5.1 Write property test for quiz data persistence
  - **Property 7: Assessment data persistence is complete**
  - **Validates: Requirements 4.1**





- [ ] 6. Create QuizViewSet with CRUD operations


  - Implement list, create, retrieve, update, destroy actions



  - Filter quizzes by course_id query parameter

  - Add permission checks (IsInstructorOrReadOnly)
  - Verify course ownership for create/update/delete
  - _Requirements: 4.1, 4.5_

- [ ] 7. Add quiz publishing and submission endpoints


  - Implement publish action (POST /api/quizzes/{id}/publish/)
  - Implement submit action (POST /api/quizzes/{id}/submit/)
  - Implement attempts action (GET /api/quizzes/{id}/attempts/) for trainers


  - Implement my_attempts action (GET /api/quizzes/{id}/my-attempts/) for students
  - Calculate score and percentage on submission
  - Track attempt_number automatically
  - _Requirements: 4.6, 4.7, 10.1_

- [ ]* 7.1 Write property test for quiz score calculation
  - **Property 8: Assessment score calculation is correct**
  - **Validates: Requirements 4.7**

- [x] 8. Create Question management endpoints



  - Implement add_question action (POST /api/quizzes/{id}/questions/)
  - Implement update_question action (PUT /api/quizzes/{id}/questions/{q_id}/)
  - Implement delete_question action (DELETE /api/quizzes/{id}/questions/{q_id}/)
  - Support adding multiple options for multiple choice questions
  - Validate at least one correct answer exists
  - _Requirements: 4.2, 4.3_

- [x] 9. Add quiz attempt history endpoint





  - Implement attempt_history action (GET /api/quizzes/{id}/attempts/{student_id}/)
  - Return all attempts ordered chronologically
  - Include question-by-question breakdown
  - Show student answer, correct answer, points earned
  - _Requirements: 10.2, 10.3_

- [ ]* 9.1 Write property test for attempt ordering
  - **Property 16: Assessment attempts are chronologically ordered**
  - **Validates: Requirements 10.2**


- [x] 10. Register QuizViewSet in api_urls.py



  - Add router registration for QuizViewSet
  - Test all endpoints with Postman/curl
  - _Requirements: 4.1-4.8_

- [x] 11. Checkpoint - Verify quiz API functionality




  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Discussion Forum API


- [x] 12. Create Discussion serializers




  - Create DiscussionThreadSerializer with author details
  - Create DiscussionReplySerializer with author details
  - Create ThreadDetailSerializer with nested replies
  - Add reply_count computed field to ThreadSerializer
  - _Requirements: 5.1, 5.2, 5.3_


- [x] 13. Create DiscussionThreadViewSet




  - Implement list, create, retrieve, update, destroy actions
  - Filter threads by course_id query parameter
  - Order by last_activity_at descending
  - Add permission checks (IsAuthenticated)
  - Verify enrollment for students, ownership for trainers
  - _Requirements: 5.1, 5.3_

- [ ]* 13.1 Write property test for discussion filtering
  - **Property 10: Discussion filtering by course is accurate**
  - **Validates: Requirements 5.3**


- [x] 14. Add discussion reply endpoints




  - Implement add_reply action (POST /api/discussions/{id}/replies/)
  - Implement update_reply action (PUT /api/discussions/{id}/replies/{reply_id}/)
  - Implement mark_solution action (POST /api/discussions/{id}/replies/{reply_id}/mark_solution/)
  - Update thread's last_activity_at on new reply
  - _Requirements: 5.2, 5.5_

- [x] 15. Add discussion moderation endpoints





  - Implement pin action (POST /api/discussions/{id}/pin/) - trainer only
  - Implement lock action (POST /api/discussions/{id}/lock/) - trainer only
  - Implement soft delete for threads and replies
  - Verify trainer is course instructor for moderation actions
  - _Requirements: 5.7_


- [x] 16. Register DiscussionThreadViewSet in api_urls.py



  - Add router registration for DiscussionThreadViewSet
  - Test all endpoints
  - _Requirements: 5.1-5.7_


- [x] 17. Checkpoint - Verify discussion forum functionality




  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 4: Activity Logging and Signals


- [x] 18. Create activity logging utility functions



  - Create log_activity() helper function in activity/utils.py
  - Accept user, action_type, content_object, description, metadata parameters
  - Use generic foreign key to link to any model
  - Extract IP address and user agent from request
  - _Requirements: 2.1, 2.4_


- [x] 19. Create Django signals for automatic activity logging




  - Create signal handler for enrollment (post_save on Enrollment)
  - Create signal handler for lesson completion (post_save on Progress)
  - Create signal handler for quiz submission (post_save on QuizAttempt)
  - Create signal handler for discussion post (post_save on DiscussionThread)
  - Create signal handler for discussion reply (post_save on DiscussionReply)
  - Register all signals in apps.py ready() method
  - _Requirements: 2.4, 2.5, 2.6, 2.7_

- [ ]* 19.1 Write property test for activity log creation
  - **Property 4: Student actions create corresponding activity logs**
  - **Validates: Requirements 2.4, 2.5, 2.6, 2.7**


- [x] 20. Create ActivityLogViewSet




  - Implement list action with filtering by course, student, action_type, date_range
  - Order by timestamp descending
  - Add permission check (trainer can only see their course activities)
  - Implement recent action (GET /api/activity/recent/) for trainer dashboard
  - Limit recent activities to last 50 by default
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 20.1 Write property test for activity chronological ordering
















  - **Property 3: Activity logs are chronologically ordered**
  - **Validates: Requirements 2.1**


- [x] 21. Register ActivityLogViewSet in api_urls.py



  - Add router registration
  - Test filtering and ordering
  - _Requirements: 2.1-2.7_

- [ ] 22. Checkpoint - Verify activity logging works

  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Notification System


- [x] 23. Create Notification serializers





  - Create NotificationSerializer with all fields
  - Include related_course and related_user details
  - Add computed field for time_ago display
  - _Requirements: 7.4_

- [ ] 24. Create notification utility functions

  - Create create_notification() helper in notifications/utils.py
  - Accept recipient, notification_type, title, message, related_course, related_user, link
  - Check recipient's notification_preferences before creating
  - Return created notification or None if disabled
  - _Requirements: 7.1, 7.2, 7.3_


- [x] 24.1 Write property test for notification preferences





  - **Property 13: Notifications are created based on preferences**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 25. Create Django signals for notification triggers

  - Create signal for new discussion post (notify course trainer)
  - Create signal for course completion (notify trainer if enabled)
  - Create signal for quiz submission (notify trainer if enabled)
  - Check notification_preferences before creating notifications
  - Register signals in apps.py
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 26. Create NotificationViewSet

  - Implement list action (filter by recipient=current_user)
  - Implement unread action (GET /api/notifications/unread/)
  - Implement mark_read action (POST /api/notifications/{id}/mark_read/)
  - Implement mark_all_read action (POST /api/notifications/mark_all_read/)
  - Order by created_at descending
  - _Requirements: 7.4, 7.5_

- [ ] 27. Register NotificationViewSet in api_urls.py

  - Add router registration
  - Test notification creation and marking as read
  - _Requirements: 7.1-7.6_

- [ ] 28. Checkpoint - Verify notification system

  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Trainer Profile and Settings API

- [x] 29. Create TrainerProfileSerializer


  - Create serializer with User fields: first_name, last_name, email, phone, bio, expertise, avatar
  - Create serializer for notification_preferences JSON structure
  - Include fields: discussion_notifications, progress_notifications, assessment_notifications, auto_publish_courses
  - _Requirements: 6.1, 6.4_

- [x] 30. Create TrainerProfileViewSet


  - Implement retrieve action (GET /api/trainer/profile/)
  - Implement update action (PUT /api/trainer/profile/)
  - Implement partial_update action (PATCH /api/trainer/profile/)
  - Update User model fields and notification_preferences JSON
  - Add permission check (IsAuthenticated, IsInstructor)
  - _Requirements: 6.1, 6.4, 6.6_


- [x] 30.1 Write property test for profile data persistence





  - **Property 11: Profile image validation rejects invalid files**
  - **Validates: Requirements 6.2**


- [x] 31. Add profile image upload endpoint





  - Implement upload_avatar action (POST /api/trainer/profile/upload_avatar/)
  - Validate file type (JPEG, PNG, GIF, WebP)
  - Validate file size (max 5MB)
  - Save to User.avatar field
  - Return updated profile data
  - _Requirements: 6.2_

- [x] 32. Add password change endpoint





  - Implement change_password action (POST /api/trainer/profile/change_password/)
  - Validate current_password against user's password
  - Validate new_password strength (min 8 chars, complexity)
  - Update password using set_password()
  - Return success message
  - _Requirements: 6.5_

- [ ]* 32.1 Write property test for password validation
  - **Property 12: Password change requires valid current password**
  - **Validates: Requirements 6.5**

- [ ] 33. Register TrainerProfileViewSet in api_urls.py

  - Add router registration
  - Test profile update and image upload
  - _Requirements: 6.1-6.6_

- [ ] 34. Checkpoint - Verify trainer settings functionality

  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Analytics and Statistics API

- [ ] 35. Create analytics utility functions

  - Create calculate_trainer_analytics() in analytics/utils.py
  - Calculate total courses, total students, total enrollments, total lessons
  - Calculate per-course enrollment count and average progress
  - Use Django ORM aggregation (Count, Avg)
  - Add select_related and prefetch_related for optimization
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 35.1 Write property test for analytics calculations
  - **Property 1: Analytics aggregate calculations are correct**
  - **Validates: Requirements 1.1**

- [ ]* 35.2 Write property test for course analytics
  - **Property 2: Course-specific analytics match actual data**
  - **Validates: Requirements 1.2, 1.3**

- [ ] 36. Create TrainerAnalyticsView (APIView)

  - Implement GET /api/analytics/dashboard/
  - Return trainer dashboard analytics using utility function
  - Add permission check (IsAuthenticated, IsInstructor)
  - Cache results for 5 minutes
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 37. Create CourseStatisticsView (APIView)

  - Implement GET /api/analytics/course/{id}/
  - Return course-specific statistics (enrollments, active students, completion rate, avg progress)
  - Calculate active students (activity in last 30 days)
  - Calculate completion rate (students who completed all lessons / total enrolled)
  - Verify trainer owns the course
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 37.1 Write property test for active student calculation
  - **Property 14: Active student count respects time window**
  - **Validates: Requirements 8.2**

- [ ]* 37.2 Write property test for completion rate
  - **Property 15: Completion rate calculation is accurate**
  - **Validates: Requirements 8.3**

- [ ] 38. Create EnrollmentTrendsView (APIView)

  - Implement GET /api/analytics/enrollment_trends/
  - Accept period parameter (daily, weekly, monthly)
  - Group enrollments by time period
  - Return time series data for charts
  - Filter by trainer's courses
  - _Requirements: 1.4_

- [ ] 39. Create CompletionRatesView (APIView)

  - Implement GET /api/analytics/completion_rates/
  - Calculate completion rate for each of trainer's courses
  - Return course title, total enrolled, total completed, percentage
  - Order by completion rate descending
  - _Requirements: 1.5_

- [ ] 40. Register analytics views in api_urls.py

  - Add URL patterns for all analytics views
  - Test with various data scenarios
  - _Requirements: 1.1-1.5, 8.1-8.5_

- [ ] 41. Checkpoint - Verify analytics accuracy

  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 8: Student Management API

- [x] 42. Create StudentManagementView (APIView)




  - Implement GET /api/trainer/students/
  - Return all unique students enrolled in trainer's courses
  - Include student name, email, enrolled course count, overall progress
  - Calculate overall progress as average across all enrollments
  - Add pagination (20 per page)
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 42.1 Write property test for unique students
  - **Property 5: Student list contains unique students only**
  - **Validates: Requirements 3.1**

- [ ]* 42.2 Write property test for overall progress calculation
  - **Property 6: Overall progress is average across all enrollments**
  - **Validates: Requirements 3.3**

- [ ] 43. Create StudentDetailView (APIView)
  - Implement GET /api/trainer/students/{id}/
  - Return detailed student information
  - Include course-by-course progress breakdown
  - Include assessment history (total taken, last assessment, last score)
  - Verify student is enrolled in at least one trainer's course
  - _Requirements: 3.4, 3.5_

- [ ] 44. Create StudentProgressView (APIView)
  - Implement GET /api/trainer/students/{id}/progress/
  - Return progress for all courses student is enrolled in
  - Include lesson-by-lesson completion status
  - Include quiz attempts and scores
  - Calculate time spent using LessonTimeTracking
  - _Requirements: 3.4_

- [ ] 45. Create bulk operations endpoints
  - Implement POST /api/trainer/students/export/ for CSV export
  - Generate CSV with student data (name, email, courses, progress)
  - Implement POST /api/trainer/students/bulk_message/ for notifications
  - Create notifications for selected students
  - Verify trainer has access to all selected students
  - _Requirements: 9.1, 9.2_

- [ ] 46. Register student management views in api_urls.py
  - Add URL patterns for all student views
  - Test with multiple students and courses
  - _Requirements: 3.1-3.5, 9.1-9.4_

- [ ] 47. Checkpoint - Verify student management features
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 9: Integration and Testing

- [ ] 48. Create integration tests for quiz workflow
  - Test: Create quiz → Add questions → Publish → Student submits → View results
  - Test: Multiple attempts with attempt_number tracking
  - Test: Score calculation with various answer combinations
  - Verify activity logs are created
  - Verify notifications are sent
  - _Requirements: 4.1-4.8, 10.1-10.5_

- [ ] 49. Create integration tests for discussion workflow
  - Test: Create thread → Add replies → Mark solution → Pin/Lock
  - Test: Filtering by course
  - Test: Permissions (student vs trainer)
  - Verify activity logs are created
  - Verify notifications are sent
  - _Requirements: 5.1-5.7_

- [ ] 50. Create integration tests for analytics workflow
  - Test: Create courses → Enroll students → Track progress → View analytics
  - Test: Active student calculation with various activity dates
  - Test: Completion rate with partial and full completions
  - Test: Enrollment trends over time
  - _Requirements: 1.1-1.5, 8.1-8.5_

- [ ] 51. Create integration tests for notification workflow
  - Test: Discussion post triggers notification
  - Test: Quiz submission triggers notification
  - Test: Course completion triggers notification
  - Test: Notification preferences disable notifications
  - Test: Mark read and mark all read
  - _Requirements: 7.1-7.6_

- [ ] 52. Test API with Astro frontend
  - Update Astro API endpoints to match Django URLs
  - Test trainer dashboard page
  - Test analytics page
  - Test student management page
  - Test discussion forum page
  - Test settings page
  - Fix any CORS or authentication issues
  - _Requirements: All_

- [ ] 53. Final Checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 10: Documentation and Deployment

- [ ] 54. Create API documentation
  - Document all endpoints with request/response examples
  - Create Postman collection for API testing
  - Add docstrings to all ViewSets and utility functions
  - Update README with new features
  - _Requirements: All_

- [ ] 55. Add database indexes for performance
  - Add index on ActivityLog (user, timestamp)
  - Add index on Notification (recipient, is_read, created_at)
  - Add index on DiscussionThread (course, last_activity_at)
  - Add index on QuizAttempt (quiz, student, started_at)
  - Create and run migrations
  - _Requirements: Performance_

- [ ] 56. Configure caching for analytics
  - Add Redis cache backend configuration
  - Cache trainer dashboard analytics (5 min TTL)
  - Cache course statistics (10 min TTL)
  - Cache notification counts (30 sec TTL)
  - Add cache invalidation on data changes
  - _Requirements: Performance_

- [ ] 57. Set up API rate limiting
  - Configure rate limiting middleware
  - Set 100 req/min for read operations
  - Set 20 req/min for write operations
  - Set 5 req/min for file uploads
  - Add rate limit headers to responses
  - _Requirements: Security_

- [ ] 58. Deploy to staging environment
  - Run all migrations on staging database
  - Deploy code to staging server
  - Run full test suite on staging
  - Perform manual QA testing
  - Monitor error logs
  - _Requirements: Deployment_

- [ ] 59. Final production deployment
  - Create deployment checklist
  - Schedule deployment during low-traffic window
  - Run migrations on production database
  - Deploy code to production
  - Monitor error logs and performance
  - Verify all features work correctly
  - _Requirements: Deployment_

---

## Summary

This implementation plan extends existing Django apps (quizzes, activity, core) and adds new discussion forum and notification systems. The plan is organized into 10 phases with 59 tasks total, including:

- **Phase 1-2**: Database models and quiz API (extending existing quizzes app)
- **Phase 3-4**: Discussion forum and activity logging
- **Phase 5-6**: Notifications and trainer settings
- **Phase 7-8**: Analytics and student management
- **Phase 9**: Integration testing
- **Phase 10**: Documentation and deployment

Each phase includes checkpoints to verify functionality before proceeding. Property-based tests are marked with `*` and validate critical correctness properties.
