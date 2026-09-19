import EducationAccessGate from '../access-gate';
import { getEducationUser } from '../../../lib/education-session';

export const dynamic = 'force-dynamic';

export default async function LecturerEducationLayout({ children }) {
  const access = await getEducationUser('lecturer');

  if (!access.ok) {
    return <EducationAccessGate reason={access.reason} user={access.user}/>;
  }

  return children;
}
