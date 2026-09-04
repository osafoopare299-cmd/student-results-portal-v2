export async function ensureEducationResultReleaseSchema(sql){
  await sql`alter table edu_assessment_attempts add column if not exists released_at timestamptz`;
  await sql`alter table edu_assessment_attempts add column if not exists released_by bigint references edu_users(id)`;
  await sql`create index if not exists edu_assessment_attempts_release_idx on edu_assessment_attempts(assessment_id,released_at)`;
}
