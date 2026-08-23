import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin-auth';
import { getSql } from '../../../../lib/db';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const sql = getSql();
    const [stats] = await sql`
      SELECT
        (SELECT count(*)::int FROM students) students,
        (SELECT count(*)::int FROM exams) exams,
        (SELECT count(*)::int FROM final_results WHERE completion_status='COMPLETE') complete,
        (SELECT count(*)::int FROM exams WHERE published=true) published
    `;
    const exams = await sql`
      SELECT e.id, e.exam_name, e.subject, e.exam_date, e.published,
        count(wr.id)::int AS written_count,
        count(vr.id)::int AS viva_count,
        count(am.id)::int AS additional_count
      FROM exams e
      LEFT JOIN written_results wr ON wr.exam_id=e.id
      LEFT JOIN viva_results vr ON vr.exam_id=e.id AND vr.student_id=wr.student_id
      LEFT JOIN additional_marks am ON am.exam_id=e.id AND am.student_id=wr.student_id
      GROUP BY e.id ORDER BY e.exam_date DESC NULLS LAST, e.id DESC
    `;
    const recent = await sql`
      SELECT email, full_name, exam_name, written_weighted, viva_total, additional_total,
             final_assessment_100, overall_score_105, completion_status, published
      FROM final_results ORDER BY exam_date DESC NULLS LAST, full_name ASC LIMIT 60
    `;
    return NextResponse.json({ stats, exams, recent });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database connection is not ready.' }, { status: 503 });
  }
}
