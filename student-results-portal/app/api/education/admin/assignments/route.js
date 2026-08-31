import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';
async function guard(){ if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401}); return null; }

export async function GET(){
 const denied=await guard(); if(denied) return denied;
 try{
  const sql=getSql();
  const students=await sql`select u.id,u.full_name,u.email,p.student_number,p.class_id from edu_users u left join edu_student_profiles p on p.user_id=u.id where u.role='student' and u.status='active' order by u.full_name`;
  const lecturers=await sql`select id,full_name,email from edu_users where role='lecturer' and status='active' order by full_name`;
  const offerings=await sql`select o.id,o.term,o.lecturer_user_id,c.code,c.title,cl.name as class_name,y.name as academic_year from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id order by y.name desc,c.code,cl.name`;
  const enrolments=await sql`select e.id,e.student_user_id,e.offering_id,e.status,u.full_name,c.code,c.title,cl.name as class_name from edu_enrolments e join edu_users u on u.id=e.student_user_id join edu_course_offerings o on o.id=e.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id order by u.full_name,c.code`;
  return NextResponse.json({ok:true,students,lecturers,offerings,enrolments});
 }catch(error){console.error(error);return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});}
}

export async function POST(request){
 const denied=await guard(); if(denied) return denied;
 try{
  const body=await request.json(); const sql=getSql();
  if(body.action==='assign-lecturer'){
   if(!body.offeringId) return NextResponse.json({ok:false,error:'Course offering is required.'},{status:400});
   await sql`update edu_course_offerings set lecturer_user_id=${body.lecturerId||null} where id=${body.offeringId}`;
   return NextResponse.json({ok:true});
  }
  if(body.action==='enrol-student'){
   if(!body.studentId||!body.offeringId) return NextResponse.json({ok:false,error:'Student and course offering are required.'},{status:400});
   await sql`insert into edu_enrolments (student_user_id,offering_id,status) values (${body.studentId},${body.offeringId},'active') on conflict (student_user_id,offering_id) do update set status='active'`;
   return NextResponse.json({ok:true});
  }
  if(body.action==='assign-class'){
   if(!body.studentId) return NextResponse.json({ok:false,error:'Student is required.'},{status:400});
   await sql`insert into edu_student_profiles (user_id,class_id) values (${body.studentId},${body.classId||null}) on conflict (user_id) do update set class_id=excluded.class_id`;
   return NextResponse.json({ok:true});
  }
  return NextResponse.json({ok:false,error:'Unknown assignment action.'},{status:400});
 }catch(error){console.error(error);return NextResponse.json({ok:false,error:'Unable to save assignment.'},{status:503});}
}
