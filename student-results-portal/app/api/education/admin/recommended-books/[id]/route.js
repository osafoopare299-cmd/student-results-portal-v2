import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../../lib/admin-auth';
import { handleDeleteRecommendedBook, handlePatchRecommendedBook } from '../../../lecturer/recommended-books/[id]/route';

export const dynamic = 'force-dynamic';

async function administratorAccess() {
  if (!(await isAdmin())) return { ok: false, reason: 'unauthenticated' };
  return { ok: true, user: { id: null, role: 'admin', full_name: 'Administrator' } };
}

function denied() { return NextResponse.json({ ok: false, error: 'Administrator sign-in required.' }, { status: 401 }); }

export async function PATCH(request, context) {
  const access = await administratorAccess();
  return access.ok ? handlePatchRecommendedBook(request, context, 'admin', access) : denied();
}

export async function DELETE(request, context) {
  const access = await administratorAccess();
  return access.ok ? handleDeleteRecommendedBook(request, context, 'admin', access) : denied();
}
