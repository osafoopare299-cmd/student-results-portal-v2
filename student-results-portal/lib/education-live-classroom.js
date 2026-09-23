export async function ensureLiveClassroomSchema(sql) {
  await sql`create table if not exists edu_live_classes (
    id bigserial primary key,
    offering_id bigint not null references edu_course_offerings(id) on delete cascade,
    title text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    daily_room_name text not null unique,
    status text not null default 'scheduled',
    created_by bigint not null references edu_users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql`create index if not exists edu_live_classes_offering_idx on edu_live_classes(offering_id,starts_at desc)`;
  await sql`alter table edu_live_classes add column if not exists host_user_id bigint references edu_users(id)`;
  await sql`update edu_live_classes set host_user_id=created_by where host_user_id is null`;
  await sql`create table if not exists edu_live_attendance (
    id bigserial primary key,
    live_class_id bigint not null references edu_live_classes(id) on delete cascade,
    user_id bigint not null references edu_users(id) on delete cascade,
    first_joined_at timestamptz,
    current_joined_at timestamptz,
    last_left_at timestamptz,
    total_seconds integer not null default 0,
    join_count integer not null default 0,
    updated_at timestamptz not null default now(),
    unique(live_class_id,user_id)
  )`;
  await sql`create index if not exists edu_live_attendance_class_idx on edu_live_attendance(live_class_id,total_seconds desc)`;
  await sql`create table if not exists edu_live_breakout_rooms (
    id bigserial primary key,
    live_class_id bigint not null references edu_live_classes(id) on delete cascade,
    name text not null,
    daily_room_name text not null unique,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists edu_live_breakout_assignments (
    breakout_room_id bigint not null references edu_live_breakout_rooms(id) on delete cascade,
    student_user_id bigint not null references edu_users(id) on delete cascade,
    primary key(breakout_room_id,student_user_id)
  )`;
}

export const cleanText = (value, max = 200) => String(value ?? '').trim().slice(0, max);

export function roomName(prefix, id) {
  const random=crypto.randomUUID().replace(/-/g,'');
  return `dropare-${prefix}-${id}-${random}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64);
}

export async function closeAttendance(sql, liveClassId, userId) {
  await sql`update edu_live_attendance set
    total_seconds=total_seconds+greatest(0,extract(epoch from (now()-current_joined_at))::int),
    last_left_at=now(),current_joined_at=null,updated_at=now()
    where live_class_id=${liveClassId} and user_id=${userId} and current_joined_at is not null`;
}
