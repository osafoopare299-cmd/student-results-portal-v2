import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';
import { del } from '@vercel/blob';
import { educationBlobConfigured } from '../../../../../lib/education-material-files';

function clean(value, max=180) { return String(value || '').trim().slice(0, max); }
function validEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try {
    const sql = getEducationSql();
    const rows = await sql`
      select u.id, u.full_name, u.email, u.role, u.status,
             sp.student_number, sp.class_id, c.name as class_name,
             lp.staff_number, lp.department, lp.title
      from edu_users u
      left join edu_student_profiles sp on sp.user_id = u.id
      left join edu_classes c on c.id = sp.class_id
      left join edu_lecturer_profiles lp on lp.user_id = u.id
      order by u.role, lower(u.full_name)
      limit 500
    `;
    const classes = await sql`select c.id,c.name,c.code,y.name as academic_year from edu_classes c join edu_academic_years y on y.id=c.academic_year_id order by y.name desc,c.name`;
    return NextResponse.json({ok:true,people:rows,classes});
  } catch (error) {
    console.error('Education people list unavailable:', error);
    return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});
  }
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try {
    const body = await request.json();
    const fullName = clean(body.fullName);
    const email = clean(body.email).toLowerCase();
    const role = clean(body.role,20);
    const status = clean(body.status || 'active',20);
    if (fullName.length < 2 || !validEmail(email) || !['student','lecturer','admin'].includes(role) || !['active','inactive','suspended'].includes(status)) return NextResponse.json({ok:false,error:'Please provide a valid name, email, role and status.'},{status:400});
    const sql = getEducationSql();
    const previous = await sql`select id,role,status from edu_users where lower(email)=lower(${email}) limit 1`;
    const rows = await sql`insert into edu_users (full_name,email,role,status) values (${fullName},${email},${role},${status}) on conflict ((lower(email))) do update set full_name=excluded.full_name,role=excluded.role,status=excluded.status,updated_at=now() returning id,full_name,email,role,status`;
    const user=rows?.[0];
    if(!user) return NextResponse.json({ok:false,error:'Unable to save Education user.'},{status:503});
    await sql`insert into edu_audit_logs(action,entity_type,entity_id,metadata) values('admin_education_user_saved','user',${String(user.id)},${JSON.stringify({source:'education_admin',email:user.email,role:user.role,status:user.status,previousRole:previous?.[0]?.role||null,previousStatus:previous?.[0]?.status||null})}::jsonb)`;
    return NextResponse.json({ok:true,user});
  } catch (error) {
    console.error('Education person save unavailable:', error);
    return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});
  }
}

export async function DELETE(request) {
  if (!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try {
    const id=Number(new URL(request.url).searchParams.get('id'));
    if(!id) return NextResponse.json({ok:false,error:'Education user is required.'},{status:400});
    const sql=getEducationSql();
    const person=(await sql`select id,full_name,email,role from edu_users where id=${id} limit 1`)[0];
    if(!person) return NextResponse.json({ok:false,error:'Education user not found.'},{status:404});
    const files=await sql`select blob_pathname from edu_learning_materials where created_by=${id} and blob_pathname is not null`;
    const optional=await sql`select table_name from information_schema.tables where table_schema='public' and table_name in ('edu_attendance_sessions','edu_attendance_records')`;
    const tables=new Set(optional.map(row=>row.table_name));
    if(tables.has('edu_attendance_records'))await sql`update edu_attendance_records set marked_by=null where marked_by=${id}`;
    if(tables.has('edu_attendance_sessions'))await sql`delete from edu_attendance_sessions where created_by=${id}`;
    const releaseColumn=await sql`select 1 from information_schema.columns where table_schema='public' and table_name='edu_assessment_attempts' and column_name='released_by' limit 1`;
    if(releaseColumn.length)await sql`update edu_assessment_attempts set released_by=null where released_by=${id}`;
    await sql`update edu_assessment_attempts set marked_by=null where marked_by=${id}`;
    await sql`update edu_course_offerings set lecturer_user_id=null where lecturer_user_id=${id}`;
    await sql`update edu_timetable_events set created_by=null where created_by=${id}`;
    await sql`update edu_announcements set author_user_id=null where author_user_id=${id}`;
    await sql`update edu_audit_logs set actor_user_id=null where actor_user_id=${id}`;
    await sql`delete from edu_learning_materials where created_by=${id}`;
    await sql`delete from edu_assessments where created_by=${id}`;
    await sql`delete from edu_users where id=${id}`;
    await sql`insert into edu_audit_logs(action,entity_type,entity_id,metadata) values('admin_education_user_deleted','user',${String(id)},${JSON.stringify({fullName:person.full_name,email:person.email,role:person.role})}::jsonb)`;
    if(educationBlobConfigured()&&files.length)await Promise.allSettled(files.map(file=>del(file.blob_pathname)));
    return NextResponse.json({ok:true,removed:person});
  } catch (error) {
    console.error('Education person delete unavailable:', error);
    return NextResponse.json({ok:false,error:'Unable to remove this person and their related entries.'},{status:503});
  }
}
