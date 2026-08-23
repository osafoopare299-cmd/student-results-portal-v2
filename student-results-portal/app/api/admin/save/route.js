import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin-auth';
import { getSql } from '../../../../lib/db';

const n = (value) => Number(value);

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const sql = getSql();

    if (body.action === 'create_exam') {
      const name = String(body.examName || '').trim();
      if (!name) return NextResponse.json({ error: 'Exam name is required.' }, { status: 400 });
      const rows = await sql`INSERT INTO exams (exam_name, subject, exam_date) VALUES (${name}, ${String(body.subject || '').trim() || null}, ${body.examDate || null}) RETURNING id`;
      return NextResponse.json({ ok: true, id: rows[0].id });
    }

    if (body.action === 'publish_exam') {
      await sql`UPDATE exams SET published=${Boolean(body.published)} WHERE id=${n(body.examId)}`;
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'save_result') {
      const email = String(body.email || '').trim().toLowerCase();
      const fullName = String(body.fullName || '').trim();
      const examId = n(body.examId);
      if (!email || !fullName || !examId) return NextResponse.json({ error: 'Student email, full name and exam are required.' }, { status: 400 });
      if (n(body.q1) < 0 || n(body.q1) > 10 || n(body.q2) < 0 || n(body.q2) > 10 || n(body.q3) < 0 || n(body.q3) > 10) return NextResponse.json({ error: 'Each viva mark must be between 0 and 10.' }, { status: 400 });
      if (n(body.dressing) < 0 || n(body.dressing) > 1 || n(body.delivery) < 0 || n(body.delivery) > 2 || n(body.composure) < 0 || n(body.composure) > 2) return NextResponse.json({ error: 'Additional marks exceed the allowed maximum.' }, { status: 400 });
      if (n(body.maxScore) <= 0 || n(body.rawScore) < 0 || n(body.rawScore) > n(body.maxScore)) return NextResponse.json({ error: 'Written score is invalid.' }, { status: 400 });

      const students = await sql`
        INSERT INTO students(email, full_name) VALUES (${email}, ${fullName})
        ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, updated_at=now()
        RETURNING id
      `;
      const studentId = students[0].id;
      await sql`
        INSERT INTO written_results(student_id, exam_id, raw_score, max_score)
        VALUES (${studentId}, ${examId}, ${n(body.rawScore)}, ${n(body.maxScore)})
        ON CONFLICT(student_id, exam_id) DO UPDATE SET raw_score=excluded.raw_score, max_score=excluded.max_score, updated_at=now()
      `;
      await sql`
        INSERT INTO viva_results(student_id, exam_id, q1, q2, q3)
        VALUES (${studentId}, ${examId}, ${n(body.q1)}, ${n(body.q2)}, ${n(body.q3)})
        ON CONFLICT(student_id, exam_id) DO UPDATE SET q1=excluded.q1, q2=excluded.q2, q3=excluded.q3, updated_at=now()
      `;
      await sql`
        INSERT INTO additional_marks(student_id, exam_id, dressing, delivery, composure)
        VALUES (${studentId}, ${examId}, ${n(body.dressing)}, ${n(body.delivery)}, ${n(body.composure)})
        ON CONFLICT(student_id, exam_id) DO UPDATE SET dressing=excluded.dressing, delivery=excluded.delivery, composure=excluded.composure, updated_at=now()
      `;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('admin save failed', error);
    return NextResponse.json({ error: 'Unable to save the record.' }, { status: 500 });
  }
}
