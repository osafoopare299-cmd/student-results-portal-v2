import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../../lib/admin-auth';
import { handleRecommendedBookUpload } from '../../../lecturer/recommended-books/upload/route';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Administrator sign-in required.' }, { status: 401 });
  return handleRecommendedBookUpload(request, 'admin', { ok: true, user: { id: null, role: 'admin' } });
}
