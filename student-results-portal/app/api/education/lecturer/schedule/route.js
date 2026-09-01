import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationAttendanceSchema } from '../../../../../lib/education-attendance';

export const dynamic='force-dynamic';
const clean=(v,max=500)=>String(v??'').trim().slice(0,max);

async function ownedOffering(sql,id,userId){return (await sql`select o.id,c.code,c.title as course_title,cl.name as class_name from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where o.id=${id} and o.lecturer_user_id=${userId} limit 1`)[0];}

export async function GET(){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const sql=getEducationSql();await ensureEducationAttendanceSchema(sql);
    const offerings=await sql`select o.id,c.code,c.title as course_title,cl.name as class_name,o.term from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where o.lecturer_user_id=${access.user.id} order by c.code`;
    const events=await sql`select e.id,e.offering_id,e.title,e.event_type,e.location,e.starts_at,e.ends_at,e.online_url,c.code,c.title as course_title from edu_timetable_events e join edu_course_offerings o on o.id=e.offering_id join edu_courses c on c.id=o.course_id where o.lecturer_user_id=${access.user.id} order by e.starts_at asc`;
    const sessions=await sql`select s.id,s.offering_id,s.title,s.session_date,s.starts_at,s.ends_at,s.status,c.code,c.title as course_title,count(r.id)::int as marked,count(r.id) filter (where r.attendance_status in ('present','late'))::int as present from edu_attendance_sessions s join edu_course_offerings o on o.id=s.offering_id join edu_courses c on c.id=o.course_id left join edu_attendance_records r on r.session_id=s.id where o.lecturer_user_id=${access.user.id} group by s.id,c.code,c.title order by s.session_date desc,s.starts_at desc nulls last`;
    return NextResponse.json({ok:true,offerings,events,sessions});
  }catch(error){console.error('Lecturer schedule unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load lecturer timetable and attendance.'},{status:503});}
}

export async function POST(request){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const b=await request.json(),sql=getEducationSql();await ensureEducationAttendanceSchema(sql);
    if(b.action==='create-event'){
      const offeringId=Number(b.offeringId),offering=await ownedOffering(sql,offeringId,access.user.id);if(!offering)return NextResponse.json({ok:false,error:'Course offering not found.'},{status:404});
      const title=clean(b.title,200),eventType=clean(b.eventType,40)||'class',location=clean(b.location,200),onlineUrl=clean(b.onlineUrl,1000),startsAt=new Date(b.startsAt),endsAt=new Date(b.endsAt);
      if(!title||Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())||endsAt<=startsAt)return NextResponse.json({ok:false,error:'Provide a title and a valid start/end time.'},{status:400});
      const rows=await sql`insert into edu_timetable_events (offering_id,title,event_type,location,starts_at,ends_at,online_url,created_by) values (${offeringId},${title},${eventType},${location||null},${startsAt.toISOString()},${endsAt.toISOString()},${onlineUrl||null},${access.user.id}) returning *`;
      return NextResponse.json({ok:true,event:rows[0]});
    }
    if(b.action==='create-session'){
      const offeringId=Number(b.offeringId),offering=await ownedOffering(sql,offeringId,access.user.id);if(!offering)return NextResponse.json({ok:false,error:'Course offering not found.'},{status:404});
      const title=clean(b.title,200),sessionDate=clean(b.sessionDate,20);if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate))return NextResponse.json({ok:false,error:'Provide a title and session date.'},{status:400});
      const rows=await sql`insert into edu_attendance_sessions (offering_id,title,session_date,created_by) values (${offeringId},${title},${sessionDate},${access.user.id}) returning *`;
      return NextResponse.json({ok:true,session:rows[0]});
    }
    if(b.action==='load-session'){
      const sessionId=Number(b.sessionId);const session=(await sql`select s.* from edu_attendance_sessions s join edu_course_offerings o on o.id=s.offering_id where s.id=${sessionId} and o.lecturer_user_id=${access.user.id} limit 1`)[0];if(!session)return NextResponse.json({ok:false,error:'Attendance session not found.'},{status:404});
      const students=await sql`select u.id,u.full_name,u.email,coalesce(r.attendance_status,'') as attendance_status,coalesce(r.note,'') as note from edu_enrolments en join edu_users u on u.id=en.student_user_id left join edu_attendance_records r on r.session_id=${sessionId} and r.student_user_id=u.id where en.offering_id=${session.offering_id} and en.status='active' order by u.full_name`;
      return NextResponse.json({ok:true,session,students});
    }
    if(b.action==='mark'){
      const sessionId=Number(b.sessionId),studentId=Number(b.studentId),status=clean(b.status,20),note=clean(b.note,500);if(!['present','absent','late','excused'].includes(status))return NextResponse.json({ok:false,error:'Invalid attendance status.'},{status:400});
      const session=(await sql`select s.* from edu_attendance_sessions s join edu_course_offerings o on o.id=s.offering_id where s.id=${sessionId} and o.lecturer_user_id=${access.user.id} limit 1`)[0];if(!session)return NextResponse.json({ok:false,error:'Attendance session not found.'},{status:404});
      const enrolled=(await sql`select 1 from edu_enrolments where offering_id=${session.offering_id} and student_user_id=${studentId} and status='active' limit 1`)[0];if(!enrolled)return NextResponse.json({ok:false,error:'Student is not enrolled in this course.'},{status:400});
      await sql`insert into edu_attendance_records (session_id,student_user_id,attendance_status,note,marked_by) values (${sessionId},${studentId},${status},${note||null},${access.user.id}) on conflict (session_id,student_user_id) do update set attendance_status=excluded.attendance_status,note=excluded.note,marked_by=excluded.marked_by,marked_at=now()`;
      return NextResponse.json({ok:true});
    }
    if(b.action==='publish-session'){
      const sessionId=Number(b.sessionId);const rows=await sql`update edu_attendance_sessions s set status='published',updated_at=now() from edu_course_offerings o where s.id=${sessionId} and o.id=s.offering_id and o.lecturer_user_id=${access.user.id} returning s.id`;if(!rows.length)return NextResponse.json({ok:false,error:'Attendance session not found.'},{status:404});
      return NextResponse.json({ok:true,status:'published'});
    }
    return NextResponse.json({ok:false,error:'Unknown schedule action.'},{status:400});
  }catch(error){console.error('Lecturer schedule save unavailable:',error);return NextResponse.json({ok:false,error:'Unable to save timetable or attendance.'},{status:503});}
}
