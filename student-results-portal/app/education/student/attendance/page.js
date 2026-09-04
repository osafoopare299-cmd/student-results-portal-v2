import ScheduleHub from '../../schedule-hub';

export const metadata = { title: 'Student Attendance' };

export default function StudentAttendancePage(){
  return <ScheduleHub role="student" mode="attendance"/>;
}
