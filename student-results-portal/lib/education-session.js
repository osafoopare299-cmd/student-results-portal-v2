import { getEducationAuth, educationAuthConfigured } from './education-auth';
import { getEducationSql } from './db';

export async function getEducationUser(expectedRole) {
  if (!educationAuthConfigured()) return { ok: false, reason: 'setup' };
  try {
    const auth = getEducationAuth();
    const { data: session } = await auth.getSession();
    const email = session?.user?.email;
    if (!email) return { ok: false, reason: 'unauthenticated' };
    const sql = getEducationSql();
    const rows = await sql`select id,email,full_name,role,status from edu_users where lower(email)=lower(${email}) limit 1`;
    const user = rows?.[0];
    if (!user) return { ok:false, reason:'unregistered' };
    if (user.status !== 'active') return { ok:false, reason:'inactive', user };
    if (expectedRole && user.role !== expectedRole) return { ok:false, reason:'wrong-role', user };
    return { ok:true, user };
  } catch (error) {
    console.error('Education role guard unavailable:', error);
    return { ok:false, reason:'setup' };
  }
}
