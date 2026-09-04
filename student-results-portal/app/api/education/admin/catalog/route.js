import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';

function clean(value,max=180){return String(value||'').trim().slice(0,max);}

export async function GET(){
  if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try{
    const sql=getEducationSql();
    const [courses,classes,years]=await Promise.all([
      sql`select id,code,title,active from edu_courses order by lower(code)`,
      sql`select c.id,c.name,c.code,c.level,ay.name as academic_year from edu_classes c left join edu_academic_years ay on ay.id=c.academic_year_id order by lower(c.name)`,
      sql`select id,name,is_active from edu_academic_years order by starts_on desc nulls last,name desc`,
    ]);
    return NextResponse.json({ok:true,courses,classes,years});
  }catch(error){
    console.error('Education catalog unavailable:',error);
    return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});
  }
}

export async function POST(request){
  if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try{
    const body=await request.json();
    const type=clean(body.type,20);
    const sql=getEducationSql();
    if(type==='course'){
      const code=clean(body.code,40); const title=clean(body.title); const description=clean(body.description,1000);
      if(!code||!title) return NextResponse.json({ok:false,error:'Course code and title are required.'},{status:400});
      const rows=await sql`insert into edu_courses(code,title,description) values(${code},${title},${description||null}) on conflict ((lower(code))) do update set title=excluded.title,description=excluded.description,active=true returning id,code,title,active`;
      await sql`insert into edu_audit_logs (action,entity_type,entity_id,metadata) values ('admin_catalog_course_saved','edu_course',${String(rows?.[0]?.id||'')},${JSON.stringify({code,title})}::jsonb)`;
      return NextResponse.json({ok:true,item:rows?.[0]});
    }
    if(type==='class'){
      const name=clean(body.name); const code=clean(body.code,40); const level=clean(body.level,80); const yearId=Number(body.academicYearId)||null;
      if(!name||!yearId) return NextResponse.json({ok:false,error:'Class name and academic year are required.'},{status:400});
      const year=await sql`select id from edu_academic_years where id=${yearId} limit 1`;
      if(!year.length) return NextResponse.json({ok:false,error:'Selected academic year was not found.'},{status:404});
      const rows=await sql`insert into edu_classes(name,code,level,academic_year_id) values(${name},${code||null},${level||null},${yearId}) returning id,name,code,level`;
      await sql`insert into edu_audit_logs (action,entity_type,entity_id,metadata) values ('admin_catalog_class_saved','edu_class',${String(rows?.[0]?.id||'')},${JSON.stringify({name,code,level,academicYearId:yearId})}::jsonb)`;
      return NextResponse.json({ok:true,item:rows?.[0]});
    }
    return NextResponse.json({ok:false,error:'Unsupported catalog item.'},{status:400});
  }catch(error){
    console.error('Education catalog save unavailable:',error);
    return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503});
  }
}
