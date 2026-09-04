const DEFAULT_BANDS=[
  {grade:'A',min_percent:80,outcome:'PASS',position:1},
  {grade:'B+',min_percent:75,outcome:'PASS',position:2},
  {grade:'B',min_percent:70,outcome:'PASS',position:3},
  {grade:'C+',min_percent:65,outcome:'PASS',position:4},
  {grade:'C',min_percent:60,outcome:'PASS',position:5},
  {grade:'D+',min_percent:55,outcome:'PASS',position:6},
  {grade:'D',min_percent:50,outcome:'PASS',position:7},
  {grade:'F',min_percent:0,outcome:'REVIEW',position:8},
];

export async function ensureEducationGradingSchema(sql){
  await sql`create table if not exists edu_grading_bands (
    id bigserial primary key,
    grade text not null,
    min_percent numeric(5,2) not null check (min_percent>=0 and min_percent<=100),
    outcome text not null default 'PASS' check (outcome in ('PASS','REVIEW')),
    position integer not null default 1 check (position>0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(min_percent)
  )`;
  const count=await sql`select count(*)::int as count from edu_grading_bands`;
  if(Number(count?.[0]?.count||0)===0){
    for(const band of DEFAULT_BANDS){
      await sql`insert into edu_grading_bands (grade,min_percent,outcome,position) values (${band.grade},${band.min_percent},${band.outcome},${band.position}) on conflict (min_percent) do nothing`;
    }
  }
}

export async function getEducationGradingBands(sql){
  await ensureEducationGradingSchema(sql);
  return sql`select id,grade,min_percent,outcome,position from edu_grading_bands order by min_percent desc,position asc`;
}

export function applyEducationGrade(percentage,bands){
  const p=Number(percentage||0);
  const sorted=[...(bands||[])].sort((a,b)=>Number(b.min_percent)-Number(a.min_percent));
  const band=sorted.find(item=>p>=Number(item.min_percent));
  return {grade:band?.grade||'—',outcome:band?.outcome||'REVIEW'};
}
