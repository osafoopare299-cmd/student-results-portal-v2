import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

async function ensureSchema(sql){
  await sql`
    create table if not exists edu_student_flashcards (
      id bigserial primary key,
      student_user_id bigint not null references edu_users(id) on delete cascade,
      offering_id bigint null references edu_course_offerings(id) on delete set null,
      front_text text not null,
      back_text text not null,
      topic text null,
      status text not null default 'learning' check (status in ('learning','review','mastered')),
      ease numeric(4,2) not null default 2.50,
      interval_days integer not null default 0,
      review_count integer not null default 0,
      next_review_at timestamptz not null default now(),
      last_reviewed_at timestamptz null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists edu_student_flashcards_due_idx on edu_student_flashcards(student_user_id,next_review_at)`;
}

async function verifyOffering(sql,userId,offeringId){
  if(!offeringId)return true;
  const rows=await sql`select 1 from edu_enrolments where student_user_id=${userId} and offering_id=${offeringId} and status='active' limit 1`;
  return Boolean(rows.length);
}

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();await ensureSchema(sql);
    const cards=await sql`
      select f.*,c.code as course_code,c.title as course_title
      from edu_student_flashcards f
      left join edu_course_offerings o on o.id=f.offering_id
      left join edu_courses c on c.id=o.course_id
      where f.student_user_id=${access.user.id}
      order by (f.next_review_at<=now()) desc,f.next_review_at asc,f.updated_at desc
      limit 500
    `;
    const courses=await sql`
      select o.id,c.code,c.title from edu_enrolments e join edu_course_offerings o on o.id=e.offering_id join edu_courses c on c.id=o.course_id
      where e.student_user_id=${access.user.id} and e.status='active' order by c.code
    `;
    const due=cards.filter(x=>new Date(x.next_review_at)<=new Date()).length;
    return NextResponse.json({ok:true,cards,courses,summary:{total:cards.length,due,mastered:cards.filter(x=>x.status==='mastered').length}});
  }catch(error){console.error('Flashcards unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load flashcards.'},{status:503});}
}

export async function POST(request){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const body=await request.json();const front=String(body.front||'').trim();const back=String(body.back||'').trim();const topic=String(body.topic||'').trim().slice(0,200);const offeringId=body.offeringId?Number(body.offeringId):null;
    if(!front||!back||front.length>4000||back.length>8000)return NextResponse.json({ok:false,error:'Front and back text are required.'},{status:400});
    const sql=getEducationSql();await ensureSchema(sql);if(!await verifyOffering(sql,access.user.id,offeringId))return NextResponse.json({ok:false,error:'Course access is no longer active.'},{status:403});
    const rows=await sql`insert into edu_student_flashcards(student_user_id,offering_id,front_text,back_text,topic) values(${access.user.id},${offeringId},${front},${back},${topic||null}) returning *`;
    await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'student.flashcard.create','edu_student_flashcards',${String(rows[0].id)},${JSON.stringify({offeringId,topic})}::jsonb)`;
    return NextResponse.json({ok:true,card:rows[0]});
  }catch(error){console.error('Flashcard create failed:',error);return NextResponse.json({ok:false,error:'Unable to create flashcard.'},{status:503});}
}

export async function PATCH(request){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const body=await request.json();const id=Number(body.id);if(!Number.isInteger(id))return NextResponse.json({ok:false,error:'Invalid flashcard.'},{status:400});
    const sql=getEducationSql();await ensureSchema(sql);
    const existing=await sql`select * from edu_student_flashcards where id=${id} and student_user_id=${access.user.id} limit 1`;if(!existing.length)return NextResponse.json({ok:false,error:'Flashcard not found.'},{status:404});
    if(body.action==='review'){
      const rating=['again','hard','good','easy'].includes(body.rating)?body.rating:'good';const card=existing[0];let ease=Number(card.ease||2.5),interval=Number(card.interval_days||0);
      if(rating==='again'){interval=0;ease=Math.max(1.3,ease-0.2);} else if(rating==='hard'){interval=Math.max(1,Math.round(Math.max(1,interval)*1.2));ease=Math.max(1.3,ease-0.15);} else if(rating==='easy'){interval=Math.max(4,Math.round(Math.max(1,interval||1)*ease*1.35));ease=Math.min(3.2,ease+0.15);} else {interval=interval<1?1:interval===1?3:Math.max(4,Math.round(interval*ease));}
      const status=interval>=21?'mastered':interval>=3?'review':'learning';const delayHours=rating==='again'?0.17:interval*24;
      const rows=await sql`update edu_student_flashcards set ease=${ease},interval_days=${interval},review_count=review_count+1,status=${status},last_reviewed_at=now(),next_review_at=now()+(${delayHours}||' hours')::interval,updated_at=now() where id=${id} and student_user_id=${access.user.id} returning *`;
      return NextResponse.json({ok:true,card:rows[0]});
    }
    const front=body.front===undefined?existing[0].front_text:String(body.front||'').trim();const back=body.back===undefined?existing[0].back_text:String(body.back||'').trim();const topic=body.topic===undefined?existing[0].topic:String(body.topic||'').trim().slice(0,200);
    if(!front||!back)return NextResponse.json({ok:false,error:'Front and back text are required.'},{status:400});
    const rows=await sql`update edu_student_flashcards set front_text=${front},back_text=${back},topic=${topic||null},updated_at=now() where id=${id} and student_user_id=${access.user.id} returning *`;
    return NextResponse.json({ok:true,card:rows[0]});
  }catch(error){console.error('Flashcard update failed:',error);return NextResponse.json({ok:false,error:'Unable to update flashcard.'},{status:503});}
}

export async function DELETE(request){
  const access=await getEducationUser('student');if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{const body=await request.json();const id=Number(body.id);const sql=getEducationSql();await ensureSchema(sql);await sql`delete from edu_student_flashcards where id=${id} and student_user_id=${access.user.id}`;return NextResponse.json({ok:true});}catch(error){return NextResponse.json({ok:false,error:'Unable to delete flashcard.'},{status:503});}
}
