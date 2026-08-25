const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  return { apiKey, from, appUrl, ready: Boolean(apiKey && from && appUrl) };
}

export function resultEmailIsConfigured() {
  return emailConfig().ready;
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1100;
const MAX_RATE_LIMIT_RETRIES = 3;
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function sendParticipantEmail({ apiKey, from, appUrl, exam, student, alertId }) {
  const request = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `result-alert-${alertId}-${exam.id}-${student.id}`,
    },
    body: JSON.stringify({
      from,
      to: [student.email],
      subject: `Your ${exam.exam_name} result is ready`,
      html: `
        <div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#172033">
          <div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e4eaf2;border-radius:16px;padding:32px">
            <p style="color:#4f6b95;font-size:13px;font-weight:700;letter-spacing:.08em">ACADEMIC RESULTS</p>
            <h1 style="font-size:25px">Your result is ready</h1>
            <p>Hello ${escapeHtml(student.full_name)},</p>
            <p>Your result for <strong>${escapeHtml(exam.exam_name)}</strong> has been published by DR. OPARE.</p>
            <p style="margin:28px 0"><a href="${escapeHtml(appUrl)}" style="background:#173f73;color:#fff;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:700">View your result</a></p>
            <p style="color:#667085;font-size:14px">Use the same email address you used for the examination.</p>
            <p style="margin-top:28px">Regards,<br><strong>DR. OPARE</strong></p>
          </div>
        </div>`,
    }),
  };

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await fetch('https://api.resend.com/emails', request);
    if (response.ok) return response.json();

    const detail = await response.text();
    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const retryDelay = BATCH_DELAY_MS * (attempt + 1);
      console.warn('Resend rate limit reached; retrying participant', {
        examId: exam.id,
        studentId: student.id,
        attempt: attempt + 1,
        retryDelay,
      });
      await wait(retryDelay);
      continue;
    }

    console.error('Resend delivery failed', { examId: exam.id, studentId: student.id, status: response.status, detail });
    throw new Error(`Resend returned ${response.status}`);
  }
}

export async function sendResultPublishedEmails({ exam, students, alertId = 'published' }) {
  const { apiKey, from, appUrl } = emailConfig();
  const results = [];

  for (let index = 0; index < students.length; index += BATCH_SIZE) {
    const batch = students.slice(index, index + BATCH_SIZE);
    const batchResults = await Promise.allSettled(batch.map((student) =>
      sendParticipantEmail({ apiKey, from, appUrl, exam, student, alertId })
    ));
    results.push(...batchResults);
    if (index + BATCH_SIZE < students.length) await wait(BATCH_DELAY_MS);
  }

  const sent = results.filter((result) => result.status === 'fulfilled').length;
  return { sent, failed: results.length - sent };
}
