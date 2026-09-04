-- Dropare Student Education System — Phase 1 foundation
-- Additive migration. Existing results tables are intentionally untouched.

CREATE TABLE IF NOT EXISTS edu_academic_years (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  starts_on DATE,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edu_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','lecturer','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  external_auth_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS edu_users_email_lower_uidx ON edu_users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS edu_users_external_auth_uidx ON edu_users (external_auth_id) WHERE external_auth_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS edu_classes (
  id BIGSERIAL PRIMARY KEY,
  academic_year_id BIGINT REFERENCES edu_academic_years(id),
  name TEXT NOT NULL,
  code TEXT,
  level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edu_courses (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS edu_courses_code_lower_uidx ON edu_courses (LOWER(code));

CREATE TABLE IF NOT EXISTS edu_student_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES edu_users(id) ON DELETE CASCADE,
  student_number TEXT,
  class_id BIGINT REFERENCES edu_classes(id),
  phone TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS edu_student_number_uidx ON edu_student_profiles (student_number) WHERE student_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS edu_lecturer_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES edu_users(id) ON DELETE CASCADE,
  staff_number TEXT,
  department TEXT,
  title TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edu_course_offerings (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES edu_courses(id),
  class_id BIGINT NOT NULL REFERENCES edu_classes(id),
  academic_year_id BIGINT NOT NULL REFERENCES edu_academic_years(id),
  lecturer_user_id BIGINT REFERENCES edu_users(id),
  term TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, class_id, academic_year_id, term)
);

CREATE TABLE IF NOT EXISTS edu_enrolments (
  id BIGSERIAL PRIMARY KEY,
  student_user_id BIGINT NOT NULL REFERENCES edu_users(id) ON DELETE CASCADE,
  offering_id BIGINT NOT NULL REFERENCES edu_course_offerings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','withdrawn')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_user_id, offering_id)
);

CREATE TABLE IF NOT EXISTS edu_timetable_events (
  id BIGSERIAL PRIMARY KEY,
  offering_id BIGINT REFERENCES edu_course_offerings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'class',
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  online_url TEXT,
  created_by BIGINT REFERENCES edu_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edu_announcements (
  id BIGSERIAL PRIMARY KEY,
  author_user_id BIGINT REFERENCES edu_users(id),
  offering_id BIGINT REFERENCES edu_course_offerings(id) ON DELETE CASCADE,
  class_id BIGINT REFERENCES edu_classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS edu_role_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES edu_users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  scope_type TEXT,
  scope_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS edu_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES edu_users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS edu_enrolments_student_idx ON edu_enrolments(student_user_id);
CREATE INDEX IF NOT EXISTS edu_offerings_lecturer_idx ON edu_course_offerings(lecturer_user_id);
CREATE INDEX IF NOT EXISTS edu_timetable_start_idx ON edu_timetable_events(starts_at);
CREATE INDEX IF NOT EXISTS edu_announcements_published_idx ON edu_announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS edu_audit_actor_idx ON edu_audit_logs(actor_user_id, created_at DESC);
