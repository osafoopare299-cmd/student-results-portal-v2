import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    const rows=await sql`
      select u.id,u.email,u.full_name,u.status,
        p.student_number,p.phone,p.profile_photo_url,
        cl.id as class_id,cl.name as class_name,cl.code as class_code,cl.level,
        ay.name as academic_year
      from edu_users u
      left join edu_student_profiles p on p.user_id=u.id
      left join edu_classes cl on cl.id=p.class_id
      left join edu_academic_years ay on ay.id=cl.academic_year_id
      where u.id=${access.user.id}
      limit 1
    `;
    const profile=rows?.[0];
    if(!profile)return NextResponse.json({ok:false,error:'Student profile not found.'},{status:404});
    const courses=await sql`
      select c.code,c.title,o.term,ay.name as academic_year
      from edu_enrolments en
      join edu_course_offerings o on o.id=en.offering_id
      join edu_courses c on c.id=o.course_id
      left join edu_academic_years ay on ay.id=o.academic_year_id
      where en.student_user_id=${access.user.id} and en.status='active'
      order by c.code
    `;
    return NextResponse.json({ok:true,profile,courses});
  }catch(error){
    console.error('Student profile unavailable:',error);
    return NextResponse.json({ok:false,error:'Unable to load your education profile.'},{status:503});
  }
}

export async function PATCH(request){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const body=await request.json();
    const phone=String(body?.phone||'').trim();
    if(phone.length>40)return NextResponse.json({ok:false,error:'Phone number is too long.'},{status:400});
    const sql=getEducationSql();
    await sql`
      insert into edu_student_profiles (user_id,phone)
      values (${access.user.id},${phone||null})
      on conflict (user_id) do update set phone=excluded.phone
    `;
    await sql`
      insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata)
      values (${access.user.id},'student.profile.update','edu_student_profiles',${String(access.user.id)},${JSON.stringify({phoneUpdated:true})}::jsonb)
    `;
    return NextResponse.json({ok:true,phone:phone||null});
  }catch(error){
    console.error('Student profile update failed:',error);
    return NextResponse.json({ok:false,error:'Unable to update your profile.'},{status:503});
  }
}
