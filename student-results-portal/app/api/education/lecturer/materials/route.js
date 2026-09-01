import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';
const clean=(v,max=5000)=>String(v??'').trim().slice(0,max);

export async function GET(){
 const access=await getEducationUser('lecturer'); if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
 try{const sql=getEducationSql();
  const offerings=await sql`select o.id,c.code,c.title,cl.name as class_name,y.name as academic_year,o.term from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id where o.lecturer_user_id=${access.user.id} order by y.name desc,c.code`;
  const materials=await sql`select m.id,m.offering_id,m.title,m.description,m.material_type,m.resource_url,m.content_text,m.is_offline_available,m.is_ai_approved,m.published_at,m.created_at,c.code,c.title as course_title,cl.name as class_name from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where m.created_by=${access.user.id} order by m.created_at desc limit 200`;
  return NextResponse.json({ok:true,offerings,materials});
 }catch(error){console.error('Lecturer materials unavailable:',error);return NextResponse.json({ok:false,error:'Learning materials database setup is not ready yet.'},{status:503});}
}

export async function POST(request){
 const access=await getEducationUser('lecturer'); if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
 try{
  const b=await request.json(),sql=getEducationSql();
  const offeringId=b.offeringId,title=clean(b.title,240),description=clean(b.description,2000)||null,materialType=clean(b.materialType,20)||'note',resourceUrl=clean(b.resourceUrl,1500)||null,contentText=clean(b.contentText,20000)||null;
  if(!offeringId||!title||!['note','pdf','video','link'].includes(materialType))return NextResponse.json({ok:false,error:'Course offering, title and valid material type are required.'},{status:400});
  if(['pdf','video','link'].includes(materialType)&&!resourceUrl)return NextResponse.json({ok:false,error:'A resource URL is required for PDF, video and link materials.'},{status:400});
  if(Boolean(b.aiApproved)&&!contentText)return NextResponse.json({ok:false,error:'Add approved text/content before enabling this material as an AI Tutor source.'},{status:400});
  const own=await sql`select id from edu_course_offerings where id=${offeringId} and lecturer_user_id=${access.user.id} limit 1`;
  if(!own.length)return NextResponse.json({ok:false,error:'You can only publish to your assigned courses.'},{status:403});
  const publishedAt=b.publish?new Date().toISOString():null;
  const rows=await sql`insert into edu_learning_materials (offering_id,created_by,title,description,material_type,resource_url,content_text,is_offline_available,is_ai_approved,published_at) values (${offeringId},${access.user.id},${title},${description},${materialType},${resourceUrl},${contentText},${Boolean(b.offline)},${Boolean(b.aiApproved)},${publishedAt}) returning id,title,published_at`;
  await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${access.user.id},'learning_material_created','edu_learning_material',${String(rows[0].id)},${JSON.stringify({published:Boolean(publishedAt),materialType})}::jsonb)`;
  return NextResponse.json({ok:true,material:rows[0]});
 }catch(error){console.error('Material save unavailable:',error);return NextResponse.json({ok:false,error:'Unable to save learning material.'},{status:503});}
}
