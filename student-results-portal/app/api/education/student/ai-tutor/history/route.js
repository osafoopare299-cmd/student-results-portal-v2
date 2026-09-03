import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

async function ensureHistorySchema(sql){
  await sql`
    create table if not exists edu_ai_practice_history (
      id bigserial primary key,
      student_user_id bigint not null references edu_users(id) on delete cascade,
      offering_id bigint null references edu_course_offerings(id) on delete set null,
      mode text not null check (mode in ('mcq','written')),
      topic text not null,
      question_count integer not null check (question_count between 1 and 50),
      answered_count integer not null default 0,
      correct_count integer null,
      percent_score numeric(5,2) null,
      timed boolean not null default false,
      duration_minutes integer null,
      elapsed_seconds integer null,
      completion_reason text not null default 'submitted' check (completion_reason in ('submitted','time_expired')),
      difficulty text not null default 'standard',
      completed_at timestamptz not null default now()
    )
  `;
  await sql`alter table edu_ai_practice_history add column if not exists difficulty text not null default 'standard'`;
  await sql`create index if not exists edu_ai_practice_history_student_completed_idx on edu_ai_practice_history(student_user_id, completed_at desc)`;
}

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok) return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    await ensureHistorySchema(sql);
    const history=await sql`
      select h.id,h.mode,h.topic,h.question_count,h.answered_count,h.correct_count,h.percent_score,
             h.timed,h.duration_minutes,h.elapsed_seconds,h.completion_reason,h.difficulty,h.completed_at,
             c.code as course_code,c.title as course_title
      from edu_ai_practice_history h
      left join edu_course_offerings o on o.id=h.offering_id
      left join edu_courses c on c.id=o.course_id
      where h.student_user_id=${access.user.id}
      order by h.completed_at desc
      limit 50
    `;
    return NextResponse.json({ok:true,history});
  }catch(error){
    console.error('AI Tutor practice history unavailable:',error);
    return NextResponse.json({ok:false,error:'Practice history is not ready yet.'},{status:503});
  }
}

export async function POST(request){
  const access=await getEducationUser('student');
  if(!access.ok) return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const body=await request.json();
    const mode=['mcq','written'].includes(body.mode)?body.mode:null;
    const topic=String(body.topic||'').trim().slice(0,500);
    const questionCount=Number(body.questionCount);
    const answeredCount=Math.max(0,Math.min(questionCount,Number(body.answeredCount)||0));
    const correctCount=mode==='mcq'?Math.max(0,Math.min(questionCount,Number(body.correctCount)||0)):null;
    const percentScore=mode==='mcq'&&questionCount>0?Math.round((correctCount/questionCount)*10000)/100:null;
    const timed=Boolean(body.timed);
    const durationMinutes=timed?Number(body.durationMinutes):null;
    const elapsedSeconds=Math.max(0,Number(body.elapsedSeconds)||0);
    const completionReason=body.completionReason==='time_expired'?'time_expired':'submitted';
    const offeringId=body.offeringId?Number(body.offeringId):null;
    const difficulty=['foundation','standard','challenge'].includes(body.difficulty)?body.difficulty:'standard';

    if(!mode||!topic||!Number.isInteger(questionCount)||questionCount<1||questionCount>50){
      return NextResponse.json({ok:false,error:'Invalid practice history payload.'},{status:400});
    }
    if(offeringId&&!Number.isInteger(offeringId)) return NextResponse.json({ok:false,error:'Invalid course scope.'},{status:400});
    if(timed&&(!Number.isFinite(durationMinutes)||durationMinutes<1||durationMinutes>180)) return NextResponse.json({ok:false,error:'Invalid practice duration.'},{status:400});

    const sql=getEducationSql();
    await ensureHistorySchema(sql);
    if(offeringId){
      const enrolment=await sql`select 1 from edu_enrolments where student_user_id=${access.user.id} and offering_id=${offeringId} and status='active' limit 1`;
      if(!enrolment.length) return NextResponse.json({ok:false,error:'Course access is no longer active.'},{status:403});
    }
    const rows=await sql`
      insert into edu_ai_practice_history(
        student_user_id,offering_id,mode,topic,question_count,answered_count,correct_count,percent_score,
        timed,duration_minutes,elapsed_seconds,completion_reason,difficulty
      ) values(
        ${access.user.id},${offeringId},${mode},${topic},${questionCount},${answeredCount},${correctCount},${percentScore},
        ${timed},${durationMinutes},${elapsedSeconds},${completionReason},${difficulty}
      ) returning id,completed_at
    `;
    await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'ai_tutor_practice_completed','student',${access.user.id},${JSON.stringify({mode,topic:topic.slice(0,200),questionCount,answeredCount,correctCount,percentScore,timed,durationMinutes,elapsedSeconds,completionReason,offeringId,difficulty})}::jsonb)`;
    return NextResponse.json({ok:true,record:rows[0]});
  }catch(error){
    console.error('AI Tutor practice history save failed:',error);
    return NextResponse.json({ok:false,error:'Unable to save practice history.'},{status:503});
  }
}
