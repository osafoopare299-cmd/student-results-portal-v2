import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { educationDatabaseIsIsolated, getEducationSql } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

async function guard(){
  if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  return null;
}

async function status(sql){
  const rows=await sql`
    select
      to_regclass('public.edu_users') is not null as users,
      to_regclass('public.edu_courses') is not null as courses,
      to_regclass('public.edu_course_offerings') is not null as offerings,
      to_regclass('public.edu_enrolments') is not null as enrolments,
      to_regclass('public.edu_learning_materials') is not null as materials
  `;
  const s=rows?.[0]||{};
  return {foundation:Boolean(s.users&&s.courses&&s.offerings&&s.enrolments),materials:Boolean(s.materials)};
}

export async function GET(){
  const denied=await guard(); if(denied) return denied;
  if(!process.env.EDUCATION_DATABASE_URL) return NextResponse.json({ok:true,configured:false,isolated:false,status:{foundation:false,materials:false}});
  if(!educationDatabaseIsIsolated()) return NextResponse.json({ok:false,error:'Education database must be isolated from the results database.'},{status:409});
  try{const sql=getEducationSql();return NextResponse.json({ok:true,configured:true,isolated:true,status:await status(sql)});}catch(error){console.error('Education setup status failed:',error);return NextResponse.json({ok:false,error:'Unable to connect to the education database.'},{status:503});}
}

export async function POST(){
  const denied=await guard(); if(denied) return denied;
  if(!process.env.EDUCATION_DATABASE_URL) return NextResponse.json({ok:false,error:'EDUCATION_DATABASE_URL is not configured.'},{status:503});
  if(!educationDatabaseIsIsolated()) return NextResponse.json({ok:false,error:'Refusing setup because the education database is not isolated from the results database.'},{status:409});
  try{
    const sql=getEducationSql();
    await sql`create table if not exists edu_academic_years (id bigserial primary key,name text not null unique,starts_on date,ends_on date,is_active boolean not null default false,created_at timestamptz not null default now())`;
    await sql`create table if not exists edu_users (id bigserial primary key,email text not null,full_name text not null,role text not null check (role in ('student','lecturer','admin')),status text not null default 'active' check (status in ('active','inactive','suspended')),external_auth_id text,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
    await sql`create unique index if not exists edu_users_email_lower_uidx on edu_users (lower(email))`;
    await sql`create unique index if not exists edu_users_external_auth_uidx on edu_users (external_auth_id) where external_auth_id is not null`;
    await sql`create table if not exists edu_classes (id bigserial primary key,academic_year_id bigint references edu_academic_years(id),name text not null,code text,level text,created_at timestamptz not null default now())`;
    await sql`create table if not exists edu_courses (id bigserial primary key,code text not null,title text not null,description text,active boolean not null default true,created_at timestamptz not null default now())`;
    await sql`create unique index if not exists edu_courses_code_lower_uidx on edu_courses (lower(code))`;
    await sql`create table if not exists edu_student_profiles (user_id bigint primary key references edu_users(id) on delete cascade,student_number text,class_id bigint references edu_classes(id),phone text,profile_photo_url text,created_at timestamptz not null default now())`;
    await sql`create unique index if not exists edu_student_number_uidx on edu_student_profiles (student_number) where student_number is not null`;
    await sql`create table if not exists edu_lecturer_profiles (user_id bigint primary key references edu_users(id) on delete cascade,staff_number text,department text,title text,phone text,created_at timestamptz not null default now())`;
    await sql`create table if not exists edu_course_offerings (id bigserial primary key,course_id bigint not null references edu_courses(id),class_id bigint not null references edu_classes(id),academic_year_id bigint not null references edu_academic_years(id),lecturer_user_id bigint references edu_users(id),term text,created_at timestamptz not null default now(),unique(course_id,class_id,academic_year_id,term))`;
    await sql`create table if not exists edu_enrolments (id bigserial primary key,student_user_id bigint not null references edu_users(id) on delete cascade,offering_id bigint not null references edu_course_offerings(id) on delete cascade,status text not null default 'active' check (status in ('active','completed','withdrawn')),enrolled_at timestamptz not null default now(),unique(student_user_id,offering_id))`;
    await sql`create table if not exists edu_timetable_events (id bigserial primary key,offering_id bigint references edu_course_offerings(id) on delete cascade,title text not null,event_type text not null default 'class',location text,starts_at timestamptz not null,ends_at timestamptz not null,online_url text,created_by bigint references edu_users(id),created_at timestamptz not null default now())`;
    await sql`create table if not exists edu_announcements (id bigserial primary key,author_user_id bigint references edu_users(id),offering_id bigint references edu_course_offerings(id) on delete cascade,class_id bigint references edu_classes(id) on delete cascade,title text not null,body text not null,published_at timestamptz,created_at timestamptz not null default now())`;
    await sql`create table if not exists edu_role_permissions (id bigserial primary key,user_id bigint not null references edu_users(id) on delete cascade,permission text not null,scope_type text,scope_id bigint,created_at timestamptz not null default now(),unique(user_id,permission,scope_type,scope_id))`;
    await sql`create table if not exists edu_audit_logs (id bigserial primary key,actor_user_id bigint references edu_users(id),action text not null,entity_type text,entity_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now())`;
    await sql`create index if not exists edu_enrolments_student_idx on edu_enrolments(student_user_id)`;
    await sql`create index if not exists edu_offerings_lecturer_idx on edu_course_offerings(lecturer_user_id)`;
    await sql`create index if not exists edu_timetable_start_idx on edu_timetable_events(starts_at)`;
    await sql`create index if not exists edu_announcements_published_idx on edu_announcements(published_at desc)`;
    await sql`create index if not exists edu_audit_actor_idx on edu_audit_logs(actor_user_id,created_at desc)`;
    await sql`create table if not exists edu_learning_materials (id bigserial primary key,offering_id bigint not null references edu_course_offerings(id) on delete cascade,created_by bigint not null references edu_users(id),title text not null,description text,material_type text not null default 'note' check (material_type in ('note','pdf','video','link')),resource_url text,content_text text,is_offline_available boolean not null default false,is_ai_approved boolean not null default false,published_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
    await sql`create index if not exists edu_learning_materials_offering_idx on edu_learning_materials(offering_id,published_at desc)`;
    await sql`create index if not exists edu_learning_materials_ai_idx on edu_learning_materials(offering_id,is_ai_approved) where published_at is not null`;
    return NextResponse.json({ok:true,status:await status(sql)});
  }catch(error){console.error('Education setup failed:',error);return NextResponse.json({ok:false,error:'Education database setup failed. No production database changes were attempted.'},{status:503});}
}
