import {NextResponse} from 'next/server';
import {get} from '@vercel/blob';
import {PDFParse} from 'pdf-parse';
import {getEducationUser} from '../../../../../../../lib/education-session';
import {getEducationSql} from '../../../../../../../lib/db';
import {ensureEducationMaterialFileSchema,educationBlobConfigured} from '../../../../../../../lib/education-material-files';
import {ensureEducationAiMaterialSchema,chunkEducationText} from '../../../../../../../lib/education-ai-materials';

export const dynamic='force-dynamic';
export const maxDuration=300;

export async function POST(request,{params}){
 const access=await getEducationUser('lecturer');
 if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
 const {id}=await params;const materialId=Number(id);
 if(!Number.isInteger(materialId))return NextResponse.json({ok:false,error:'Invalid learning material.'},{status:400});
 let sql;
 try{
  sql=getEducationSql();await ensureEducationMaterialFileSchema(sql);await ensureEducationAiMaterialSchema(sql);
  const material=(await sql`select m.* from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id where m.id=${materialId} and m.created_by=${access.user.id} and o.lecturer_user_id=${access.user.id} limit 1`)[0];
  if(!material)return NextResponse.json({ok:false,error:'Learning material not found.'},{status:404});
  if(material.material_type!=='pdf'||!material.blob_pathname)return NextResponse.json({ok:false,error:'Automatic AI processing currently requires an uploaded PDF.'},{status:400});
  if(!educationBlobConfigured())return NextResponse.json({ok:false,error:'File storage is not configured.'},{status:503});
  await sql`update edu_learning_materials set ai_processing_status='processing',ai_processing_error=null where id=${materialId}`;
  const blob=await get(material.blob_pathname,{access:'private'});
  if(!blob||blob.statusCode!==200)throw new Error('Uploaded PDF could not be opened.');
  const bytes=Buffer.from(await new Response(blob.stream).arrayBuffer());
  const parser=new PDFParse({data:bytes});let result;
  try{result=await parser.getText();}finally{await parser.destroy();}
  const text=String(result?.text||'').trim();const chunks=chunkEducationText(text);
  if(!chunks.length)throw new Error('No selectable text was found in this PDF. It may be a scanned/image-only document.');
  await sql`delete from edu_learning_material_chunks where material_id=${materialId}`;
  for(let i=0;i<chunks.length;i++)await sql`insert into edu_learning_material_chunks(material_id,chunk_index,content) values(${materialId},${i},${chunks[i]})`;
  const preview=text.slice(0,20000);
  await sql`update edu_learning_materials set content_text=${preview},is_ai_approved=true,ai_processing_status='ready',ai_processed_at=now(),ai_processing_error=null,updated_at=now() where id=${materialId}`;
  await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'learning_material_ai_ingested','edu_learning_material',${String(materialId)},${JSON.stringify({chunks:chunks.length,characters:text.length,filename:material.original_filename||null})}::jsonb)`;
  return NextResponse.json({ok:true,status:'ready',chunks:chunks.length,characters:text.length});
 }catch(error){
  console.error('PDF AI ingestion failed:',error);
  if(sql){try{await sql`update edu_learning_materials set is_ai_approved=false,ai_processing_status='failed',ai_processing_error=${String(error?.message||'PDF processing failed.').slice(0,1000)} where id=${materialId}`;}catch{}}
  return NextResponse.json({ok:false,error:error?.message||'Unable to process this PDF for AI Tutor.'},{status:503});
 }
}
