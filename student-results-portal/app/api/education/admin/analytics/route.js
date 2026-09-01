import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationAttendanceSchema } from '../../../../../lib/education-attendance';
import { ensureEducationResultReleaseSchema } from '../../../../../lib/education-results-schema';

export const dynamic='force-dynamic';
const n=v=>Number(v||0);

export async function GET(){
  if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try{
    const sql=getEducationSql();
    await Promise.all([ensureEducationAttendanceSchema(sql),ensureEducationResultReleaseSchema(sql)]);
    const [people,enrolments,materials,assessments,attempts,attendance,recentActivity,coursePerformance]=await Promise.all([
      sql`select count(*) filter (where role='student' and status='active')::int as students,count(*) filter (where role='lecturer' and status='active')::int as lecturers,count(*) filter (where role='admin' and status='active')::int as admins from edu_users`,
      sql`select count(*) filter (where status='active')::int as active,count(distinct student_user_id) filter (where status='active')::int as enrolled_students,count(distinct offering_id) filter (where status='active')::int as active_offerings from edu_enrolments`,
      sql`select count(*)::int as total,count(*) filter (where published_at is not null)::int as published,count(*) filter (where is_ai_approved=true and published_at is not null)::int as ai_approved,count(*) filter (where is_offline_available=true and published_at is not null)::int as offline_ready from edu_learning_materials`,
      sql`select count(*)::int as total,count(*) filter (where status='published')::int as published,count(*) filter (where status='draft')::int as drafts,count(*) filter (where status='closed')::int as closed from edu_assessments`,
      sql`select count(*) filter (where status='started')::int as started,count(*) filter (where status='submitted')::int as submitted,count(*) filter (where status='marked')::int as marked,count(*) filter (where status='marked' and released_at is not null)::int as released,count(*) filter (where status='marked' and released_at>=now()-interval '30 days')::int as released_30d from edu_assessment_attempts`,
      sql`select count(*) filter (where s.status='published')::int as sessions,count(r.id)::int as records,count(r.id) filter (where r.attendance_status in ('present','late'))::int as attended from edu_attendance_sessions s left join edu_attendance_records r on r.session_id=s.id`,
      sql`select action,entity_type,entity_id,created_at from edu_audit_logs order by created_at desc limit 15`,
      sql`select c.code,c.title,count(t.id)::int as released_results,round(avg(case when a.max_score>0 then (t.score/a.max_score)*100 end)::numeric,2) as average_percentage from edu_assessment_attempts t join edu_assessments a on a.id=t.assessment_id join edu_course_offerings o on o.id=a.offering_id join edu_courses c on c.id=o.course_id where t.status='marked' and t.released_at is not null group by c.id,c.code,c.title order by released_results desc,c.code limit 12`
    ]);
    const p=people[0]||{},e=enrolments[0]||{},m=materials[0]||{},a=assessments[0]||{},t=attempts[0]||{},att=attendance[0]||{};
    const attendanceRate=n(att.records)>0?Math.round((n(att.attended)/n(att.records))*10000)/100:0;
    return NextResponse.json({ok:true,summary:{students:n(p.students),lecturers:n(p.lecturers),admins:n(p.admins),activeEnrolments:n(e.active),enrolledStudents:n(e.enrolled_students),activeOfferings:n(e.active_offerings),materials:n(m.total),publishedMaterials:n(m.published),aiApprovedMaterials:n(m.ai_approved),offlineMaterials:n(m.offline_ready),assessments:n(a.total),publishedAssessments:n(a.published),draftAssessments:n(a.drafts),closedAssessments:n(a.closed),startedAttempts:n(t.started),submittedAttempts:n(t.submitted),markedAttempts:n(t.marked),releasedResults:n(t.released),releasedLast30Days:n(t.released_30d),attendanceSessions:n(att.sessions),attendanceRecords:n(att.records),attendanceRate},coursePerformance,recentActivity});
  }catch(error){
    console.error('Education admin analytics unavailable:',error);
    return NextResponse.json({ok:false,error:'Unable to load Education platform analytics.'},{status:503});
  }
}
