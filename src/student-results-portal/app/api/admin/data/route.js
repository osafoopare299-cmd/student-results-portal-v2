import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin-auth';
import { getSql } from '../../../../lib/db';

export async function GET(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getSql();
    const [stats] = await sql`
      SELECT
        (SELECT count(*)::int FROM students) students,
        (SELECT count(*)::int FROM exams WHERE archived=false) exams,
        (SELECT count(*)::int FROM final_results WHERE completion_status='COMPLETE') complete,
        (SELECT count(*)::int FROM exams WHERE published=true AND archived=false) published
    `;
    const exams = await sql`
      SELECT e.id, e.exam_name, e.subject, e.exam_date, e.published, e.written_max, e.viva_enabled, e.additional_enabled,
        count(wr.id)::int AS written_count,
        count(vr.id)::int AS viva_count,
        count(am.id)::int AS additional_count
      FROM exams e
      LEFT JOIN written_results wr ON wr.exam_id=e.id
      LEFT JOIN viva_results vr ON vr.exam_id=e.id AND vr.student_id=wr.student_id
      LEFT JOIN additional_marks am ON am.exam_id=e.id AND am.student_id=wr.student_id
      WHERE e.archived=false
      GROUP BY e.id ORDER BY e.exam_date DESC NULLS LAST, e.id DESC
    `;
    const requestedExamId = Number(new URL(request.url).searchParams.get('examId'));
    const selectedExamId = exams.some((exam) => Number(exam.id) === requestedExamId)
      ? requestedExamId
      : Number(exams[0]?.id || 0);
    const students = await sql`
      SELECT s.id, s.email, s.full_name, s.gender,
             wr.exam_id, wr.raw_score, wr.max_score, e.exam_name
      FROM students s
      JOIN written_results wr ON wr.student_id=s.id
      JOIN exams e ON e.id=wr.exam_id
      WHERE wr.exam_id=${selectedExamId}
      ORDER BY s.full_name ASC, e.exam_date DESC NULLS LAST, e.id DESC
    `;
    const recent = await sql`
      SELECT exam_id, email, full_name, exam_name, written_raw, written_max, viva_enabled, additional_enabled, viva_total, additional_total,
             total_score, total_max, overall_percentage, completion_status, published
      FROM final_results
      WHERE exam_id=${selectedExamId}
      ORDER BY full_name ASC
    `;
    return NextResponse.json({ stats, exams, students, recent, selectedExamId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database connection is not ready.' }, { status: 503 });
  }
}
