import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { ensureRecommendedBooksSchema } from '../../../../../lib/education-recommended-books';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await getEducationUser('student');
  if (!access.ok) return NextResponse.json({ ok: false, error: 'Student access required.' }, { status: 401 });
  try {
    const sql = getEducationSql();
    await ensureRecommendedBooksSchema(sql);
    const offerings = await sql`
      select o.id,c.code,c.title,cl.name as class_name,count(m.id)::int as books_count
      from edu_enrolments e
      join edu_course_offerings o on o.id=e.offering_id
      join edu_courses c on c.id=o.course_id
      join edu_classes cl on cl.id=o.class_id
      left join edu_learning_materials m on m.offering_id=o.id and m.is_recommended_book=true and m.published_at is not null
      where e.student_user_id=${access.user.id} and e.status='active'
      group by o.id,c.code,c.title,cl.name
      order by c.code,cl.name
    `;
    const books = await sql`
      select m.id,m.offering_id,m.title,m.description,m.book_author,m.book_edition,m.book_isbn,m.original_filename,m.file_content_type,m.file_size_bytes,m.published_at,c.code,c.title as course_title,cl.name as class_name
      from edu_enrolments e
      join edu_course_offerings o on o.id=e.offering_id
      join edu_learning_materials m on m.offering_id=o.id and m.is_recommended_book=true and m.published_at is not null and m.blob_pathname is not null
      join edu_courses c on c.id=o.course_id
      join edu_classes cl on cl.id=o.class_id
      where e.student_user_id=${access.user.id} and e.status='active'
      order by m.published_at desc,m.id desc
      limit 300
    `;
    return NextResponse.json({
      ok: true,
      offerings,
      books: books.map(book => ({
        ...book,
        download_url: `/api/education/student/material-file?materialId=${encodeURIComponent(book.id)}&download=1`,
      })),
    });
  } catch (error) {
    console.error('Student recommended books unavailable:', error);
    return NextResponse.json({ ok: false, error: 'Unable to load recommended books.' }, { status: 503 });
  }
}
