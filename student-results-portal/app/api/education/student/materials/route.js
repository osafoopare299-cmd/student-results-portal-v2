import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationMaterialFileSchema,educationBlobConfigured } from '../../../../../lib/education-material-files';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok) return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();await ensureEducationMaterialFileSchema(sql);
    const offerings=await sql`
      select o.id,c.code,c.title,cl.name as class_name,y.name as academic_year,o.term,
             u.full_name as lecturer_name,
             count(m.id)::int as materials_count,
             count(m.id) filter (where m.is_offline_available=true)::int as offline_count,
             count(m.id) filter (where m.is_ai_approved=true)::int as ai_count
      from edu_enrolments e
      join edu_course_offerings o on o.id=e.offering_id
      join edu_courses c on c.id=o.course_id
      join edu_classes cl on cl.id=o.class_id
      join edu_academic_years y on y.id=o.academic_year_id
      left join edu_users u on u.id=o.lecturer_user_id
      left join edu_learning_materials m on m.offering_id=o.id and m.published_at is not null
      where e.student_user_id=${access.user.id} and e.status='active'
      group by o.id,c.code,c.title,cl.name,y.name,o.term,u.full_name
      order by y.name desc,c.code,cl.name
    `;
    const rows=await sql`
      select m.id,m.offering_id,m.title,m.description,m.material_type,m.resource_url,m.content_text,
             m.is_offline_available,m.is_ai_approved,m.published_at,m.blob_pathname,m.original_filename,m.file_content_type,m.file_size_bytes,
             c.code,c.title as course_title,cl.name as class_name,y.name as academic_year,o.term,
             u.full_name as lecturer_name
      from edu_enrolments e
      join edu_course_offerings o on o.id=e.offering_id
      join edu_learning_materials m on m.offering_id=o.id and m.published_at is not null
      join edu_courses c on c.id=o.course_id
      join edu_classes cl on cl.id=o.class_id
      join edu_academic_years y on y.id=o.academic_year_id
      left join edu_users u on u.id=o.lecturer_user_id
      where e.student_user_id=${access.user.id} and e.status='active'
      order by m.published_at desc,m.id desc
      limit 300
    `;
    const materials=rows.map(m=>({...m,file_url:m.blob_pathname?`/api/education/student/material-file?materialId=${encodeURIComponent(m.id)}`:(m.resource_url||null),has_uploaded_file:Boolean(m.blob_pathname)}));
    return NextResponse.json({ok:true,offerings,materials,fileStorageConfigured:educationBlobConfigured()});
  }catch(error){
    console.error('Student learning materials unavailable:',error);
    return NextResponse.json({ok:false,error:'Learning materials database setup is not ready yet.'},{status:503});
  }
}
