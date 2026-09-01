import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';
import { ensureEducationMaterialFileSchema,educationBlobConfigured } from '../../../../../../lib/education-material-files';

export const dynamic='force-dynamic';
const clean=(v,max=5000)=>String(v??'').trim().slice(0,max);

async function ownedMaterial(sql,id,userId){
  const rows=await sql`select m.*,o.lecturer_user_id from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id where m.id=${id} and o.lecturer_user_id=${userId} and m.created_by=${userId} limit 1`;
  return rows?.[0];
}

export async function PATCH(request,{params}){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const {id}=await params,b=await request.json(),sql=getEducationSql();await ensureEducationMaterialFileSchema(sql);const material=await ownedMaterial(sql,id,access.user.id);
    if(!material)return NextResponse.json({ok:false,error:'Learning material not found.'},{status:404});
    const title=clean(b.title??material.title,240);
    const description=clean(b.description??material.description,2000)||null;
    const materialType=clean(b.materialType??material.material_type,20);
    const resourceUrl=clean(b.resourceUrl??material.resource_url,1500)||null;
    const contentText=clean(b.contentText??material.content_text,20000)||null;
    const blobPathname=b.blobPathname===undefined?material.blob_pathname:(clean(b.blobPathname,2000)||null);
    const originalFilename=b.originalFilename===undefined?material.original_filename:(clean(b.originalFilename,500)||null);
    const fileContentType=b.fileContentType===undefined?material.file_content_type:(clean(b.fileContentType,200)||null);
    const fileSizeBytes=b.fileSizeBytes===undefined?material.file_size_bytes:(Number(b.fileSizeBytes||0)||null);
    if(!title||!['note','pdf','video','link'].includes(materialType))return NextResponse.json({ok:false,error:'A title and valid material type are required.'},{status:400});
    if(materialType==='link'&&!resourceUrl)return NextResponse.json({ok:false,error:'A resource URL is required for link materials.'},{status:400});
    if(['pdf','video'].includes(materialType)&&!resourceUrl&&!blobPathname)return NextResponse.json({ok:false,error:'Upload a file or provide a resource URL for PDF and video materials.'},{status:400});
    if(blobPathname&&!['pdf','video'].includes(materialType))return NextResponse.json({ok:false,error:'Uploaded files can only be attached to PDF or video materials.'},{status:400});
    if(blobPathname&&!String(blobPathname).startsWith(`education/${material.offering_id}/`))return NextResponse.json({ok:false,error:'Uploaded file does not belong to this course offering.'},{status:400});
    const offline=b.offline===undefined?material.is_offline_available:Boolean(b.offline);
    const aiApproved=b.aiApproved===undefined?material.is_ai_approved:Boolean(b.aiApproved);
    if(aiApproved&&!contentText)return NextResponse.json({ok:false,error:'Add approved text/content before enabling this material as an AI Tutor source.'},{status:400});
    let publishedAt=material.published_at;
    if(b.publish===true&&!publishedAt)publishedAt=new Date().toISOString();
    if(b.publish===false)publishedAt=null;
    const rows=await sql`update edu_learning_materials set title=${title},description=${description},material_type=${materialType},resource_url=${resourceUrl},content_text=${contentText},is_offline_available=${offline},is_ai_approved=${aiApproved},published_at=${publishedAt},blob_pathname=${blobPathname},original_filename=${originalFilename},file_content_type=${fileContentType},file_size_bytes=${fileSizeBytes},updated_at=now() where id=${id} returning id,title,published_at,is_offline_available,is_ai_approved`;
    if(material.blob_pathname&&material.blob_pathname!==blobPathname&&educationBlobConfigured()){
      try{await del(material.blob_pathname);}catch(error){console.error('Old learning file cleanup failed:',error);}
    }
    await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${access.user.id},'learning_material_updated','edu_learning_material',${String(id)},${JSON.stringify({published:Boolean(publishedAt),offline,aiApproved,uploadedFile:Boolean(blobPathname),originalFilename})}::jsonb)`;
    return NextResponse.json({ok:true,material:rows[0]});
  }catch(error){console.error('Learning material update unavailable:',error);return NextResponse.json({ok:false,error:'Unable to update learning material.'},{status:503});}
}

export async function DELETE(request,{params}){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const {id}=await params,sql=getEducationSql();await ensureEducationMaterialFileSchema(sql);const material=await ownedMaterial(sql,id,access.user.id);
    if(!material)return NextResponse.json({ok:false,error:'Learning material not found.'},{status:404});
    await sql`delete from edu_learning_materials where id=${id}`;
    if(material.blob_pathname&&educationBlobConfigured()){
      try{await del(material.blob_pathname);}catch(error){console.error('Learning file cleanup failed:',error);}
    }
    await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${access.user.id},'learning_material_deleted','edu_learning_material',${String(id)},${JSON.stringify({title:material.title,uploadedFile:Boolean(material.blob_pathname),originalFilename:material.original_filename||null})}::jsonb)`;
    return NextResponse.json({ok:true});
  }catch(error){console.error('Learning material delete unavailable:',error);return NextResponse.json({ok:false,error:'Unable to delete learning material.'},{status:503});}
}
