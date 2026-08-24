import { NextResponse } from 'next/server';
import { getSql } from '../../../lib/db';

function grade(finalScore) {
  if (finalScore >= 80) return 'A';
  if (finalScore >= 70) return 'B';
  if (finalScore >= 60) return 'C';
  if (finalScore >= 50) return 'D';
  return 'F';
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Enter a valid registered email address.' }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT * FROM final_results
      WHERE lower(email) = ${cleanEmail}
        AND published = true
        AND completion_status = 'COMPLETE'
      ORDER BY exam_date DESC NULLS LAST, exam_name ASC
    `;

    if (!rows.length) {
      return NextResponse.json({ error: 'No published result was found for this email.' }, { status: 404 });
    }

    const results = rows.map((r) => {
      const finalAssessment = Number(r.overall_percentage || 0);
      return {
        fullName: r.full_name,
        email: r.email,
        examName: r.exam_name,
        subject: r.subject || '',
        examDate: r.exam_date || null,
        written: Number(r.written_raw || 0),
        writtenMax: Number(r.written_max || 0),
        vivaEnabled: Boolean(r.viva_enabled),
        additionalEnabled: Boolean(r.additional_enabled),
        viva: Number(r.viva_total || 0),
        finalAssessment,
        dressing: Number(r.dressing || 0),
        delivery: Number(r.delivery || 0),
        composure: Number(r.composure || 0),
        additional: Number(r.additional_total || 0),
        overall: Number(r.total_score || 0),
        overallMax: Number(r.total_max || 0),
        overallPercent: Number(r.overall_percentage || 0),
        grade: grade(finalAssessment),
        status: finalAssessment >= 50 ? 'PASS' : 'FAIL',
        published: true,
      };
    });

    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('results lookup failed', error);
    const configuration = String(error?.message || '').includes('DATABASE_URL');
    return NextResponse.json({
      error: configuration ? 'The results database is not connected to this deployment yet.' : 'Something went wrong while retrieving your result.'
    }, { status: configuration ? 503 : 500 });
  }
}
