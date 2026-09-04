import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';
import { educationBlobConfigured } from '../../../../../lib/education-material-files';

export const dynamic='force-dynamic';

const CORE_TABLES=[
  'edu_users','edu_academic_years','edu_classes','edu_courses','edu_course_offerings','edu_enrolments',
  'edu_learning_materials','edu_assessments','edu_assessment_questions','edu_assessment_attempts','edu_assessment_answers',
  'edu_announcements','edu_timetable_events','edu_attendance_sessions','edu_attendance_records','edu_audit_logs'
];

export async function GET(){
  if(!(await isAdmin()))return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  const checkedAt=new Date().toISOString();
  try{
    const sql=getEducationSql();
    const rows=await sql`select tablename from pg_tables where schemaname='public' and tablename = any(${CORE_TABLES})`;
    const present=new Set(rows.map(r=>r.tablename));
    const missingTables=CORE_TABLES.filter(name=>!present.has(name));
    const dbPing=await sql`select now() as database_time`;
    const blobConfigured=educationBlobConfigured();
    const aiConfigured=Boolean(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN);
    const educationDatabaseConfigured=Boolean(process.env.EDUCATION_DATABASE_URL);
    const checks={
      educationDatabaseConfigured,
      databaseReachable:Boolean(dbPing?.[0]?.database_time),
      coreSchemaReady:missingTables.length===0,
      blobConfigured,
      aiTutorConfigured:aiConfigured,
      pwaAssetsExpected:true
    };
    const criticalReady=checks.educationDatabaseConfigured&&checks.databaseReachable&&checks.coreSchemaReady;
    return NextResponse.json({
      ok:true,
      ready:criticalReady,
      checkedAt,
      checks,
      missingTables,
      notes:[
        blobConfigured?'Private learning-file storage is configured.':'Vercel Blob is not confirmed in this environment; URL-based materials still work.',
        aiConfigured?'AI Tutor credentials are available.':'AI Tutor credentials are not available in this environment.',
        'PWA manifest/service-worker files are deployed with the application; install/offline behavior should still be smoke-tested on a real device.'
      ]
    });
  }catch(error){
    console.error('Education production health check failed:',error);
    return NextResponse.json({ok:false,ready:false,checkedAt,error:'Unable to complete Education production health check.'},{status:503});
  }
}
