import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationGradingSchema,getEducationGradingBands } from '../../../../../lib/education-grading';

export const dynamic='force-dynamic';
const clean=(v,max=40)=>String(v??'').trim().slice(0,max);

export async function GET(){
  if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try{
    const sql=getEducationSql();
    const bands=await getEducationGradingBands(sql);
    return NextResponse.json({ok:true,bands});
  }catch(error){
    console.error('Education grading scheme unavailable:',error);
    return NextResponse.json({ok:false,error:'Unable to load grading scheme.'},{status:503});
  }
}

export async function POST(request){
  if(!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  try{
    const body=await request.json();
    const raw=Array.isArray(body.bands)?body.bands:[];
    if(raw.length<2||raw.length>20) return NextResponse.json({ok:false,error:'Provide between 2 and 20 grading bands.'},{status:400});
    const bands=raw.map((item,index)=>({grade:clean(item.grade,20),min_percent:Number(item.min_percent),outcome:clean(item.outcome,20).toUpperCase(),position:index+1}));
    if(bands.some(b=>!b.grade||!Number.isFinite(b.min_percent)||b.min_percent<0||b.min_percent>100||!['PASS','REVIEW'].includes(b.outcome))) return NextResponse.json({ok:false,error:'Each grading band needs a grade, threshold from 0 to 100, and PASS or REVIEW outcome.'},{status:400});
    const unique=new Set(bands.map(b=>String(b.min_percent)));
    if(unique.size!==bands.length) return NextResponse.json({ok:false,error:'Each grading threshold must be unique.'},{status:400});
    if(!bands.some(b=>b.min_percent===0)) return NextResponse.json({ok:false,error:'The grading scheme must include a 0% fallback band.'},{status:400});
    bands.sort((a,b)=>b.min_percent-a.min_percent);
    bands.forEach((b,index)=>b.position=index+1);
    const sql=getEducationSql();
    await ensureEducationGradingSchema(sql);
    const payload=JSON.stringify(bands);
    await sql`
      with deleted as (delete from edu_grading_bands returning id)
      insert into edu_grading_bands (grade,min_percent,outcome,position)
      select x.grade,x.min_percent,x.outcome,x.position
      from jsonb_to_recordset(${payload}::jsonb) as x(grade text,min_percent numeric,outcome text,position integer)
    `;
    await sql`insert into edu_audit_logs(action,entity_type,metadata) values('admin_grading_scheme_updated','grading_scheme',${JSON.stringify({source:'education_admin',bands:bands.map(b=>({grade:b.grade,minPercent:b.min_percent,outcome:b.outcome}))})}::jsonb)`;
    return NextResponse.json({ok:true,bands:await getEducationGradingBands(sql)});
  }catch(error){
    console.error('Education grading scheme save unavailable:',error);
    return NextResponse.json({ok:false,error:'Unable to save grading scheme.'},{status:503});
  }
}
