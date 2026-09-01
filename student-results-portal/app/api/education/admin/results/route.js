import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationResultReleaseSchema } from '../../../../../lib/education-results-schema';

export const dynamic='force-dynamic';

async function guard(){
  if(!(await isAdmin()))return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  return null;
}

export async function GET(){
  const denied=await guard();if(denied)return denied;
  try{
    const sql=getEducationSql();await ensureEducationResultReleaseSchema(sql);
    const rows=await sql`
      select t.id as attempt_id,t.score,t.feedback,t.marked_at,t.released_at,t.released_by,
             u.full_name as student_name,u.email as student_email,
             a.id as assessment_id,a.title as assessment_title,a.assessment_type,a.max_score,
             c.code,c.title as course_title,cl.name as class_name,y.name as academic_year,o.term,
             l.full_name as lecturer_name
      from edu_assessment_attempts t
      join edu_users u on u.id=t.student_user_id
      join edu_assessments a on a.id=t.assessment_id
      join edu_course_offerings o on o.id=a.offering_id
      join edu_courses c on c.id=o.course_id
      join edu_classes cl on cl.id=o.class_id
      join edu_academic_years y on y.id=o.academic_year_id
      left join edu_users l on l.id=o.lecturer_user_id
      where t.status='marked'
      order by coalesce(t.released_at,t.marked_at) desc nulls last,t.id desc
      limit 500
    `;
    return NextResponse.json({ok:true,results:rows});
  }catch(error){console.error('Admin education results unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load Education results publication queue.'},{status:503});}
}

export async function POST(request){
  const denied=await guard();if(denied)return denied;
  try{
    const b=await request.json(),attemptId=Number(b.attemptId),sql=getEducationSql();await ensureEducationResultReleaseSchema(sql);
    if(!Number.isFinite(attemptId))return NextResponse.json({ok:false,error:'A valid result is required.'},{status:400});
    const attempt=(await sql`select id,status,released_at,assessment_id from edu_assessment_attempts where id=${attemptId} limit 1`)[0];
    if(!attempt||attempt.status!=='marked')return NextResponse.json({ok:false,error:'Finalized result not found.'},{status:404});
    if(b.action==='release'){
      await sql`update edu_assessment_attempts set released_at=coalesce(released_at,now()) where id=${attemptId}`;
      await sql`insert into edu_audit_logs (action,entity_type,entity_id,metadata) values ('assessment_result_released_by_admin','edu_assessment_attempt',${String(attemptId)},${JSON.stringify({assessmentId:String(attempt.assessment_id),source:'education_admin'})}::jsonb)`;
      return NextResponse.json({ok:true,released:true});
    }
    if(b.action==='withdraw-release'){
      await sql`update edu_assessment_attempts set released_at=null,released_by=null where id=${attemptId}`;
      await sql`insert into edu_audit_logs (action,entity_type,entity_id,metadata) values ('assessment_result_release_withdrawn_by_admin','edu_assessment_attempt',${String(attemptId)},${JSON.stringify({assessmentId:String(attempt.assessment_id),source:'education_admin'})}::jsonb)`;
      return NextResponse.json({ok:true,released:false});
    }
    return NextResponse.json({ok:false,error:'Unknown publication action.'},{status:400});
  }catch(error){console.error('Admin education result publication unavailable:',error);return NextResponse.json({ok:false,error:'Unable to update Education result publication.'},{status:503});}
}
