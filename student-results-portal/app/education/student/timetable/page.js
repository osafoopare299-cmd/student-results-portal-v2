import ScheduleHub from '../../schedule-hub';

export const metadata = { title: 'Student Timetable' };

export default function StudentTimetablePage(){
  return <ScheduleHub role="student" mode="timetable"/>;
}
