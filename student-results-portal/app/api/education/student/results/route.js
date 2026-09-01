import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    const results=await sql`select t.id as attempt_id,t.score,t.feedback,t.marked_at,a.id as assessment_id,a.title,a.assessment_type,a.max_score,c.code,c.title as course_title,cl.name as class_name,y.name as academic_year,o.term from edu_assessment_attempts t join edu_assessments a on a.id=t.assessment_id join edu_course_offerings o on o.id=a.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id where t.student_user_id=${access.user.id} and t.status='marked' order by t.marked_at desc nulls last,t.submitted_at desc`;
    return NextResponse.json({ok:true,student:{id:access.user.id,email:access.user.email,fullName:access.user.full_name||access.user.fullName||access.user.email},results});
  }catch(error){console.error('Education student results unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load Education assessment results.'},{status:503});}
}
