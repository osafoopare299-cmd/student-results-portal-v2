import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';
import { educationBlobConfigured } from '../../../../../../lib/education-material-files';

export const dynamic='force-dynamic';

export async function POST(request){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  if(!educationBlobConfigured())return NextResponse.json({ok:false,error:'File storage is not configured.'},{status:503});
  try{
    const body=await request.json();
    const pathname=String(body?.pathname||'').trim();
    const offeringId=Number(body?.offeringId);
    if(!pathname||!Number.isFinite(offeringId)||!pathname.startsWith(`education/${offeringId}/`))return NextResponse.json({ok:false,error:'Invalid uploaded file reference.'},{status:400});
    const sql=getEducationSql();
    const owned=await sql`select id from edu_course_offerings where id=${offeringId} and lecturer_user_id=${access.user.id} limit 1`;
    if(!owned.length)return NextResponse.json({ok:false,error:'You can only clean up files from your assigned courses.'},{status:403});
    const attached=await sql`select id from edu_learning_materials where blob_pathname=${pathname} limit 1`;
    if(attached.length)return NextResponse.json({ok:false,error:'That file is already attached to a learning material.'},{status:409});
    await del(pathname);
    await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'learning_file_orphan_cleaned','blob',${pathname},${JSON.stringify({offeringId})}::jsonb)`;
    return NextResponse.json({ok:true});
  }catch(error){
    console.error('Learning file cleanup failed:',error);
    return NextResponse.json({ok:false,error:'Unable to clean up uploaded file.'},{status:503});
  }
}
