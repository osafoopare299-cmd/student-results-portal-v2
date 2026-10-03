import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';
import { educationBlobConfigured } from '../../../../../../lib/education-material-files';
import { ensureRecommendedBooksSchema, findRecommendedBook } from '../../../../../../lib/education-recommended-books';

export const dynamic = 'force-dynamic';

export async function handleRecommendedBookFile(request, role = 'lecturer', authenticatedAccess = null) {
  const access = authenticatedAccess || await getEducationUser('lecturer');
  if (!access.ok) return NextResponse.json({ ok: false, error: `${role === 'admin' ? 'Administrator' : 'Lecturer'} access required.` }, { status: 401 });
  if (!educationBlobConfigured()) return NextResponse.json({ ok: false, error: 'File storage is not configured.' }, { status: 503 });
  try {
    const bookId = Number(new URL(request.url).searchParams.get('bookId'));
    const sql = getEducationSql();
    await ensureRecommendedBooksSchema(sql);
    const book = await findRecommendedBook(sql, bookId, role, access.user.id, false);
    if (!book?.blob_pathname) return NextResponse.json({ ok: false, error: 'Recommended book file not found.' }, { status: 404 });
    const result = await get(book.blob_pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) return NextResponse.json({ ok: false, error: 'Recommended book file not found.' }, { status: 404 });
    const filename = String(book.original_filename || 'recommended-book').replace(/[\r\n"]/g, '');
    return new NextResponse(result.stream, { headers: {
      'Content-Type': result.blob?.contentType || book.file_content_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    console.error('Recommended-book file unavailable:', error);
    return NextResponse.json({ ok: false, error: 'Unable to download the recommended book.' }, { status: 503 });
  }
}

export async function GET(request) { return handleRecommendedBookFile(request); }
