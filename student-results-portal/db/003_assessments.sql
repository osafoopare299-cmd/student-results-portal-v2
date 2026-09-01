-- Dropare Student Education System — Phase 3 assessments
-- Additive migration. Existing results tables remain untouched.

CREATE TABLE IF NOT EXISTS edu_assessments (
  id BIGSERIAL PRIMARY KEY,
  offering_id BIGINT NOT NULL REFERENCES edu_course_offerings(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES edu_users(id),
  title TEXT NOT NULL,
  description TEXT,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('mcq','written','viva','osce','practical')),
  max_score NUMERIC(8,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  instructions TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (closes_at IS NULL OR opens_at IS NULL OR closes_at > opens_at)
);

CREATE TABLE IF NOT EXISTS edu_assessment_questions (
  id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES edu_assessments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq','short','long','viva','osce','practical')),
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer JSONB,
  max_score NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (max_score >= 0),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_id, position)
);

CREATE TABLE IF NOT EXISTS edu_assessment_attempts (
  id BIGSERIAL PRIMARY KEY,
  assessment_id BIGINT NOT NULL REFERENCES edu_assessments(id) ON DELETE CASCADE,
  student_user_id BIGINT NOT NULL REFERENCES edu_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','submitted','marked')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC(8,2),
  feedback TEXT,
  marked_by BIGINT REFERENCES edu_users(id),
  marked_at TIMESTAMPTZ,
  UNIQUE(assessment_id, student_user_id)
);

CREATE TABLE IF NOT EXISTS edu_assessment_answers (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES edu_assessment_attempts(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES edu_assessment_questions(id) ON DELETE CASCADE,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(8,2),
  feedback TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS edu_assessments_offering_idx ON edu_assessments(offering_id,status,opens_at,closes_at);
CREATE INDEX IF NOT EXISTS edu_assessments_creator_idx ON edu_assessments(created_by,created_at DESC);
CREATE INDEX IF NOT EXISTS edu_assessment_questions_assessment_idx ON edu_assessment_questions(assessment_id,position);
CREATE INDEX IF NOT EXISTS edu_assessment_attempts_student_idx ON edu_assessment_attempts(student_user_id,assessment_id);
