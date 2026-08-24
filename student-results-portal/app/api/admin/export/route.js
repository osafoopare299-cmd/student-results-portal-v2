import { NextResponse } from 'next/server';
// Administrator-only Excel export endpoint.
import * as XLSX from 'xlsx';
import { isAdmin } from '../../../../lib/admin-auth';
import { getSql } from '../../../../lib/db';

export const runtime = 'nodejs';

export async function GET(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const examId = Number(new URL(request.url).searchParams.get('examId'));
    if (!examId) return NextResponse.json({ error: 'Select an examination.' }, { status: 400 });
    const sql = getSql();
    const [exam] = await sql`SELECT exam_name, written_max, viva_enabled, additional_enabled FROM exams WHERE id=${examId} AND published=true AND archived=false`;
    if (!exam) return NextResponse.json({ error: 'Publish the selected examination before exporting it.' }, { status: 400 });

    const rows = await sql`
      SELECT full_name, email, gender, written_raw, written_max, viva_q1, viva_q2, viva_q3,
             viva_total, dressing, delivery, composure, additional_total,
             total_score, total_max, overall_percentage
      FROM final_results
      WHERE exam_id=${examId} AND published=true AND completion_status='COMPLETE'
      ORDER BY full_name ASC
    `;
    if (!rows.length) return NextResponse.json({ error: 'There are no completed published results to export.' }, { status: 404 });

    const data = rows.map((row, index) => ({
      'No.': index + 1,
      'Full Name': row.full_name,
      'Email Address': row.email,
      'Gender': row.gender || '',
      [`Written /${Number(row.written_max)}`]: Number(row.written_raw),
      ...(exam.viva_enabled ? { 'Viva Q1 /10': Number(row.viva_q1), 'Viva Q2 /10': Number(row.viva_q2), 'Viva Q3 /10': Number(row.viva_q3), 'Viva Total /30': Number(row.viva_total) } : {}),
      ...(exam.additional_enabled ? { 'Dressing /1': Number(row.dressing), 'Delivery /2': Number(row.delivery), 'Composure /2': Number(row.composure), 'Additional /5': Number(row.additional_total) } : {}),
      [`Total /${Number(row.total_max)}`]: Number(row.total_score),
      'Overall Percentage': Number(row.overall_percentage) / 100,
      'Status': Number(row.overall_percentage) >= 50 ? 'PASS' : 'FAIL',
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet['!cols'] = Object.keys(data[0]).map((key) => ({ wch: Math.min(36, Math.max(12, key.length + 2)) }));
    const percentageColumn = XLSX.utils.encode_col(Object.keys(data[0]).indexOf('Overall Percentage'));
    for (let row = 2; row <= data.length + 1; row += 1) if (sheet[`${percentageColumn}${row}`]) sheet[`${percentageColumn}${row}`].z = '0.0%';
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Published Results');
    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `${exam.exam_name.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}_Published_Results.xlsx`;
    return new Response(output, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Excel export failed', error);
    return NextResponse.json({ error: 'Unable to create the Excel export.' }, { status: 500 });
  }
}
