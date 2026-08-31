import { NextResponse } from 'next/server';
import { getEducationAuth } from '../../../../lib/education-auth';

function unavailable() {
  return NextResponse.json(
    { ok: false, error: 'Education authentication is not configured yet.' },
    { status: 503 }
  );
}

export async function GET(request, context) {
  const auth = getEducationAuth();
  if (!auth) return unavailable();
  return auth.handler().GET(request, context);
}

export async function POST(request, context) {
  const auth = getEducationAuth();
  if (!auth) return unavailable();
  return auth.handler().POST(request, context);
}
