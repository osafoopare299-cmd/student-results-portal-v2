import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    const announcements=await sql`
      select distinct a.id,a.title,a.body,a.published_at,a.created_at,c.code,c.title as course_title,u.full_name as author_name
      from edu_announcements a
      join edu_users u on u.id=a.author_user_id
      left join edu_course_offerings o on o.id=a.offering_id
      left join edu_courses c on c.id=o.course_id
      left join edu_enrolments en on en.offering_id=a.offering_id and en.student_user_id=${access.user.id} and en.status='active'
      left join edu_student_profiles sp on sp.user_id=${access.user.id}
      where a.published_at is not null and (en.id is not null or (a.class_id is not null and a.class_id=sp.class_id))
      order by a.published_at desc
      limit 100
    `;
    return NextResponse.json({ok:true,announcements});
  }catch(error){console.error('Student notifications unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load announcements.'},{status:503});}
}
