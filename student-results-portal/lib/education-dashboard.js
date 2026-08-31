import { getEducationSql } from './db';

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getStudentDashboard(userId) {
  const sql = getEducationSql();
  const [profileRows, courseRows, eventRows, announcementRows] = await Promise.all([
    sql`select sp.student_number,c.name as class_name,c.code as class_code,c.level,ay.name as academic_year from edu_student_profiles sp left join edu_classes c on c.id=sp.class_id left join edu_academic_years ay on ay.id=c.academic_year_id where sp.user_id=${userId} limit 1`,
    sql`select count(*)::int as course_count from edu_enrolments e where e.student_user_id=${userId} and e.status='active'`,
    sql`select count(*)::int as upcoming_count from edu_timetable_events te join edu_enrolments e on e.offering_id=te.offering_id where e.student_user_id=${userId} and e.status='active' and te.starts_at>=now() and te.starts_at<now()+interval '14 days'`,
    sql`select count(distinct a.id)::int as announcement_count from edu_announcements a left join edu_enrolments e on e.offering_id=a.offering_id left join edu_student_profiles sp on sp.class_id=a.class_id and sp.user_id=${userId} where a.published_at is not null and ((e.student_user_id=${userId} and e.status='active') or sp.user_id=${userId})`,
  ]);
  const profile=profileRows?.[0]||{};
  return {academicYear:profile.academic_year||'Not assigned',profile:{studentNumber:profile.student_number||'Not assigned',className:profile.class_name||'Not assigned',classCode:profile.class_code||'',level:profile.level||''},stats:[['Courses',String(safeNumber(courseRows?.[0]?.course_count))],['Upcoming',String(safeNumber(eventRows?.[0]?.upcoming_count))],['Announcements',String(safeNumber(announcementRows?.[0]?.announcement_count))],['Profile',profile.student_number?'Complete':'Pending']]};
}

export async function getLecturerDashboard(userId) {
  const sql=getEducationSql();
  const [profileRows,offeringRows,studentRows,eventRows,yearRows]=await Promise.all([
    sql`select staff_number,department,title from edu_lecturer_profiles where user_id=${userId} limit 1`,
    sql`select count(*)::int as offering_count from edu_course_offerings where lecturer_user_id=${userId}`,
    sql`select count(distinct e.student_user_id)::int as student_count from edu_course_offerings o join edu_enrolments e on e.offering_id=o.id and e.status='active' where o.lecturer_user_id=${userId}`,
    sql`select count(*)::int as upcoming_count from edu_timetable_events te join edu_course_offerings o on o.id=te.offering_id where o.lecturer_user_id=${userId} and te.starts_at>=now() and te.starts_at<now()+interval '14 days'`,
    sql`select name from edu_academic_years where is_active=true order by starts_on desc nulls last limit 1`,
  ]);
  const profile=profileRows?.[0]||{};
  return {academicYear:yearRows?.[0]?.name||'Not assigned',profile:{staffNumber:profile.staff_number||'Not assigned',department:profile.department||'Not assigned',title:profile.title||''},stats:[['Courses',String(safeNumber(offeringRows?.[0]?.offering_count))],['Students',String(safeNumber(studentRows?.[0]?.student_count))],['Upcoming',String(safeNumber(eventRows?.[0]?.upcoming_count))],['Profile',profile.staff_number?'Complete':'Pending']]};
}

export async function getAdminDashboard() {
  const sql=getEducationSql();
  const [studentRows,lecturerRows,courseRows,yearRows]=await Promise.all([
    sql`select count(*)::int as total from edu_users where role='student' and status='active'`,
    sql`select count(*)::int as total from edu_users where role='lecturer' and status='active'`,
    sql`select count(*)::int as total from edu_courses where active=true`,
    sql`select name from edu_academic_years where is_active=true order by starts_on desc nulls last limit 1`,
  ]);
  const academicYear=yearRows?.[0]?.name||'Not assigned';
  return {academicYear,stats:[['Students',String(safeNumber(studentRows?.[0]?.total))],['Lecturers',String(safeNumber(lecturerRows?.[0]?.total))],['Courses',String(safeNumber(courseRows?.[0]?.total))],['Academic year',academicYear]]};
}
