import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { isAdmin } from '../../../../lib/admin-auth';
import { getSql } from '../../../../lib/db';

export const runtime = 'nodejs';

const safe = (value) => String(value ?? '').replace(/[^\x20-\x7E]/g, ' ');

export async function GET(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const examId = Number(new URL(request.url).searchParams.get('examId'));
    if (!examId) return NextResponse.json({ error: 'Select an examination.' }, { status: 400 });
    const sql = getSql();
    const [exam] = await sql`SELECT exam_name, subject, exam_date, written_max, viva_enabled, additional_enabled FROM exams WHERE id=${examId} AND published=true AND archived=false`;
    if (!exam) return NextResponse.json({ error: 'Publish the selected examination before exporting it.' }, { status: 400 });
    const rows = await sql`
      SELECT full_name, written_raw, written_max, viva_total, additional_total,
             total_score, total_max, overall_percentage
      FROM final_results
      WHERE exam_id=${examId} AND published=true AND completion_status='COMPLETE'
      ORDER BY full_name ASC
    `;
    if (!rows.length) return NextResponse.json({ error: 'There are no completed published results to export.' }, { status: 404 });

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([841.89, 595.28]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const width = page.getWidth();
    const height = page.getHeight();
    const margin = 22;
    const tableTop = height - 82;
    const tableBottom = 25;
    const rowHeight = Math.max(5.2, Math.min(18, (tableTop - tableBottom - 19) / rows.length));
    const fontSize = Math.max(4.1, Math.min(8, rowHeight * 0.48));
    const headerSize = Math.max(4.5, Math.min(7, fontSize));
    const columns = [
      ['No.', 26, 'center'], ['Student', 270, 'left'], [`Written /${Number(exam.written_max)}`, 80, 'center'],
      ['Viva /30', 70, 'center'], ['Add. /5', 65, 'center'], ['Total', 82, 'center'],
      ['Percent', 70, 'center'], ['Status', 60, 'center'],
    ];

    page.drawText(safe(exam.exam_name), { x: margin, y: height - 34, size: 16, font: bold, color: rgb(0.03, 0.12, 0.22) });
    page.drawText(`Published Results | ${safe(exam.subject || '')}${exam.exam_date ? ` | ${new Date(exam.exam_date).toISOString().slice(0, 10)}` : ''}`, { x: margin, y: height - 51, size: 8, font: regular, color: rgb(0.3, 0.38, 0.47) });
    page.drawText(`Students: ${rows.length}`, { x: width - margin - 72, y: height - 45, size: 8, font: bold, color: rgb(0.03, 0.12, 0.22) });

    let x = margin;
    const headerY = tableTop - 13;
    page.drawRectangle({ x: margin, y: tableTop - 19, width: width - margin * 2, height: 19, color: rgb(0.05, 0.16, 0.28) });
    for (const [label, colWidth, align] of columns) {
      const textWidth = bold.widthOfTextAtSize(label, headerSize);
      const tx = align === 'center' ? x + Math.max(2, (colWidth - textWidth) / 2) : x + 4;
      page.drawText(label, { x: tx, y: headerY, size: headerSize, font: bold, color: rgb(1, 1, 1) });
      x += colWidth;
    }

    rows.forEach((row, index) => {
      const y = tableTop - 19 - (index + 1) * rowHeight;
      if (index % 2 === 0) page.drawRectangle({ x: margin, y, width: width - margin * 2, height: rowHeight, color: rgb(0.95, 0.97, 0.99) });
      const status = Number(row.overall_percentage) >= 50 ? 'PASS' : 'FAIL';
      const values = [index + 1, safe(row.full_name).slice(0, 48), Number(row.written_raw).toFixed(1), exam.viva_enabled ? Number(row.viva_total).toFixed(1) : 'N/A', exam.additional_enabled ? Number(row.additional_total).toFixed(1) : 'N/A', `${Number(row.total_score).toFixed(1)}/${Number(row.total_max).toFixed(1)}`, `${Number(row.overall_percentage).toFixed(1)}%`, status];
      let cx = margin;
      values.forEach((value, colIndex) => {
        const text = String(value);
        const [,, align] = columns[colIndex];
        const colWidth = columns[colIndex][1];
        const textWidth = regular.widthOfTextAtSize(text, fontSize);
        const tx = align === 'center' ? cx + Math.max(2, (colWidth - textWidth) / 2) : cx + 4;
        page.drawText(text, { x: tx, y: y + Math.max(1.5, (rowHeight - fontSize) / 2), size: fontSize, font: status === 'FAIL' && colIndex === 7 ? bold : regular, color: status === 'FAIL' && colIndex === 7 ? rgb(0.72, 0.12, 0.16) : rgb(0.08, 0.13, 0.2) });
        cx += colWidth;
      });
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.25, color: rgb(0.78, 0.82, 0.87) });
    });

    page.drawText('Administrator: DR. OPARE', { x: margin, y: 10, size: 6, font: bold, color: rgb(0.35, 0.4, 0.48) });
    page.drawText('Generated from the Student Results Portal', { x: width - margin - 145, y: 10, size: 6, font: regular, color: rgb(0.45, 0.5, 0.56) });
    const output = await pdf.save();
    const fileName = `${exam.exam_name.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}_Published_Results.pdf`;
    return new Response(output, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName}"`, 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('PDF export failed', error);
    return NextResponse.json({ error: 'Unable to create the PDF export.' }, { status: 500 });
  }
}
