import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getSql } from '../../../../../lib/db';

function clean(value, max=180) { return String(value || '').trim().slice(0, max); }

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try {
    const sql = getSql();
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
    if (!fullName || !email || !['student','lecturer','admin'].includes(role) || !['active','inactive','suspended'].includes(status)) return NextResponse.json({ok:false,error:'Please provide a valid name, email, role and status.'},{status:400});
    const sql = getSql();
    const rows = await sql`insert into edu_users (full_name,email,role,status) values (${fullName},${email},${role},${status}) on conflict ((lower(email))) do update set full_name=excluded.full_name,role=excluded.role,status=excluded.status,updated_at=now() returning id,full_name,email,role,status`;
    return NextResponse.json({ok:true,user:rows?.[0]});
  } catch (error) {
    console.error('Education person save unavailable:', error);
    return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});
  }
}
