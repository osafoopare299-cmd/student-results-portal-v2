import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';

async function ensureSchema(sql){
  await sql`
    create table if not exists edu_student_material_library (
      id bigserial primary key,
      student_user_id bigint not null references edu_users(id) on delete cascade,
      material_id bigint not null references edu_learning_materials(id) on delete cascade,
      bookmarked boolean not null default false,
      personal_note text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(student_user_id,material_id)
    )
  `;
  await sql`create index if not exists edu_student_material_library_student_idx on edu_student_material_library(student_user_id,updated_at desc)`;
}

async function accessibleMaterial(sql,studentId,materialId){
  const rows=await sql`
    select m.id,m.title,m.offering_id,c.code,c.title as course_title
    from edu_learning_materials m
    join edu_course_offerings o on o.id=m.offering_id
    join edu_courses c on c.id=o.course_id
    join edu_enrolments e on e.offering_id=o.id
    where m.id=${materialId}
      and m.is_published=true
      and e.student_user_id=${studentId}
      and e.status='active'
    limit 1
  `;
  return rows[0]||null;
}

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    await ensureSchema(sql);
    const rows=await sql`
      select l.material_id,l.bookmarked,l.personal_note,l.updated_at
      from edu_student_material_library l
      join edu_learning_materials m on m.id=l.material_id
      join edu_course_offerings o on o.id=m.offering_id
      join edu_enrolments e on e.offering_id=o.id
      where l.student_user_id=${access.user.id}
        and m.is_published=true
        and e.student_user_id=${access.user.id}
        and e.status='active'
      order by l.updated_at desc
    `;
    return NextResponse.json({ok:true,library:rows});
  }catch(error){
    console.error('Student study library unavailable:',error);
    return NextResponse.json({ok:false,error:'Unable to load bookmarks and notes.'},{status:503});
  }
}

export async function PATCH(request){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const body=await request.json();
    const materialId=Number(body.materialId);
    if(!Number.isInteger(materialId)||materialId<1)return NextResponse.json({ok:false,error:'Invalid material.'},{status:400});
    const hasBookmark=typeof body.bookmarked==='boolean';
    const hasNote=Object.prototype.hasOwnProperty.call(body,'personalNote');
    if(!hasBookmark&&!hasNote)return NextResponse.json({ok:false,error:'No library change supplied.'},{status:400});
    const note=hasNote?String(body.personalNote||'').trim():null;
    if(note!==null&&note.length>12000)return NextResponse.json({ok:false,error:'Personal note is too long.'},{status:400});

    const sql=getEducationSql();
    await ensureSchema(sql);
    const material=await accessibleMaterial(sql,access.user.id,materialId);
    if(!material)return NextResponse.json({ok:false,error:'This learning material is not available to your active enrolments.'},{status:403});

    const current=await sql`select bookmarked,personal_note from edu_student_material_library where student_user_id=${access.user.id} and material_id=${materialId} limit 1`;
    const nextBookmarked=hasBookmark?Boolean(body.bookmarked):Boolean(current[0]?.bookmarked);
    const nextNote=hasNote?(note||null):(current[0]?.personal_note||null);

    const rows=await sql`
      insert into edu_student_material_library(student_user_id,material_id,bookmarked,personal_note)
      values(${access.user.id},${materialId},${nextBookmarked},${nextNote})
      on conflict(student_user_id,material_id) do update set
        bookmarked=excluded.bookmarked,
        personal_note=excluded.personal_note,
        updated_at=now()
      returning material_id,bookmarked,personal_note,updated_at
    `;
    await sql`
      insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      values(${access.user.id},'student.material.library.update','edu_learning_materials',${String(materialId)},${JSON.stringify({bookmarked:nextBookmarked,noteUpdated:hasNote,courseCode:material.code})}::jsonb)
    `;
    return NextResponse.json({ok:true,item:rows[0]});
  }catch(error){
    console.error('Student study library update failed:',error);
    return NextResponse.json({ok:false,error:'Unable to update your study library.'},{status:503});
  }
}
