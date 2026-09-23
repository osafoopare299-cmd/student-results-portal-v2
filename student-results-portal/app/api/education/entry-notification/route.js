import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../lib/education-session';
import { getEducationSql } from '../../../../lib/db';
import { deliverEducationEmail } from '../../../../lib/education-email';
import { isAdmin } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

function cleanSessionId(value) {
  const sessionId = String(value || '').trim();
  return /^[a-zA-Z0-9-]{16,100}$/.test(sessionId) ? sessionId : '';
}

function configuredAdministratorRecipients() {
  return String(process.env.EDUCATION_ADMIN_EMAIL || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    .map((email) => ({ id: `configured-${email}`, full_name: 'Education Administrator', email, role: 'admin' }));
}

export async function POST(request) {
  const access = await getEducationUser();
  const legacyAdministrator = !access.ok && await isAdmin();
  const entrant = access.ok
    ? access.user
    : legacyAdministrator
      ? { id: null, full_name: 'Administrator', email: '', role: 'admin' }
      : null;
  if (!entrant) {
    return NextResponse.json({ ok: false, error: 'Education sign-in required.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = cleanSessionId(body.sessionId);
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'Invalid app session.' }, { status: 400 });
    }

    const sql = getEducationSql();
    await sql`create table if not exists edu_entry_notifications (
      id bigserial primary key,
      user_id bigint references edu_users(id) on delete cascade,
      session_id text not null unique,
      notified_at timestamptz not null default now()
    )`;
    await sql`create index if not exists edu_entry_notifications_user_idx on edu_entry_notifications(user_id,notified_at desc)`;

    const claimed = await sql`insert into edu_entry_notifications (user_id,session_id)
      values (${entrant.id},${sessionId})
      on conflict (session_id) do nothing
      returning id`;
    if (!claimed.length) {
      return NextResponse.json({ ok: true, duplicate: true, notified: false });
    }

    const databaseAdministrators = await sql`select id,full_name,email,'admin' as role
      from edu_users
      where role='admin' and status='active' and nullif(trim(email),'') is not null
      order by id`;
    const configuredAdministrators = configuredAdministratorRecipients();
    const administrators = [...new Map(
      (configuredAdministrators.length ? configuredAdministrators : databaseAdministrators)
        .map((administrator) => [String(administrator.email).toLowerCase(), administrator])
    ).values()];
    if (!administrators.length) {
      await sql`delete from edu_entry_notifications where session_id=${sessionId}`;
      console.warn('Education entry notification skipped: no active administrator email is configured.');
      return NextResponse.json({ ok: false, error: 'No active administrator email is configured.' }, { status: 503 });
    }

    const enteredAt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Accra',
      dateStyle: 'medium',
      timeStyle: 'long',
    }).format(new Date());
    const role = String(entrant.role || 'user');
    const identity = entrant.email ? `${entrant.full_name} (${entrant.email})` : entrant.full_name;
    const delivery = await deliverEducationEmail({
      recipients: administrators,
      title: `${entrant.full_name} entered Dropare Education`,
      message: `${identity} opened the Education app as ${role} on ${enteredAt}.`,
      kind: 'User entry alert',
      actionPath: '/education/admin',
      eventId: `entry-${sessionId}`,
    });

    if (!delivery.sent) {
      await sql`delete from edu_entry_notifications where session_id=${sessionId}`;
      return NextResponse.json({ ok: false, error: 'Administrator email notification could not be sent.' }, { status: 503 });
    }

    await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      values (${entrant.id},'education_app_entered','edu_user',${entrant.id ? String(entrant.id) : 'administrator'},${JSON.stringify({ sessionId, administratorEmailsSent: delivery.sent, role })}::jsonb)`;

    return NextResponse.json({ ok: true, notified: true, sent: delivery.sent });
  } catch (error) {
    console.error('Education entry notification failed:', error);
    return NextResponse.json({ ok: false, error: 'Administrator email notification could not be sent.' }, { status: 503 });
  }
}
