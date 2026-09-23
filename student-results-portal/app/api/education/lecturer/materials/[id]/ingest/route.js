import {NextResponse} from 'next/server';
import {get} from '@vercel/blob';
import * as XLSX from 'xlsx';
import {experimental_transcribe as transcribe,generateText} from 'ai';
import {gateway} from '@ai-sdk/gateway';
import {getEducationUser} from '../../../../../../../lib/education-session';
import {getEducationSql} from '../../../../../../../lib/db';
import {ensureEducationMaterialFileSchema,educationBlobConfigured} from '../../../../../../../lib/education-material-files';
import {ensureEducationAiMaterialSchema,chunkEducationText} from '../../../../../../../lib/education-ai-materials';

export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=300;

const TEXT_TYPES=new Set(['text/plain','text/csv','text/markdown','text/html','image/svg+xml','application/rtf']);
const OFFICE_TYPES=new Set([
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);
const SPREADSHEET_TYPES=new Set(['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
const IMAGE_TYPES=new Set(['image/jpeg','image/png','image/gif','image/webp']);
const AUDIO_VIDEO_LIMIT=25*1024*1024;
const OCR_LIMIT=10*1024*1024;

function stripHtml(value){return String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function safeExternalUrl(raw){
 const url=new URL(String(raw||''));if(url.protocol!=='https:')throw new Error('Only HTTPS learning links can be processed.');
 const host=url.hostname.toLowerCase();if(host==='localhost'||host==='127.0.0.1'||host==='0.0.0.0'||host==='::1'||host.endsWith('.local')||/^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host))throw new Error('Private network links cannot be processed.');
 return url;
}
async function fetchLinkText(resourceUrl){
 const url=safeExternalUrl(resourceUrl);const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'DropareEducation/1.0'}});
 if(!response.ok)throw new Error('The linked learning page could not be opened.');
 const type=String(response.headers.get('content-type')||'');if(!type.includes('text/')&&!type.includes('application/json'))throw new Error('This link does not expose readable webpage text.');
 const text=await response.text();if(text.length>5_000_000)throw new Error('The linked page is too large to process safely.');
 return type.includes('html')?stripHtml(text):text;
}
async function extractPdf(bytes){
 // pdf.js reads these browser geometry globals while its module is loading.
 // Install the Node canvas implementations before dynamically importing
 // pdf-parse; a static import crashes in Vercel Functions with DOMMatrix undefined.
 const canvas=await import('@napi-rs/canvas');
 for(const name of ['DOMMatrix','ImageData','Path2D'])if(!globalThis[name]&&canvas[name])globalThis[name]=canvas[name];
 const {PDFParse}=await import('pdf-parse');
 const parser=new PDFParse({data:bytes});
 try{return String((await parser.getText())?.text||'').trim();}
 finally{await parser.destroy();}
}
async function extractOffice(bytes){const {parseOffice}=await import('officeparser');const parsed=await parseOffice(bytes);return String(typeof parsed?.toText==='function'?parsed.toText():parsed||'').trim();}
function extractSpreadsheet(bytes){const book=XLSX.read(bytes,{type:'buffer'});return book.SheetNames.map(name=>`[${name}]\n${XLSX.utils.sheet_to_csv(book.Sheets[name])}`).join('\n\n').trim();}
async function extractTranscript(bytes){
 if(bytes.length>AUDIO_VIDEO_LIMIT)throw new Error('This audio/video is over 25 MB. Upload a transcript or a shorter recording for AI processing.');
 const result=await transcribe({model:gateway.transcriptionModel(process.env.EDUCATION_TRANSCRIPTION_MODEL||'fish-audio/transcribe-1'),audio:bytes});
 return String(result?.text||'').trim();
}
async function extractImageText(bytes,type){
 if(bytes.length>OCR_LIMIT)throw new Error('This image is over 10 MB and cannot be processed for AI.');
 const result=await generateText({
  model:gateway(process.env.EDUCATION_OCR_MODEL||'openai/gpt-5.4-mini'),
  maxOutputTokens:8000,
  messages:[{role:'user',content:[
   {type:'text',text:'Extract all readable educational text from this image. Preserve headings and lists. Return only the extracted text.'},
   {type:'file',mediaType:type||'image',data:bytes},
  ]}],
 });
 return String(result?.text||'').trim();
}
async function extractMaterialText(material,bytes){
 const type=String(material.file_content_type||'').toLowerCase();
 if(material.material_type==='link'&&material.resource_url)return fetchLinkText(material.resource_url);
 if(material.material_type==='note')return String(material.content_text||'').trim();
 if(type==='application/pdf'||material.material_type==='pdf')return extractPdf(bytes);
 if(TEXT_TYPES.has(type))return bytes.toString('utf8').trim();
 if(SPREADSHEET_TYPES.has(type))return extractSpreadsheet(bytes);
 if(OFFICE_TYPES.has(type))return extractOffice(bytes);
 if(type.startsWith('audio/')||type.startsWith('video/')||material.material_type==='video')return extractTranscript(bytes);
 if(IMAGE_TYPES.has(type))return extractImageText(bytes,type);
 throw new Error('This file format has no safe automatic text extractor yet. Upload PDF, Word, PowerPoint, Excel, text, image, audio or video content.');
}

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
  await sql`update edu_learning_materials set ai_processing_status='processing',ai_processing_error=null where id=${materialId}`;
  const startedAt=Date.now();
  console.log('Learning material AI ingestion started',{materialId,type:material.material_type,contentType:material.file_content_type,sizeBytes:Number(material.file_size_bytes||0)});
  let bytes=Buffer.alloc(0);
  if(material.blob_pathname){
   if(!educationBlobConfigured())throw new Error('File storage is not configured.');
   const blob=await get(material.blob_pathname,{access:'private'});if(!blob||blob.statusCode!==200)throw new Error('The uploaded file could not be opened.');
   bytes=Buffer.from(await new Response(blob.stream).arrayBuffer());
  }
  const text=String(await extractMaterialText(material,bytes)).trim();const chunks=chunkEducationText(text);
  if(!chunks.length)throw new Error(material.material_type==='pdf'?'No selectable text was found. This may be a scanned PDF; convert it to a searchable PDF or upload its text.':'No usable text could be extracted from this material.');
  await sql`delete from edu_learning_material_chunks where material_id=${materialId}`;
  for(let i=0;i<chunks.length;i++)await sql`insert into edu_learning_material_chunks(material_id,chunk_index,content) values(${materialId},${i},${chunks[i]})`;
  await sql`update edu_learning_materials set content_text=${text.slice(0,20000)},is_ai_approved=true,ai_processing_status='ready',ai_processed_at=now(),ai_processing_error=null,updated_at=now() where id=${materialId}`;
  await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'learning_material_ai_ingested','edu_learning_material',${String(materialId)},${JSON.stringify({chunks:chunks.length,characters:text.length,filename:material.original_filename||null,type:material.material_type})}::jsonb)`;
  console.log('Learning material AI ingestion completed',{materialId,chunks:chunks.length,characters:text.length,durationMs:Date.now()-startedAt});
  return NextResponse.json({ok:true,status:'ready',chunks:chunks.length,characters:text.length});
 }catch(error){
  console.error('Learning material AI ingestion failed:',error);
  if(sql){try{await sql`update edu_learning_materials set is_ai_approved=false,ai_processing_status='failed',ai_processing_error=${String(error?.message||'Processing failed.').slice(0,1000)} where id=${materialId}`;}catch{}}
  return NextResponse.json({ok:false,error:error?.message||'Unable to process this material for AI Tutor.'},{status:503});
 }
}
