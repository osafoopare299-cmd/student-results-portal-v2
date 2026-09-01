import { NextResponse } from 'next/server';
import { adminCookie, createAdminToken } from '../../../../lib/admin-auth';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return NextResponse.json({ error: 'Admin access has not been configured.' }, { status: 503 });
    if (String(password || '') !== expected) return NextResponse.json({ error: 'Incorrect administrator password.' }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie.name, createAdminToken(), {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: adminCookie.maxAge,
    });
    return response;
  } catch { return NextResponse.json({ error: 'Unable to sign in.' }, { status: 500 }); }
}
