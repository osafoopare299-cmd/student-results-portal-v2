import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { isAdmin } from '../../../../lib/admin-auth';
import { getSql } from '../../../../lib/db';

export const runtime = 'nodejs';

const normalize = (value) => String(value ?? '').trim();
const headerKey = (value) => normalize(value).toLowerCase().replace(/\s+/g, ' ');

function findColumn(headers, accepted) {
  return headers.find((header) => accepted.includes(headerKey(header)));
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get('file');
    const examId = Number(form.get('examId'));
    const createNewExam = form.get('createNewExam') === 'true';
    const newExamName = normalize(form.get('newExamName'));
    const writtenMax = Number(form.get('writtenMax'));
    const vivaEnabled = form.get('vivaEnabled') === 'true';
    const additionalEnabled = form.get('additionalEnabled') === 'true';
    if (!Number.isFinite(writtenMax) || writtenMax <= 0) return NextResponse.json({ error: 'Enter a valid written examination maximum.' }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an Excel file.' }, { status: 400 });
    if (!/\.(xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: 'Upload an Excel .xlsx or .xls file.' }, { status: 400 });

    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const fullNameColumn = findColumn(headers, ['full name']);
    const genderColumn = findColumn(headers, ['gender']);
    const emailColumn = findColumn(headers, ['email address']) || findColumn(headers, ['email']);
    const pointsColumn = findColumn(headers, ['total points']);
    const missing = [!fullNameColumn && 'Full Name', !emailColumn && 'Email Address', !pointsColumn && 'Total points'].filter(Boolean);
    if (missing.length) return NextResponse.json({ error: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` }, { status: 400 });

    const latestByEmail = new Map();
    let skipped = 0;
    for (const row of rows) {
      const email = normalize(row[emailColumn]).toLowerCase();
      const fullName = normalize(row[fullNameColumn]);
      const score = Number(row[pointsColumn]);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName || !Number.isFinite(score) || score < 0 || score > writtenMax) { skipped += 1; continue; }
      latestByEmail.set(email, { email, fullName, gender: genderColumn ? normalize(row[genderColumn]) || null : null, score });
    }
    if (!latestByEmail.size) return NextResponse.json({ error: `No valid student rows were found. Written scores must be between 0 and ${writtenMax}.` }, { status: 400 });

    const sql = getSql();
    let targetExamId = examId;
    let createdExam = false;
    if (createNewExam) {
      if (!newExamName) return NextResponse.json({ error: 'Enter a name for the new examination.' }, { status: 400 });
      const [exam] = await sql`INSERT INTO exams(exam_name, subject, exam_date, published, archived, written_max, viva_enabled, additional_enabled) VALUES (${newExamName}, 'Microsoft Forms', CURRENT_DATE, false, false, ${writtenMax}, ${vivaEnabled}, ${additionalEnabled}) RETURNING id`;
      targetExamId = Number(exam.id);
      createdExam = true;
    } else {
      if (!targetExamId) return NextResponse.json({ error: 'No active examination is available.' }, { status: 400 });
      const [exam] = await sql`UPDATE exams SET written_max=${writtenMax}, viva_enabled=${vivaEnabled}, additional_enabled=${additionalEnabled}, updated_at=now() WHERE id=${targetExamId} AND archived=false RETURNING id`;
      if (!exam) return NextResponse.json({ error: 'The selected examination was not found.' }, { status: 404 });
    }
    for (const student of latestByEmail.values()) {
      const [saved] = await sql`
        INSERT INTO students(email, full_name, gender) VALUES (${student.email}, ${student.fullName}, ${student.gender})
        ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name, gender=COALESCE(excluded.gender, students.gender), updated_at=now()
        RETURNING id
      `;
      await sql`
        INSERT INTO written_results(student_id, exam_id, raw_score, max_score) VALUES (${saved.id}, ${targetExamId}, ${student.score}, ${writtenMax})
        ON CONFLICT(student_id, exam_id) DO UPDATE SET raw_score=excluded.raw_score, max_score=excluded.max_score, updated_at=now()
      `;
    }
    return NextResponse.json({ ok: true, imported: latestByEmail.size, skipped, examId: targetExamId, createdExam, message: `${latestByEmail.size} student result${latestByEmail.size === 1 ? '' : 's'} imported successfully${createdExam ? ` into ${newExamName}` : ''}.` });
  } catch (error) {
    console.error('Excel import failed', error);
    return NextResponse.json({ error: 'Unable to import this Excel file.' }, { status: 500 });
  }
}
