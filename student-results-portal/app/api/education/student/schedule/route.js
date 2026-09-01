import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationAttendanceSchema } from '../../../../../lib/education-attendance';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    await ensureEducationAttendanceSchema(sql);
    const events=await sql`
      select e.id,e.title,e.event_type,e.location,e.starts_at,e.ends_at,e.online_url,c.code,c.title as course_title
      from edu_timetable_events e
      join edu_course_offerings o on o.id=e.offering_id
      join edu_courses c on c.id=o.course_id
      join edu_enrolments en on en.offering_id=o.id
      where en.student_user_id=${access.user.id} and en.status='active'
      order by e.starts_at asc
    `;
    const attendance=await sql`
      select c.code,c.title as course_title,
        count(s.id) filter (where s.status='published')::int as sessions,
        count(r.id) filter (where s.status='published' and r.attendance_status in ('present','late'))::int as attended,
        count(r.id) filter (where s.status='published' and r.attendance_status='absent')::int as absent
      from edu_enrolments en
      join edu_course_offerings o on o.id=en.offering_id
      join edu_courses c on c.id=o.course_id
      left join edu_attendance_sessions s on s.offering_id=o.id
      left join edu_attendance_records r on r.session_id=s.id and r.student_user_id=${access.user.id}
      where en.student_user_id=${access.user.id} and en.status='active'
      group by c.code,c.title
      order by c.code
    `;
    const rows=attendance.map(x=>{const sessions=Number(x.sessions||0),attended=Number(x.attended||0);return {...x,sessions,attended,absent:Number(x.absent||0),rate:sessions?Math.round(attended/sessions*100):0};});
    const total=rows.reduce((a,x)=>a+x.sessions,0),present=rows.reduce((a,x)=>a+x.attended,0);
    return NextResponse.json({ok:true,events,attendance:rows,summary:{sessions:total,present,rate:total?Math.round(present/total*100):0}});
  }catch(error){console.error('Student schedule unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load timetable and attendance.'},{status:503});}
}
