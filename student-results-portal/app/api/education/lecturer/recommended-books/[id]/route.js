import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';
import { educationBlobConfigured } from '../../../../../../lib/education-material-files';
import { cleanBookText, ensureRecommendedBooksSchema, findRecommendedBook } from '../../../../../../lib/education-recommended-books';
import { deliverEducationEmail, educationOfferingRecipients } from '../../../../../../lib/education-email';

export const dynamic = 'force-dynamic';

export async function handlePatchRecommendedBook(request, context, role = 'lecturer', authenticatedAccess = null) {
  const access = authenticatedAccess || await getEducationUser('lecturer');
  if (!access.ok) return NextResponse.json({ ok: false, error: `${role === 'admin' ? 'Administrator' : 'Lecturer'} access required.` }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    const sql = getEducationSql();
    await ensureRecommendedBooksSchema(sql);
    const book = await findRecommendedBook(sql, id, role, access.user.id, true);
    if (!book) return NextResponse.json({ ok: false, error: 'Recommended book not found or cannot be managed by this account.' }, { status: 404 });
    const title = cleanBookText(body.title ?? book.title, 240);
    const author = cleanBookText(body.author ?? book.book_author, 240) || null;
    const edition = cleanBookText(body.edition ?? book.book_edition, 120) || null;
    const isbn = cleanBookText(body.isbn ?? book.book_isbn, 80) || null;
    const description = cleanBookText(body.description ?? book.description, 2000) || null;
    if (!title) return NextResponse.json({ ok: false, error: 'Book title is required.' }, { status: 400 });
    let publishedAt = book.published_at;
    if (body.publish === true && !publishedAt) publishedAt = new Date().toISOString();
    if (body.publish === false) publishedAt = null;
    const rows = await sql`update edu_learning_materials set title=${title},description=${description},book_author=${author},book_edition=${edition},book_isbn=${isbn},published_at=${publishedAt},updated_at=now() where id=${book.id} returning id,title,published_at`;
    await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${role === 'lecturer' ? access.user.id : null},'recommended_book_updated','edu_learning_material',${String(book.id)},${JSON.stringify({ role, published: Boolean(publishedAt) })}::jsonb)`;
    let email = null;
    if (publishedAt && !book.published_at && process.env.VERCEL_ENV === 'production') {
      const course = (await sql`select c.code from edu_course_offerings o join edu_courses c on c.id=o.course_id where o.id=${book.offering_id}`)[0];
      email = await deliverEducationEmail({
        recipients: await educationOfferingRecipients(sql, book.offering_id),
        title: `Recommended book: ${title}`,
        message: description || `${author ? `By ${author}. ` : ''}A new recommended book is ready to download.`,
        kind: 'Recommended book',
        course: course?.code,
        actionPath: '/education/student/recommended-books',
        eventId: book.id,
      });
    }
    return NextResponse.json({ ok: true, book: rows[0], email });
  } catch (error) {
    console.error('Recommended book update failed:', error);
    return NextResponse.json({ ok: false, error: 'Unable to update the recommended book.' }, { status: 503 });
  }
}

export async function handleDeleteRecommendedBook(request, context, role = 'lecturer', authenticatedAccess = null) {
  const access = authenticatedAccess || await getEducationUser('lecturer');
  if (!access.ok) return NextResponse.json({ ok: false, error: `${role === 'admin' ? 'Administrator' : 'Lecturer'} access required.` }, { status: 401 });
  try {
    const { id } = await context.params;
    const sql = getEducationSql();
    await ensureRecommendedBooksSchema(sql);
    const book = await findRecommendedBook(sql, id, role, access.user.id, true);
    if (!book) return NextResponse.json({ ok: false, error: 'Recommended book not found or cannot be managed by this account.' }, { status: 404 });
    await sql`delete from edu_learning_materials where id=${book.id}`;
    if (book.blob_pathname && educationBlobConfigured()) {
      try { await del(book.blob_pathname); }
      catch (error) { console.error('Recommended-book file cleanup failed:', error); }
    }
    await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${role === 'lecturer' ? access.user.id : null},'recommended_book_deleted','edu_learning_material',${String(book.id)},${JSON.stringify({ role, title: book.title, originalFilename: book.original_filename })}::jsonb)`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Recommended book delete failed:', error);
    return NextResponse.json({ ok: false, error: 'Unable to delete the recommended book.' }, { status: 503 });
  }
}

export async function PATCH(request, context) { return handlePatchRecommendedBook(request, context); }
export async function DELETE(request, context) { return handleDeleteRecommendedBook(request, context); }
