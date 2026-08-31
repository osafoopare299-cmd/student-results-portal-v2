import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

async function guard(){
  if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  return null;
}

export async function GET(){
  const denied=await guard(); if(denied) return denied;
  try{
    const sql=getSql();
    const [courses,classes,years,lecturers,offerings]=await Promise.all([
      sql`select id,code,title from edu_courses where active=true order by code`,
      sql`select id,name,code,level,academic_year_id from edu_classes order by name`,
      sql`select id,name,is_active from edu_academic_years order by starts_on desc nulls last,name desc`,
      sql`select id,full_name,email from edu_users where role='lecturer' and status='active' order by full_name`,
      sql`select o.id,o.term,o.course_id,o.class_id,o.academic_year_id,o.lecturer_user_id,
                 c.code,c.title,cl.name as class_name,cl.code as class_code,y.name as academic_year,
                 u.full_name as lecturer_name
          from edu_course_offerings o
          join edu_courses c on c.id=o.course_id
          join edu_classes cl on cl.id=o.class_id
          join edu_academic_years y on y.id=o.academic_year_id
          left join edu_users u on u.id=o.lecturer_user_id
          order by y.name desc,c.code,cl.name,o.term nulls first`
    ]);
    return NextResponse.json({ok:true,courses,classes,years,lecturers,offerings});
  }catch(error){
    console.error('Education offering list unavailable:',error);
    return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});
  }
}

export async function POST(request){
  const denied=await guard(); if(denied) return denied;
  try{
    const body=await request.json();
    const courseId=body.courseId||null,classId=body.classId||null,academicYearId=body.academicYearId||null;
    const lecturerId=body.lecturerId||null,term=String(body.term||'').trim()||null;
    if(!courseId||!classId||!academicYearId) return NextResponse.json({ok:false,error:'Course, class and academic year are required.'},{status:400});
    const sql=getSql();
    const rows=await sql`
      insert into edu_course_offerings (course_id,class_id,academic_year_id,lecturer_user_id,term)
      values (${courseId},${classId},${academicYearId},${lecturerId},${term})
      on conflict (course_id,class_id,academic_year_id,term)
      do update set lecturer_user_id=excluded.lecturer_user_id
      returning id,course_id,class_id,academic_year_id,lecturer_user_id,term
    `;
    return NextResponse.json({ok:true,offering:rows[0]});
  }catch(error){
    console.error('Education offering save unavailable:',error);
    return NextResponse.json({ok:false,error:'Unable to save course offering.'},{status:503});
  }
}
