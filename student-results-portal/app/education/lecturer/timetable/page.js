import ScheduleHub from '../../schedule-hub';

export const metadata = { title: 'Lecturer Timetable' };

export default function LecturerTimetablePage(){
  return <ScheduleHub role="lecturer" mode="timetable"/>;
}
