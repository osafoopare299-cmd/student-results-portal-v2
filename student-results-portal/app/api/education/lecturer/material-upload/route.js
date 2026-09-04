import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { educationBlobConfigured } from '../../../../../lib/education-material-files';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  return NextResponse.json({ok:true,configured:educationBlobConfigured(),allowedTypes:['application/pdf','video/mp4','video/webm','video/quicktime']});
}

export async function POST(request){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  if(!educationBlobConfigured())return NextResponse.json({ok:false,error:'File storage is not configured yet. Connect a Vercel Blob store to this project first.'},{status:503});
  try{
    const body=await request.json();
    const sql=getEducationSql();
    const response=await handleUpload({
      body,
      request,
      onBeforeGenerateToken:async(pathname,clientPayload)=>{
        let payload={};
        try{payload=JSON.parse(clientPayload||'{}');}catch{}
        const offeringId=Number(payload.offeringId);
        const materialType=String(payload.materialType||'').toLowerCase();
        if(!Number.isFinite(offeringId)||!['pdf','video'].includes(materialType))throw new Error('Choose an assigned course and PDF or video material type before uploading.');
        const owned=(await sql`select id from edu_course_offerings where id=${offeringId} and lecturer_user_id=${access.user.id} limit 1`)[0];
        if(!owned)throw new Error('You can only upload files to your assigned courses.');
        return {
          allowedContentTypes:materialType==='pdf'?['application/pdf']:['video/mp4','video/webm','video/quicktime'],
          addRandomSuffix:true,
          tokenPayload:JSON.stringify({userId:access.user.id,offeringId,materialType,pathname:String(pathname||'')})
        };
      },
      onUploadCompleted:async({blob,tokenPayload})=>{
        try{
          const payload=JSON.parse(tokenPayload||'{}');
          const callbackSql=getEducationSql();
          await callbackSql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${Number(payload.userId)||null},'learning_file_uploaded','blob',${String(blob.pathname||blob.url||'')},${JSON.stringify({offeringId:String(payload.offeringId||''),materialType:payload.materialType||null,contentType:blob.contentType||null})}::jsonb)`;
        }catch(error){console.error('Learning file upload audit failed:',error);}
      }
    });
    return NextResponse.json(response);
  }catch(error){
    console.error('Learning material upload unavailable:',error);
    return NextResponse.json({ok:false,error:error?.message||'Unable to authorize file upload.'},{status:400});
  }
}
