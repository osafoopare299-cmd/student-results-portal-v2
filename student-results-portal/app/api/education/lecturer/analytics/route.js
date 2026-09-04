import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationAttendanceSchema } from '../../../../../lib/education-attendance';
import { ensureEducationResultReleaseSchema } from '../../../../../lib/education-results-schema';
import { applyEducationGrade,getEducationGradingBands } from '../../../../../lib/education-grading';

export const dynamic='force-dynamic';
const n=v=>Number(v||0);

export async function GET(){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const sql=getEducationSql();
    await Promise.all([ensureEducationAttendanceSchema(sql),ensureEducationResultReleaseSchema(sql)]);
    const [offerings,learnerStats,assessmentStats,attemptStats,attendance,releasedRows,bands]=await Promise.all([
      sql`select o.id,c.code,c.title,cl.name as class_name,o.term,count(distinct e.student_user_id) filter (where e.status='active')::int as students from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id left join edu_enrolments e on e.offering_id=o.id where o.lecturer_user_id=${access.user.id} group by o.id,c.code,c.title,cl.name,o.term order by c.code,cl.name`,
      sql`select count(distinct e.student_user_id) filter (where e.status='active')::int as students,count(*) filter (where e.status='active')::int as enrolments from edu_enrolments e join edu_course_offerings o on o.id=e.offering_id where o.lecturer_user_id=${access.user.id}`,
      sql`select count(*)::int as total,count(*) filter (where a.status='draft')::int as drafts,count(*) filter (where a.status='published')::int as published,count(*) filter (where a.status='closed')::int as closed from edu_assessments a join edu_course_offerings o on o.id=a.offering_id where o.lecturer_user_id=${access.user.id}`,
      sql`select count(*) filter (where t.status='submitted')::int as submitted,count(*) filter (where t.status='marked')::int as marked,count(*) filter (where t.status='marked' and t.released_at is not null)::int as released from edu_assessment_attempts t join edu_assessments a on a.id=t.assessment_id join edu_course_offerings o on o.id=a.offering_id where o.lecturer_user_id=${access.user.id}`,
      sql`select count(distinct s.id) filter (where s.status='published')::int as sessions,count(r.id)::int as records,count(r.id) filter (where r.attendance_status in ('present','late'))::int as attended from edu_attendance_sessions s join edu_course_offerings o on o.id=s.offering_id left join edu_attendance_records r on r.session_id=s.id where o.lecturer_user_id=${access.user.id}`,
      sql`select o.id as offering_id,c.code,c.title,cl.name as class_name,t.score,a.max_score from edu_assessment_attempts t join edu_assessments a on a.id=t.assessment_id join edu_course_offerings o on o.id=a.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where o.lecturer_user_id=${access.user.id} and t.status='marked' and t.released_at is not null limit 2000`,
      getEducationGradingBands(sql)
    ]);
    const grouped=new Map();
    for(const row of releasedRows){
      const percentage=n(row.max_score)>0?(n(row.score)/n(row.max_score))*100:0;
      const grading=applyEducationGrade(percentage,bands);
      const key=String(row.offering_id);
      const item=grouped.get(key)||{offeringId:row.offering_id,code:row.code,title:row.title,className:row.class_name,count:0,total:0,pass:0,review:0};
      item.count++;item.total+=percentage;if(grading.outcome==='PASS')item.pass++;else item.review++;grouped.set(key,item);
    }
    const coursePerformance=[...grouped.values()].map(x=>({...x,average:Math.round((x.total/x.count)*100)/100,passRate:x.count?Math.round((x.pass/x.count)*10000)/100:0})).sort((a,b)=>b.count-a.count||a.code.localeCompare(b.code));
    const l=learnerStats[0]||{},a=assessmentStats[0]||{},t=attemptStats[0]||{},att=attendance[0]||{};
    const attendanceRate=n(att.records)>0?Math.round((n(att.attended)/n(att.records))*10000)/100:0;
    return NextResponse.json({ok:true,summary:{offerings:offerings.length,students:n(l.students),enrolledStudents:n(l.enrolments),assessments:n(a.total),draftAssessments:n(a.drafts),publishedAssessments:n(a.published),closedAssessments:n(a.closed),markingBacklog:n(t.submitted),marked:n(t.marked),released:n(t.released),attendanceSessions:n(att.sessions),attendanceRate},offerings,coursePerformance});
  }catch(error){console.error('Lecturer analytics unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load lecturer analytics.'},{status:503});}
}
