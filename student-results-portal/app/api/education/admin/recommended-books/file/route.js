import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../../lib/admin-auth';
import { handleRecommendedBookFile } from '../../../lecturer/recommended-books/file/route';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Administrator sign-in required.' }, { status: 401 });
  return handleRecommendedBookFile(request, 'admin', { ok: true, user: { id: null, role: 'admin' } });
}
