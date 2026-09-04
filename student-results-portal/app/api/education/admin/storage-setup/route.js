import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationMaterialFileSchema,educationBlobConfigured } from '../../../../../lib/education-material-files';

export const dynamic='force-dynamic';

async function guard(){if(!(await isAdmin()))return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});return null;}

async function state(sql){
  const rows=await sql`select
    to_regclass('public.edu_learning_materials') is not null as materials,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='edu_learning_materials' and column_name='blob_pathname') as blob_pathname,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='edu_learning_materials' and column_name='original_filename') as original_filename,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='edu_learning_materials' and column_name='file_content_type') as file_content_type,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='edu_learning_materials' and column_name='file_size_bytes') as file_size_bytes`;
  const s=rows[0]||{};
  return {databaseReady:Boolean(s.materials&&s.blob_pathname&&s.original_filename&&s.file_content_type&&s.file_size_bytes),blobConfigured:educationBlobConfigured()};
}

export async function GET(){
  const denied=await guard();if(denied)return denied;
  try{const sql=getEducationSql();return NextResponse.json({ok:true,...await state(sql)});}catch(error){console.error('Education storage status failed:',error);return NextResponse.json({ok:false,error:'Unable to check learning file storage.'},{status:503});}
}

export async function POST(){
  const denied=await guard();if(denied)return denied;
  try{const sql=getEducationSql();await ensureEducationMaterialFileSchema(sql);return NextResponse.json({ok:true,...await state(sql)});}catch(error){console.error('Education storage setup failed:',error);return NextResponse.json({ok:false,error:'Unable to initialize learning file storage columns.'},{status:503});}
}
