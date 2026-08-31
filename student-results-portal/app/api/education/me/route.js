import { NextResponse } from 'next/server';
import { getEducationAuth } from '../../../../lib/education-auth';
import { getSql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = getEducationAuth();
  if (!auth) {
    return NextResponse.json({ ok:false, error:'Education authentication is not configured yet.' }, { status:503 });
  }

  const { data: session } = await auth.getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ ok:false, error:'Not signed in.' }, { status:401 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      select id, email, full_name, role, status
      from edu_users
      where lower(email) = lower(${email})
      limit 1
    `;
    const user = rows?.[0];
    if (!user) {
      return NextResponse.json({ ok:false, error:'Your account is authenticated but is not enrolled in Dropare Education.' }, { status:403 });
    }
    if (user.status !== 'active') {
      return NextResponse.json({ ok:false, error:'Your education account is not active.' }, { status:403 });
    }
    return NextResponse.json({ ok:true, user });
  } catch (error) {
    console.error('Education role lookup failed', error);
    return NextResponse.json({ ok:false, error:'Education database setup is not ready yet.' }, { status:503 });
  }
}
