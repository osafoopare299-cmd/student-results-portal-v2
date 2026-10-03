import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';
import { educationBlobConfigured } from '../../../../../../lib/education-material-files';
import { EDUCATION_BOOK_CONTENT_TYPES, EDUCATION_FILE_MAX_BYTES } from '../../../../../../lib/education-upload-limits';

export const dynamic = 'force-dynamic';

export async function handleRecommendedBookUpload(request, role = 'lecturer', authenticatedAccess = null) {
  const access = authenticatedAccess || await getEducationUser('lecturer');
  if (!access.ok) return NextResponse.json({ ok: false, error: `${role === 'admin' ? 'Administrator' : 'Lecturer'} access required.` }, { status: 401 });
  if (!educationBlobConfigured()) return NextResponse.json({ ok: false, error: 'File storage is not configured yet.' }, { status: 503 });
  try {
    const body = await request.json();
    const sql = getEducationSql();
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try { payload = JSON.parse(clientPayload || '{}'); } catch {}
        const offeringId = Number(payload.offeringId);
        if (!Number.isInteger(offeringId)) throw new Error('Choose a course before uploading.');
        const offering = role === 'admin'
          ? (await sql`select id from edu_course_offerings where id=${offeringId} limit 1`)[0]
          : (await sql`select id from edu_course_offerings where id=${offeringId} and lecturer_user_id=${access.user.id} limit 1`)[0];
        if (!offering) throw new Error(role === 'admin' ? 'Course offering not found.' : 'You can only upload books to your assigned courses.');
        if (!String(pathname || '').startsWith(`education/${offeringId}/books/`)) throw new Error('Invalid recommended-book upload path.');
        return {
          allowedContentTypes: EDUCATION_BOOK_CONTENT_TYPES,
          maximumSizeInBytes: EDUCATION_FILE_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: role === 'lecturer' ? access.user.id : null, role, offeringId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          const payload = JSON.parse(tokenPayload || '{}');
          const callbackSql = getEducationSql();
          await callbackSql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${Number(payload.userId) || null},'recommended_book_file_uploaded','blob',${String(blob.pathname || blob.url || '')},${JSON.stringify({ role: payload.role, offeringId: payload.offeringId, contentType: blob.contentType || null })}::jsonb)`;
        } catch (error) { console.error('Recommended-book upload audit failed:', error); }
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Recommended-book upload unavailable:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Unable to authorize book upload.' }, { status: 400 });
  }
}

export async function POST(request) { return handleRecommendedBookUpload(request); }
