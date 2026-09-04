import { NextResponse } from 'next/server';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return NextResponse.json({ ok: false, error: 'Email address is required.' }, { status: 400 });

    const sql = getEducationSql();
    const rows = await sql`
      select id, email, full_name, role, status
      from edu_users
      where lower(email) = ${normalized}
      limit 1
    `;
    const user = rows?.[0];

    if (!user || user.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'This email is not approved for Dropare Education.' }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        fullName: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Education activation check failed:', error);
    return NextResponse.json({ ok: false, error: 'Unable to verify this education account right now.' }, { status: 503 });
  }
}
