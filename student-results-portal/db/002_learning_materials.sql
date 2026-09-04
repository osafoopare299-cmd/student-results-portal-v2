-- Dropare Education — Phase 2 learning materials
-- Additive only. Existing results and Phase 1 education tables remain untouched.

CREATE TABLE IF NOT EXISTS edu_learning_materials (
  id BIGSERIAL PRIMARY KEY,
  offering_id BIGINT NOT NULL REFERENCES edu_course_offerings(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES edu_users(id),
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL DEFAULT 'note' CHECK (material_type IN ('note','pdf','video','link')),
  resource_url TEXT,
  content_text TEXT,
  is_offline_available BOOLEAN NOT NULL DEFAULT FALSE,
  is_ai_approved BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS edu_learning_materials_offering_idx ON edu_learning_materials(offering_id, published_at DESC);
CREATE INDEX IF NOT EXISTS edu_learning_materials_ai_idx ON edu_learning_materials(offering_id, is_ai_approved) WHERE published_at IS NOT NULL;
