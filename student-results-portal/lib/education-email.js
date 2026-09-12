const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function config() {
  const apiKey = process.env.RESEND_API_KEY,
    from = process.env.RESEND_FROM_EMAIL;
  const appUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "");
  return { apiKey, from, appUrl, ready: Boolean(apiKey && from && appUrl) };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeKey = (value) =>
  String(value ?? "update")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 120);

export async function educationOfferingRecipients(
  sql,
  offeringId,
  { students = true, lecturer = false } = {},
) {
  const rows = [];
  if (students)
    rows.push(
      ...(await sql`select distinct u.id,u.full_name,u.email,'student' as role from edu_enrolments e join edu_users u on u.id=e.student_user_id where e.offering_id=${offeringId} and e.status='active' and u.status='active' and u.email is not null`),
    );
  if (lecturer)
    rows.push(
      ...(await sql`select distinct u.id,u.full_name,u.email,'lecturer' as role from edu_course_offerings o join edu_users u on u.id=o.lecturer_user_id where o.id=${offeringId} and u.status='active' and u.email is not null`),
    );
  return [
    ...new Map(
      rows
        .filter((row) => row.email)
        .map((row) => [String(row.email).toLowerCase(), row]),
    ).values(),
  ];
}

export async function sendEducationUpdateEmails({
  recipients,
  title,
  message,
  kind = "Platform update",
  course = "",
  actionPath = "/education",
  eventId = "update",
}) {
  const { apiKey, from, appUrl, ready } = config();
  const people = [
    ...new Map(
      (recipients || [])
        .filter((person) => person?.email)
        .map((person) => [String(person.email).toLowerCase(), person]),
    ).values(),
  ];
  if (!ready || !people.length)
    return { sent: 0, failed: 0, skipped: people.length, configured: ready };
  const url = `${appUrl}${actionPath.startsWith("/") ? actionPath : `/${actionPath}`}`;
  const results = [];
  for (let index = 0; index < people.length; index += 8) {
    const batch = people.slice(index, index + 8);
    const settled = await Promise.allSettled(
      batch.map(async (person) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `edu-${safeKey(kind)}-${safeKey(eventId)}-${safeKey(person.id)}`,
          },
          body: JSON.stringify({
            from,
            to: [person.email],
            subject: `${course ? `${course}: ` : ""}${title}`,
            html: `<div style="background:#eef7f2;padding:32px 16px;font-family:Arial,sans-serif;color:#153c30"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #d8e8e0;border-radius:16px;padding:32px"><p style="color:#08744d;font-size:13px;font-weight:700;letter-spacing:.08em">DROPARE EDUCATION · ${escapeHtml(kind.toUpperCase())}</p><h1 style="font-size:25px">${escapeHtml(title)}</h1><p>Hello ${escapeHtml(person.full_name || "there")},</p><p>${escapeHtml(message)}</p><p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:#08744d;color:#fff;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:700">Open Education platform</a></p><p style="color:#667b72;font-size:13px">This automatic email was sent because this update applies to your Education account.</p></div></div>`,
          }),
        });
        if (!response.ok)
          throw new Error(
            `Resend returned ${response.status}: ${await response.text()}`,
          );
        return response.json();
      }),
    );
    results.push(...settled);
    if (index + 8 < people.length) await wait(1100);
  }
  const sent = results.filter((result) => result.status === "fulfilled").length,
    failed = results.length - sent;
  if (failed)
    console.error("Education update email delivery incomplete", {
      kind,
      eventId,
      sent,
      failed,
    });
  return { sent, failed, skipped: 0, configured: true };
}

export async function deliverEducationEmail(options) {
  try {
    return await sendEducationUpdateEmails(options);
  } catch (error) {
    console.error("Education update email delivery failed", error);
    return {
      sent: 0,
      failed: (options.recipients || []).length,
      skipped: 0,
      configured: true,
    };
  }
}
