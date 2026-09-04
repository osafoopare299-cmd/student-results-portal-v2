export async function ensureEducationAttendanceSchema(sql){
  await sql`create table if not exists edu_attendance_sessions (
    id bigserial primary key,
    offering_id bigint not null references edu_course_offerings(id) on delete cascade,
    timetable_event_id bigint references edu_timetable_events(id) on delete set null,
    title text not null,
    session_date date not null,
    starts_at timestamptz,
    ends_at timestamptz,
    status text not null default 'draft' check (status in ('draft','published')),
    created_by bigint not null references edu_users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists edu_attendance_records (
    id bigserial primary key,
    session_id bigint not null references edu_attendance_sessions(id) on delete cascade,
    student_user_id bigint not null references edu_users(id) on delete cascade,
    attendance_status text not null check (attendance_status in ('present','absent','late','excused')),
    note text,
    marked_by bigint references edu_users(id),
    marked_at timestamptz not null default now(),
    unique(session_id,student_user_id)
  )`;
  await sql`create index if not exists edu_attendance_sessions_offering_idx on edu_attendance_sessions(offering_id,session_date desc)`;
  await sql`create index if not exists edu_attendance_records_student_idx on edu_attendance_records(student_user_id,session_id)`;
}
