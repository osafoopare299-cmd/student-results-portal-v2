import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    const assessments=await sql`select a.id,a.title,a.description,a.assessment_type,a.max_score,a.opens_at,a.closes_at,a.duration_minutes,a.instructions,c.code,c.title as course_title,cl.name as class_name,(select count(*)::int from edu_assessment_questions q where q.assessment_id=a.id) as question_count,t.status as attempt_status,t.score,case when a.status='closed' or (a.closes_at is not null and a.closes_at<=now()) then 'Closed' when a.opens_at is not null and a.opens_at>now() then 'Scheduled' else 'Open' end as availability from edu_enrolments e join edu_course_offerings o on o.id=e.offering_id join edu_assessments a on a.offering_id=o.id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id left join edu_assessment_attempts t on t.assessment_id=a.id and t.student_user_id=e.student_user_id where e.student_user_id=${access.user.id} and e.status='active' and a.status in ('published','closed') order by coalesce(a.opens_at,a.created_at) asc`;
    return NextResponse.json({ok:true,assessments});
  }catch(error){console.error('Student assessments unavailable:',error);return NextResponse.json({ok:false,error:'Assessment database setup is not ready yet.'},{status:503});}
}
