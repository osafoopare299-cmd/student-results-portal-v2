import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { educationBlobConfigured } from '../../../../../lib/education-material-files';
import {
  cleanBookText,
  ensureRecommendedBooksSchema,
  recommendedBookMaterialType,
  validRecommendedBookFile,
} from '../../../../../lib/education-recommended-books';
import { deliverEducationEmail, educationOfferingRecipients } from '../../../../../lib/education-email';

export const dynamic = 'force-dynamic';

async function cleanupOrphan(pathname) {
  if (!pathname || !educationBlobConfigured()) return;
  try { await del(pathname); }
  catch (error) { console.error('Orphan recommended-book cleanup failed:', error); }
}

async function offeringForRole(sql, offeringId, role, userId) {
  if (role === 'admin') {
    return (await sql`select o.id,c.code from edu_course_offerings o join edu_courses c on c.id=o.course_id where o.id=${offeringId} limit 1`)[0] || null;
  }
  return (await sql`select o.id,c.code from edu_course_offerings o join edu_courses c on c.id=o.course_id where o.id=${offeringId} and o.lecturer_user_id=${userId} limit 1`)[0] || null;
}

async function loadData(sql, role, userId) {
  const offerings = role === 'admin'
    ? await sql`select o.id,c.code,c.title,cl.name as class_name,y.name as academic_year,o.term,u.full_name as lecturer_name from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id left join edu_users u on u.id=o.lecturer_user_id order by y.name desc,c.code,cl.name`
    : await sql`select o.id,c.code,c.title,cl.name as class_name,y.name as academic_year,o.term from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id where o.lecturer_user_id=${userId} order by y.name desc,c.code,cl.name`;
  const books = role === 'admin'
    ? await sql`select m.id,m.offering_id,m.created_by,m.title,m.description,m.material_type,m.is_offline_available,m.published_at,m.created_at,m.blob_pathname,m.original_filename,m.file_content_type,m.file_size_bytes,m.book_author,m.book_edition,m.book_isbn,c.code,c.title as course_title,cl.name as class_name,y.name as academic_year,o.term,u.full_name as added_by from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id left join edu_users u on u.id=m.created_by where m.is_recommended_book=true order by m.created_at desc limit 300`
    : await sql`select m.id,m.offering_id,m.created_by,m.title,m.description,m.material_type,m.is_offline_available,m.published_at,m.created_at,m.blob_pathname,m.original_filename,m.file_content_type,m.file_size_bytes,m.book_author,m.book_edition,m.book_isbn,c.code,c.title as course_title,cl.name as class_name,y.name as academic_year,o.term,u.full_name as added_by from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id left join edu_users u on u.id=m.created_by where m.is_recommended_book=true and o.lecturer_user_id=${userId} order by m.created_at desc limit 300`;
  return {
    offerings,
    books: books.map(book => ({
      ...book,
      can_manage: role === 'admin' || String(book.created_by) === String(userId),
      download_url: `/api/education/${role}/recommended-books/file?bookId=${encodeURIComponent(book.id)}`,
    })),
  };
}

export async function handleGetRecommendedBooks(role = 'lecturer', authenticatedAccess = null) {
  const access = authenticatedAccess || await getEducationUser('lecturer');
  if (!access.ok) return NextResponse.json({ ok: false, error: `${role === 'admin' ? 'Administrator' : 'Lecturer'} access required.` }, { status: 401 });
  try {
    const sql = getEducationSql();
    await ensureRecommendedBooksSchema(sql);
    return NextResponse.json({ ok: true, fileStorageConfigured: educationBlobConfigured(), ...(await loadData(sql, role, access.user.id)) });
  } catch (error) {
    console.error('Recommended books unavailable:', error);
    return NextResponse.json({ ok: false, error: 'Unable to load recommended books.' }, { status: 503 });
  }
}

export async function handlePostRecommendedBooks(request, role = 'lecturer', authenticatedAccess = null) {
  const access = authenticatedAccess || await getEducationUser('lecturer');
  if (!access.ok) return NextResponse.json({ ok: false, error: `${role === 'admin' ? 'Administrator' : 'Lecturer'} access required.` }, { status: 401 });
  let uploadedPath = null;
  try {
    const body = await request.json();
    const sql = getEducationSql();
    await ensureRecommendedBooksSchema(sql);
    const offeringId = Number(body.offeringId);
    const title = cleanBookText(body.title, 240);
    const author = cleanBookText(body.author, 240) || null;
    const edition = cleanBookText(body.edition, 120) || null;
    const isbn = cleanBookText(body.isbn, 80) || null;
    const description = cleanBookText(body.description, 2000) || null;
    const blobPathname = cleanBookText(body.blobPathname, 2000) || null;
    const originalFilename = cleanBookText(body.originalFilename, 500) || null;
    const fileContentType = cleanBookText(body.fileContentType, 200) || null;
    const fileSizeBytes = Number(body.fileSizeBytes || 0) || null;
    uploadedPath = blobPathname;
    if (!Number.isInteger(offeringId) || !title || !blobPathname || !originalFilename) {
      await cleanupOrphan(uploadedPath);
      return NextResponse.json({ ok: false, error: 'Choose a course and upload a named book file.' }, { status: 400 });
    }
    const offering = await offeringForRole(sql, offeringId, role, access.user.id);
    if (!offering) {
      await cleanupOrphan(uploadedPath);
      return NextResponse.json({ ok: false, error: role === 'admin' ? 'Course offering not found.' : 'You can only add books to your assigned courses.' }, { status: 403 });
    }
    if (!blobPathname.startsWith(`education/${offeringId}/books/`)) {
      await cleanupOrphan(uploadedPath);
      return NextResponse.json({ ok: false, error: 'Uploaded book does not belong to the selected course.' }, { status: 400 });
    }
    if (!validRecommendedBookFile(originalFilename, fileContentType, fileSizeBytes)) {
      await cleanupOrphan(uploadedPath);
      return NextResponse.json({ ok: false, error: 'Upload a valid PDF, EPUB, MOBI, AZW or AZW3 book no larger than 250 MB.' }, { status: 400 });
    }
    const publishedAt = body.publish === false ? null : new Date().toISOString();
    const createdBy = role === 'lecturer' ? access.user.id : null;
    const materialType = recommendedBookMaterialType(originalFilename);
    const rows = await sql`insert into edu_learning_materials (offering_id,created_by,title,description,material_type,is_offline_available,is_recommended_book,book_author,book_edition,book_isbn,published_at,blob_pathname,original_filename,file_content_type,file_size_bytes) values (${offeringId},${createdBy},${title},${description},${materialType},true,true,${author},${edition},${isbn},${publishedAt},${blobPathname},${originalFilename},${fileContentType},${fileSizeBytes}) returning id,title,published_at`;
    uploadedPath = null;
    await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${createdBy},'recommended_book_created','edu_learning_material',${String(rows[0].id)},${JSON.stringify({ role, offeringId, originalFilename, fileSizeBytes, published: Boolean(publishedAt) })}::jsonb)`;
    let email = null;
    if (publishedAt && process.env.VERCEL_ENV === 'production') {
      email = await deliverEducationEmail({
        recipients: await educationOfferingRecipients(sql, offeringId),
        title: `Recommended book: ${title}`,
        message: description || `${author ? `By ${author}. ` : ''}A new recommended book is ready to download.`,
        kind: 'Recommended book',
        course: offering.code,
        actionPath: '/education/student/recommended-books',
        eventId: rows[0].id,
      });
    }
    return NextResponse.json({ ok: true, book: rows[0], email });
  } catch (error) {
    await cleanupOrphan(uploadedPath);
    console.error('Recommended book save failed:', error);
    return NextResponse.json({ ok: false, error: 'Unable to save the recommended book.' }, { status: 503 });
  }
}

export async function GET() { return handleGetRecommendedBooks(); }
export async function POST(request) { return handlePostRecommendedBooks(request); }
