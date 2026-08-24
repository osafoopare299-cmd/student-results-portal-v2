import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin-auth';
import { getSql } from '../../../../lib/db';
import { resultEmailIsConfigured, sendResultPublishedEmails } from '../../../../lib/result-email';

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
      const examId = n(body.examId);
      const published = Boolean(body.published);
      if (!examId) return NextResponse.json({ error: 'Select an examination.' }, { status: 400 });
      if (!published) {
        await sql`UPDATE exams SET published=false WHERE id=${examId}`;
        return NextResponse.json({ ok: true });
      }
      if (!resultEmailIsConfigured()) {
        return NextResponse.json({ error: 'Result email alerts are not configured yet.' }, { status: 503 });
      }
      const exams = await sql`
        UPDATE exams SET published=true
        WHERE id=${examId} AND published=false AND archived=false
        RETURNING id, exam_name
      `;
      if (!exams.length) return NextResponse.json({ ok: true, alreadyPublished: true });
      const students = await sql`
        SELECT DISTINCT s.id, s.email, s.full_name
        FROM written_results wr
        JOIN students s ON s.id=wr.student_id
        WHERE wr.exam_id=${examId} AND trim(s.email) <> ''
        ORDER BY s.full_name
      `;
      const delivery = await sendResultPublishedEmails({ exam: exams[0], students });
      return NextResponse.json({ ok: true, emailsSent: delivery.sent, emailsFailed: delivery.failed });
    }

    if (body.action === 'update_exam_settings') {
      const examId = n(body.examId);
      const writtenMax = n(body.writtenMax);
      if (!examId || !Number.isFinite(writtenMax) || writtenMax <= 0) return NextResponse.json({ error: 'Enter a valid written maximum.' }, { status: 400 });
      await sql`UPDATE exams SET written_max=${writtenMax}, viva_enabled=${Boolean(body.vivaEnabled)}, additional_enabled=${Boolean(body.additionalEnabled)}, updated_at=now() WHERE id=${examId}`;
      await sql`UPDATE written_results SET max_score=${writtenMax}, updated_at=now() WHERE exam_id=${examId}`;
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'archive_exam') {
      const examId = n(body.examId);
      if (!examId) return NextResponse.json({ error: 'Select an examination to archive.' }, { status: 400 });
      const archived = await sql`UPDATE exams SET archived=true, published=false, updated_at=now() WHERE id=${examId} RETURNING id`;
      if (!archived.length) return NextResponse.json({ error: 'The examination was not found.' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'save_result') {
      const studentId = n(body.studentId);
      const email = String(body.email || '').trim().toLowerCase();
      const fullName = String(body.fullName || '').trim();
      const examId = n(body.examId);
      if (!studentId || !email || !fullName || !examId) return NextResponse.json({ error: 'Select a student and examination.' }, { status: 400 });
      const [exam] = await sql`SELECT viva_enabled, additional_enabled FROM exams WHERE id=${examId} AND archived=false`;
      if (!exam) return NextResponse.json({ error: 'The selected examination was not found.' }, { status: 404 });
      if (exam.viva_enabled && (body.q1 === '' || body.q2 === '' || body.q3 === '' || n(body.q1) < 0 || n(body.q1) > 10 || n(body.q2) < 0 || n(body.q2) > 10 || n(body.q3) < 0 || n(body.q3) > 10)) return NextResponse.json({ error: 'Enter each viva mark between 0 and 10.' }, { status: 400 });
      if (exam.additional_enabled && (body.dressing === '' || body.delivery === '' || body.composure === '' || n(body.dressing) < 0 || n(body.dressing) > 1 || n(body.delivery) < 0 || n(body.delivery) > 2 || n(body.composure) < 0 || n(body.composure) > 2)) return NextResponse.json({ error: 'Enter all additional marks within their allowed maximums.' }, { status: 400 });
      if (n(body.maxScore) <= 0 || n(body.rawScore) < 0 || n(body.rawScore) > n(body.maxScore)) return NextResponse.json({ error: 'Written score is invalid.' }, { status: 400 });

      const [student] = await sql`SELECT id FROM students WHERE id=${studentId} AND lower(email)=${email}`;
      if (!student) return NextResponse.json({ error: 'The selected student record was not found.' }, { status: 404 });
      if (exam.viva_enabled) await sql`
        INSERT INTO written_results(student_id, exam_id, raw_score, max_score)
        VALUES (${studentId}, ${examId}, ${n(body.rawScore)}, ${n(body.maxScore)})
        ON CONFLICT(student_id, exam_id) DO UPDATE SET raw_score=excluded.raw_score, max_score=excluded.max_score, updated_at=now()
      `;
      if (exam.additional_enabled) await sql`
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
