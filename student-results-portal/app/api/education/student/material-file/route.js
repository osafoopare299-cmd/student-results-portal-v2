import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationMaterialFileSchema,educationBlobConfigured } from '../../../../../lib/education-material-files';

export const dynamic='force-dynamic';

export async function GET(request){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  if(!educationBlobConfigured())return NextResponse.json({ok:false,error:'File storage is not configured.'},{status:503});
  try{
    const materialId=Number(new URL(request.url).searchParams.get('materialId'));
    if(!Number.isFinite(materialId))return NextResponse.json({ok:false,error:'Material is required.'},{status:400});
    const sql=getEducationSql();await ensureEducationMaterialFileSchema(sql);
    const material=(await sql`select m.id,m.blob_pathname,m.original_filename,m.file_content_type from edu_learning_materials m join edu_enrolments e on e.offering_id=m.offering_id where m.id=${materialId} and m.published_at is not null and e.student_user_id=${access.user.id} and e.status='active' and m.blob_pathname is not null limit 1`)[0];
    if(!material)return NextResponse.json({ok:false,error:'Learning file not available.'},{status:404});
    const result=await get(material.blob_pathname,{access:'private'});
    if(!result||result.statusCode!==200)return NextResponse.json({ok:false,error:'Learning file not found.'},{status:404});
    const filename=String(material.original_filename||'learning-resource').replace(/[\r\n"]/g,'');
    return new NextResponse(result.stream,{headers:{
      'Content-Type':material.file_content_type||result.blob?.contentType||'application/octet-stream',
      'Content-Disposition':`inline; filename="${filename}"`,
      'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff'
    }});
  }catch(error){console.error('Student learning file unavailable:',error);return NextResponse.json({ok:false,error:'Unable to open learning file.'},{status:503});}
}
