import ScheduleHub from '../../schedule-hub';

export const metadata = { title: 'Lecturer Attendance' };

export default function LecturerAttendancePage(){
  return <ScheduleHub role="lecturer" mode="attendance"/>;
}
