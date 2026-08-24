import { Resend } from 'resend';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function getPortalUrl() {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = configured || (vercelUrl ? `https://${vercelUrl}` : '');
  return url.replace(/\/$/, '');
}

export async function sendPublishedResultNotifications({ exam, students }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const portalUrl = getPortalUrl();

  if (!apiKey || !from || !portalUrl) {
    const missing = [
      !apiKey && 'RESEND_API_KEY',
      !from && 'RESEND_FROM_EMAIL',
      !portalUrl && 'APP_URL',
    ].filter(Boolean);
    return {
      sent: 0,
      failed: students.length,
      skipped: true,
      error: `Email is not configured. Missing: ${missing.join(', ')}.`,
    };
  }

  const resend = new Resend(apiKey);
  const results = await Promise.allSettled(students.map(async (student) => {
    const fullName = escapeHtml(student.full_name);
    const examName = escapeHtml(exam.exam_name);
    const subject = exam.subject ? escapeHtml(exam.subject) : '';

    const { data, error } = await resend.emails.send({
      from,
      to: student.email,
      subject: `Your ${exam.exam_name} result is ready`,
      html: `
        <div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#172033">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e4eaf2">
            <p style="margin:0 0 8px;color:#4f6b95;font-size:13px;font-weight:700;letter-spacing:.08em">ACADEMIC RESULTS</p>
            <h1 style="margin:0 0 20px;font-size:25px">Your result is ready</h1>
            <p>Hello ${fullName},</p>
            <p>Your result for <strong>${examName}</strong>${subject ? ` (${subject})` : ''} has been published by DR. OPARE.</p>
            <p style="margin:28px 0">
              <a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#173f73;color:#fff;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:700">View your result</a>
            </p>
            <p style="color:#667085;font-size:14px">Use the same email address that you used for the examination to access your result.</p>
            <p style="margin-top:28px">Regards,<br><strong>DR. OPARE</strong></p>
          </div>
        </div>`,
    }, {
      headers: { 'Idempotency-Key': `published-result-${exam.id}-${student.id}` },
    });

    if (error) throw new Error(error.message || 'Resend rejected the email');
    return data;
  }));

  const sent = results.filter((result) => result.status === 'fulfilled').length;
  const failed = results.length - sent;
  return { sent, failed, skipped: false };
}
