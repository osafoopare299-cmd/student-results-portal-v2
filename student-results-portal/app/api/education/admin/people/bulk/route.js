import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../../lib/db';

export const dynamic='force-dynamic';
const clean=(v,max=180)=>String(v||'').trim().slice(0,max);

export async function POST(request){
 if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
 try{
  const body=await request.json();
  const rows=Array.isArray(body.rows)?body.rows:[];
  const classId=body.classId||null;
  if(!rows.length) return NextResponse.json({ok:false,error:'No student records were supplied.'},{status:400});
  if(rows.length>1000) return NextResponse.json({ok:false,error:'Import a maximum of 1,000 students at a time.'},{status:400});
  const sql=getEducationSql(); let saved=0,skipped=0; const errors=[];
  for(let i=0;i<rows.length;i++){
   const item=rows[i]||{}; const fullName=clean(item.fullName||item.full_name||item.name); const email=clean(item.email).toLowerCase(); const studentNumber=clean(item.studentNumber||item.student_number,80)||null;
   if(!fullName||!email||!email.includes('@')){skipped++;errors.push(`Row ${i+1}: name or email is invalid.`);continue;}
   try{
    const users=await sql`insert into edu_users (full_name,email,role,status) values (${fullName},${email},'student','active') on conflict ((lower(email))) do update set full_name=excluded.full_name,role='student',status='active',updated_at=now() returning id`;
    const userId=users[0].id;
    await sql`insert into edu_student_profiles (user_id,student_number,class_id) values (${userId},${studentNumber},${classId}) on conflict (user_id) do update set student_number=coalesce(excluded.student_number,edu_student_profiles.student_number),class_id=coalesce(excluded.class_id,edu_student_profiles.class_id)`;
    saved++;
   }catch(error){skipped++;errors.push(`Row ${i+1}: ${error?.message?.includes('student_number')?'student number already exists':'could not be imported'}.`);}
  }
  return NextResponse.json({ok:true,saved,skipped,errors:errors.slice(0,20)});
 }catch(error){console.error('Bulk student import unavailable:',error);return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});}
}
