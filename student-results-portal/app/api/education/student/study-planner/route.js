import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

async function ensurePlannerSchema(sql){
  await sql`
    create table if not exists edu_student_study_tasks (
      id bigserial primary key,
      student_user_id bigint not null references edu_users(id) on delete cascade,
      offering_id bigint null references edu_course_offerings(id) on delete set null,
      title text not null,
      details text null,
      due_at timestamptz null,
      priority text not null default 'medium' check (priority in ('low','medium','high')),
      status text not null default 'pending' check (status in ('pending','completed')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      completed_at timestamptz null
    )
  `;
  await sql`create index if not exists edu_student_study_tasks_student_due_idx on edu_student_study_tasks(student_user_id,status,due_at)`;
}

async function getCourses(sql,studentId){
  return sql`
    select o.id as offering_id,c.code,c.title,o.term
    from edu_enrolments en
    join edu_course_offerings o on o.id=en.offering_id
    join edu_courses c on c.id=o.course_id
    where en.student_user_id=${studentId} and en.status='active'
    order by c.code
  `;
}

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    await ensurePlannerSchema(sql);
    const [tasks,courses]=await Promise.all([
      sql`
        select t.id,t.title,t.details,t.due_at,t.priority,t.status,t.created_at,t.updated_at,t.completed_at,
               t.offering_id,c.code as course_code,c.title as course_title
        from edu_student_study_tasks t
        left join edu_course_offerings o on o.id=t.offering_id
        left join edu_courses c on c.id=o.course_id
        where t.student_user_id=${access.user.id}
        order by case when t.status='pending' then 0 else 1 end,
                 t.due_at asc nulls last,
                 t.created_at desc
        limit 200
      `,
      getCourses(sql,access.user.id)
    ]);
    return NextResponse.json({ok:true,tasks,courses});
  }catch(error){
    console.error('Study planner unavailable:',error);
    return NextResponse.json({ok:false,error:'Unable to load your study planner.'},{status:503});
  }
}

export async function POST(request){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const body=await request.json();
    const action=String(body?.action||'create');
    const sql=getEducationSql();
    await ensurePlannerSchema(sql);

    if(action==='create'){
      const title=String(body?.title||'').trim().slice(0,180);
      const details=String(body?.details||'').trim().slice(0,2000);
      const priority=['low','medium','high'].includes(body?.priority)?body.priority:'medium';
      const dueAt=body?.dueAt?new Date(body.dueAt):null;
      const offeringId=body?.offeringId?Number(body.offeringId):null;
      if(!title)return NextResponse.json({ok:false,error:'Enter a study task title.'},{status:400});
      if(dueAt&&Number.isNaN(dueAt.getTime()))return NextResponse.json({ok:false,error:'Invalid due date.'},{status:400});
      if(offeringId){
        const enrolment=await sql`select 1 from edu_enrolments where student_user_id=${access.user.id} and offering_id=${offeringId} and status='active' limit 1`;
        if(!enrolment.length)return NextResponse.json({ok:false,error:'That course is not in your active enrolments.'},{status:403});
      }
      const rows=await sql`
        insert into edu_student_study_tasks(student_user_id,offering_id,title,details,due_at,priority)
        values(${access.user.id},${offeringId},${title},${details||null},${dueAt?dueAt.toISOString():null},${priority})
        returning id,title,details,due_at,priority,status,created_at
      `;
      await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'student.study_task.create','edu_student_study_tasks',${String(rows[0].id)},${JSON.stringify({priority,offeringId})}::jsonb)`;
      return NextResponse.json({ok:true,task:rows[0]});
    }

    const id=Number(body?.id);
    if(!Number.isInteger(id))return NextResponse.json({ok:false,error:'Invalid study task.'},{status:400});
    const owned=await sql`select id,status from edu_student_study_tasks where id=${id} and student_user_id=${access.user.id} limit 1`;
    if(!owned.length)return NextResponse.json({ok:false,error:'Study task not found.'},{status:404});

    if(action==='toggle'){
      const next=owned[0].status==='completed'?'pending':'completed';
      await sql`update edu_student_study_tasks set status=${next},completed_at=${next==='completed'?new Date().toISOString():null},updated_at=now() where id=${id} and student_user_id=${access.user.id}`;
      return NextResponse.json({ok:true,status:next});
    }
    if(action==='delete'){
      await sql`delete from edu_student_study_tasks where id=${id} and student_user_id=${access.user.id}`;
      return NextResponse.json({ok:true});
    }
    return NextResponse.json({ok:false,error:'Unsupported study planner action.'},{status:400});
  }catch(error){
    console.error('Study planner update failed:',error);
    return NextResponse.json({ok:false,error:'Unable to update your study planner.'},{status:503});
  }
}
