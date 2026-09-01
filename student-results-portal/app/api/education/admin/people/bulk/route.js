import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../../lib/db';

export const dynamic='force-dynamic';
const clean=(v,max=180)=>String(v||'').trim().slice(0,max);
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(request){
 if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
 try{
  const body=await request.json();
  const rows=Array.isArray(body.rows)?body.rows:[];
  const classId=body.classId||null;
  if(!rows.length) return NextResponse.json({ok:false,error:'No student records were supplied.'},{status:400});
  if(rows.length>1000) return NextResponse.json({ok:false,error:'Import a maximum of 1,000 students at a time.'},{status:400});
  const sql=getEducationSql();
  if(classId){
   const classRows=await sql`select id from edu_classes where id=${classId} limit 1`;
   if(!classRows.length) return NextResponse.json({ok:false,error:'Selected class was not found.'},{status:404});
  }
  let saved=0,skipped=0; const errors=[];
  for(let i=0;i<rows.length;i++){
   const item=rows[i]||{}; const fullName=clean(item.fullName||item.full_name||item.name); const email=clean(item.email).toLowerCase(); const studentNumber=clean(item.studentNumber||item.student_number,80)||null;
   if(fullName.length<2||!validEmail(email)){skipped++;errors.push(`Row ${i+1}: name or email is invalid.`);continue;}
   try{
    const existing=await sql`select id,role from edu_users where lower(email)=lower(${email}) limit 1`;
    if(existing?.[0] && existing[0].role!=='student'){
      skipped++; errors.push(`Row ${i+1}: email already belongs to an Education ${existing[0].role}.`); continue;
    }
    const users=await sql`insert into edu_users (full_name,email,role,status) values (${fullName},${email},'student','active') on conflict ((lower(email))) do update set full_name=excluded.full_name,status='active',updated_at=now() returning id`;
    const userId=users[0].id;
    await sql`insert into edu_student_profiles (user_id,student_number,class_id) values (${userId},${studentNumber},${classId}) on conflict (user_id) do update set student_number=coalesce(excluded.student_number,edu_student_profiles.student_number),class_id=coalesce(excluded.class_id,edu_student_profiles.class_id)`;
    saved++;
   }catch(error){skipped++;errors.push(`Row ${i+1}: ${error?.message?.includes('student_number')?'student number already exists':'could not be imported'}.`);}
  }
  await sql`insert into edu_audit_logs(action,entity_type,metadata) values('admin_student_bulk_import','student_import',${JSON.stringify({source:'education_admin',saved,skipped,classId:classId||null,total:rows.length})}::jsonb)`;
  return NextResponse.json({ok:true,saved,skipped,errors:errors.slice(0,20)});
 }catch(error){console.error('Bulk student import unavailable:',error);return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});}
}
