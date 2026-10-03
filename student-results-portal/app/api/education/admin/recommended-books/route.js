import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { handleGetRecommendedBooks, handlePostRecommendedBooks } from '../../lecturer/recommended-books/route';

export const dynamic = 'force-dynamic';

async function administratorAccess() {
  if (!(await isAdmin())) return { ok: false, reason: 'unauthenticated' };
  return { ok: true, user: { id: null, role: 'admin', full_name: 'Administrator' } };
}

function denied() { return NextResponse.json({ ok: false, error: 'Administrator sign-in required.' }, { status: 401 }); }

export async function GET() {
  const access = await administratorAccess();
  return access.ok ? handleGetRecommendedBooks('admin', access) : denied();
}

export async function POST(request) {
  const access = await administratorAccess();
  return access.ok ? handlePostRecommendedBooks(request, 'admin', access) : denied();
}
