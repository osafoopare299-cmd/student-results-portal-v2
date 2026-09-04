# Dropare Student Education System

## Product goal
Transform the existing student results portal into a complete mobile-first education platform while retaining the current results workflow as the Results module.

## Roles
- Student
- Lecturer
- Administrator

## Student portal
- Secure login and profile
- Enrolled courses and rotations
- Timetable
- Announcements
- Learning hub for notes, PDFs and approved videos
- Quizzes and assignments
- Assessments: MCQ, written, viva/OSCE and practical
- Results: raw scores, normalized percentages, grades, class position and progress trends
- Attendance and rotation summaries
- Notifications
- AI Tutor grounded only in approved course materials
- Offline downloads for selected learning resources and supported tools

## Lecturer portal
- Lecturer dashboard
- Course/class access scoped by administrator permissions
- Upload and manage notes, PDFs and videos
- Create quizzes, assignments and assessments
- Question bank and marking schemes
- Enter/import written, viva/OSCE and practical marks
- Attendance capture
- Draft/review/publish results
- Student and class analytics
- Announcements and notifications

## Administrator portal
- Student and lecturer management
- Courses, classes, rotations and academic years
- Enrolments
- Role-based permissions
- Timetable management
- Assessment configuration and grading rules
- Result publication controls
- Notification controls
- Audit log
- Platform analytics

## Core data model
- users
- student_profiles
- lecturer_profiles
- academic_years
- classes
- courses
- rotations
- enrolments
- timetable_events
- announcements
- learning_materials
- material_downloads
- assessments
- assessment_sections
- questions
- question_options
- submissions
- submission_answers
- assignments
- assignment_submissions
- marks
- published_results
- attendance_sessions
- attendance_records
- notifications
- ai_approved_sources
- ai_conversations
- ai_messages
- analytics_snapshots
- audit_logs

## Results compatibility
The existing email-based results system remains operational during migration. Its current written/viva/additional-marks logic becomes a supported assessment configuration rather than a hard-coded global rule. Assessments may instead be percentage-normalized and may omit viva or additional marks.

## AI Tutor safety and grounding
- Retrieval is limited to materials explicitly approved for the student's enrolled courses.
- Answers should cite the source material used.
- If approved sources do not support an answer, the tutor states that the answer is not available from approved materials rather than silently using unrelated knowledge.
- Admin/lecturer controls determine which materials are eligible for AI retrieval.

## Analytics
- Topic/question-level performance
- Weak-topic detection
- Individual progress over time
- Course/class performance
- Assessment difficulty and item performance
- Attendance-performance correlation where appropriate
- Lecturer/admin aggregate dashboards

## Offline/PWA
- Installable PWA shell
- Cache app navigation and selected public/static assets
- Explicit download-for-offline control for eligible learning materials
- Locally queue supported low-risk actions and synchronize when online
- Assessments requiring integrity controls can be marked online-only
- Clearly display online/offline/sync status

## Mobile-first UX
Primary student navigation: Home, Learn, Assess, Results, More.
Desktop expands into a sidebar. Lecturer and Admin experiences use role-specific dashboards while sharing the same design system.

## Delivery phases
1. Foundation: authentication, roles, navigation, profiles, courses/classes, database migrations.
2. Learning: materials, announcements, timetable, assignments, quizzes.
3. Assessment: MCQ/written/viva/OSCE/practical, marking and publication.
4. Results and analytics: trends, grades, rank policies, weak-topic analytics.
5. Attendance and notifications.
6. Grounded AI Tutor.
7. PWA/offline hardening and app-store-ready packaging path.

## Architecture
- Next.js App Router on Vercel
- Neon Postgres as the relational system of record
- Server-side authorization for every protected operation
- Route handlers/server actions for mutations as appropriate
- Object/file storage for uploaded learning resources rather than storing large files directly in Postgres
- Background/queued notification delivery with retry and delivery status
- Audit logging for sensitive academic/admin mutations

## Non-negotiables
- A student can only access their own private academic data plus materials for courses they are authorized to view.
- Lecturer permissions are scoped to assigned courses/classes.
- Result publication is an explicit workflow; drafts are not student-visible.
- Every privileged mutation is authorized server-side.
- Existing working result publication/email behavior must not be removed during migration without a replacement and verification.
