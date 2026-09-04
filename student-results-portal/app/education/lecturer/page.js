import Workspace from '../workspace';
import { getEducationUser } from '../../../lib/education-session';
import { getLecturerDashboard } from '../../../lib/education-dashboard';

export const metadata = { title: 'Lecturer Portal | Dropare Education' };
export const dynamic = 'force-dynamic';

export default async function LecturerPortal(){
  const access = await getEducationUser('lecturer');
  const dashboard = access.ok ? await getLecturerDashboard(access.user.id) : null;
  return <Workspace role="lecturer" user={access.user || null} dashboard={dashboard}/>;
}
