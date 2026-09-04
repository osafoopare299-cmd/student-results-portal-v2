import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

async function ensureSchema(sql){
  await sql`
    create table if not exists edu_student_revision_reminders (
      id bigserial primary key,
      student_user_id bigint not null references edu_users(id) on delete cascade,
      offering_id bigint null references edu_course_offerings(id) on delete set null,
      title text not null,
      remind_at timestamptz not null,
      repeat_rule text not null default 'once' check (repeat_rule in ('once','daily','weekly')),
      is_active boolean not null default true,
      last_sent_at timestamptz null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists edu_student_revision_reminders_due_idx on edu_student_revision_reminders(student_user_id,is_active,remind_at)`;
}

async function tableExists(sql,name){
  const rows=await sql`select to_regclass(${`public.${name}`}) is not null as present`;
  return Boolean(rows?.[0]?.present);
}

function streakFromDates(values){
  const unique=[...new Set(values.map(String))].sort((a,b)=>b.localeCompare(a));
  if(!unique.length)return {current:0,longest:0,days:[]};
  const dayMs=86400000;const toDay=s=>Date.parse(`${s}T00:00:00Z`);
  let longest=1,run=1;
  for(let i=1;i<unique.length;i++){const diff=(toDay(unique[i-1])-toDay(unique[i]))/dayMs;if(diff===1){run++;longest=Math.max(longest,run);}else run=1;}
  const todayKey=new Date().toISOString().slice(0,10);const yesterdayKey=new Date(Date.now()-dayMs).toISOString().slice(0,10);
  let current=0;
  if(unique[0]===todayKey||unique[0]===yesterdayKey){current=1;for(let i=1;i<unique.length;i++){const diff=(toDay(unique[i-1])-toDay(unique[i]))/dayMs;if(diff===1)current++;else break;}}
  return {current,longest,days:unique.slice(0,30)};
}

function badge(id,label,copy,earned){return {id,label,copy,earned:Boolean(earned)};}

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();await ensureSchema(sql);
    const [hasAI,hasCards,hasTasks]=await Promise.all([
      tableExists(sql,'edu_ai_practice_history'),tableExists(sql,'edu_student_flashcards'),tableExists(sql,'edu_student_study_tasks')
    ]);
    const activity=[];let aiSessions=0,flashcardsCreated=0,flashcardReviews=0,flashcardsMastered=0,tasksCompleted=0;
    if(hasAI){
      const [dates,count]=await Promise.all([
        sql`select (completed_at at time zone 'Africa/Accra')::date::text as activity_day from edu_ai_practice_history where student_user_id=${access.user.id}`,
        sql`select count(*)::int as n from edu_ai_practice_history where student_user_id=${access.user.id}`
      ]);activity.push(...dates.map(x=>x.activity_day));aiSessions=Number(count?.[0]?.n||0);
    }
    if(hasCards){
      const [dates,count]=await Promise.all([
        sql`select (last_reviewed_at at time zone 'Africa/Accra')::date::text as activity_day from edu_student_flashcards where student_user_id=${access.user.id} and last_reviewed_at is not null`,
        sql`select count(*)::int as created,coalesce(sum(review_count),0)::int as reviews,count(*) filter (where status='mastered')::int as mastered from edu_student_flashcards where student_user_id=${access.user.id}`
      ]);activity.push(...dates.map(x=>x.activity_day));flashcardsCreated=Number(count?.[0]?.created||0);flashcardReviews=Number(count?.[0]?.reviews||0);flashcardsMastered=Number(count?.[0]?.mastered||0);
    }
    if(hasTasks){
      const [dates,count]=await Promise.all([
        sql`select (completed_at at time zone 'Africa/Accra')::date::text as activity_day from edu_student_study_tasks where student_user_id=${access.user.id} and completed_at is not null`,
        sql`select count(*)::int as n from edu_student_study_tasks where student_user_id=${access.user.id} and status='completed'`
      ]);activity.push(...dates.map(x=>x.activity_day));tasksCompleted=Number(count?.[0]?.n||0);
    }
    const [reminders,courses]=await Promise.all([
      sql`select r.id,r.title,r.remind_at,r.repeat_rule,r.is_active,r.offering_id,c.code as course_code,c.title as course_title from edu_student_revision_reminders r left join edu_course_offerings o on o.id=r.offering_id left join edu_courses c on c.id=o.course_id where r.student_user_id=${access.user.id} order by r.is_active desc,r.remind_at asc limit 100`,
      sql`select o.id,c.code,c.title from edu_enrolments e join edu_course_offerings o on o.id=e.offering_id join edu_courses c on c.id=o.course_id where e.student_user_id=${access.user.id} and e.status='active' order by c.code`
    ]);
    const streak=streakFromDates(activity);
    const counts={ai_sessions:aiSessions,flashcards_created:flashcardsCreated,flashcard_reviews:flashcardReviews,flashcards_mastered:flashcardsMastered,tasks_completed:tasksCompleted};
    const total=aiSessions+flashcardReviews+tasksCompleted;
    const badges=[
      badge('first-step','First Step','Complete your first tracked study activity.',total>=1),
      badge('three-day','3-Day Streak','Study on three consecutive days.',streak.longest>=3),
      badge('seven-day','7-Day Streak','Keep learning for seven consecutive days.',streak.longest>=7),
      badge('practice-10','Practice Builder','Complete 10 AI Tutor practice sessions.',aiSessions>=10),
      badge('cards-25','Card Collector','Create 25 private flashcards.',flashcardsCreated>=25),
      badge('review-100','Revision Engine','Complete 100 flashcard reviews.',flashcardReviews>=100),
      badge('master-20','Memory Master','Master 20 flashcards.',flashcardsMastered>=20),
      badge('planner-20','Plan Finisher','Complete 20 study-planner tasks.',tasksCompleted>=20)
    ];
    const points=aiSessions*10+flashcardReviews*2+tasksCompleted*5+flashcardsMastered*5;
    const level=points>=1000?'Scholar':points>=500?'Achiever':points>=200?'Focused Learner':points>=50?'Rising Learner':'Starter';
    return NextResponse.json({ok:true,streak,badges,points,level,counts,reminders,courses});
  }catch(error){console.error('Study engagement unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load study rewards and reminders.'},{status:503});}
}

export async function POST(request){
  const access=await getEducationUser('student');if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const body=await request.json();const action=String(body.action||'create');const sql=getEducationSql();await ensureSchema(sql);
    if(action==='create'){
      const title=String(body.title||'').trim().slice(0,180);const remindAt=new Date(body.remindAt);const repeatRule=['once','daily','weekly'].includes(body.repeatRule)?body.repeatRule:'once';const offeringId=body.offeringId?Number(body.offeringId):null;
      if(!title||Number.isNaN(remindAt.getTime()))return NextResponse.json({ok:false,error:'Enter a reminder title and valid date/time.'},{status:400});
      if(offeringId){const ok=await sql`select 1 from edu_enrolments where student_user_id=${access.user.id} and offering_id=${offeringId} and status='active' limit 1`;if(!ok.length)return NextResponse.json({ok:false,error:'That course is not currently enrolled.'},{status:403});}
      const rows=await sql`insert into edu_student_revision_reminders(student_user_id,offering_id,title,remind_at,repeat_rule) values(${access.user.id},${offeringId},${title},${remindAt.toISOString()},${repeatRule}) returning *`;
      await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'student.revision_reminder.create','edu_student_revision_reminders',${String(rows[0].id)},${JSON.stringify({repeatRule,offeringId})}::jsonb)`;
      return NextResponse.json({ok:true,reminder:rows[0]});
    }
    const id=Number(body.id);if(!Number.isInteger(id))return NextResponse.json({ok:false,error:'Invalid reminder.'},{status:400});
    const owned=await sql`select * from edu_student_revision_reminders where id=${id} and student_user_id=${access.user.id} limit 1`;if(!owned.length)return NextResponse.json({ok:false,error:'Reminder not found.'},{status:404});
    if(action==='toggle'){const active=!owned[0].is_active;await sql`update edu_student_revision_reminders set is_active=${active},updated_at=now() where id=${id} and student_user_id=${access.user.id}`;return NextResponse.json({ok:true,isActive:active});}
    if(action==='delete'){await sql`delete from edu_student_revision_reminders where id=${id} and student_user_id=${access.user.id}`;return NextResponse.json({ok:true});}
    return NextResponse.json({ok:false,error:'Unsupported reminder action.'},{status:400});
  }catch(error){console.error('Revision reminder update failed:',error);return NextResponse.json({ok:false,error:'Unable to update revision reminder.'},{status:503});}
}
