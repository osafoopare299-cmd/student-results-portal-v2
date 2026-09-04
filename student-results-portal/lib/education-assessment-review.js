export async function ensureEducationAssessmentReviewSchema(sql){
  await sql`alter table edu_assessments add column if not exists review_enabled boolean not null default false`;
  await sql`create index if not exists edu_assessments_review_idx on edu_assessments(status,review_enabled)`;
}
