import Workspace from '../workspace';
import { getEducationUser } from '../../../lib/education-session';
import { getStudentDashboard } from '../../../lib/education-dashboard';

export const metadata = { title: 'Student Portal | Dropare Education' };
export const dynamic = 'force-dynamic';

export default async function StudentPortal(){
  const access = await getEducationUser('student');
  const dashboard = access.ok ? await getStudentDashboard(access.user.id) : null;
  return <Workspace role="student" user={access.user || null} dashboard={dashboard}/>;
}
