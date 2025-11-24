# LMS Project - Product Overview

## What is this?
A Learning Management System (LMS) built with Django that enables instructors to create and manage courses, and students to enroll and track their progress through video-based lessons.

## Core Features
- **User Management**: Custom user model with student and instructor roles
- **Course Management**: Instructors can create courses with multiple lessons
- **Video Lessons**: Lessons contain video content (via URLs) and supplementary materials
- **Student Enrollment**: Students can enroll in courses
- **Progress Tracking**: System tracks which lessons students have completed and when

## Key Entities
- **Users**: Extended Django user with `is_student` and `is_instructor` flags
- **Courses**: Created by instructors, contain multiple lessons
- **Lessons**: Video-based content within courses, ordered sequentially
- **Enrollments**: Links students to courses
- **Progress**: Tracks completion status of lessons per student
