import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';
const clean=(v,max=5000)=>String(v||'').trim().slice(0,max);
const parseDate=value=>{if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d;};

export async function GET(){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const sql=getEducationSql();
    const offerings=await sql`select o.id,c.code,c.title,cl.name as class_name,y.name as academic_year,o.term from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id where o.lecturer_user_id=${access.user.id} order by y.name desc,c.code`;
    const assessments=await sql`select a.id,a.offering_id,a.title,a.description,a.assessment_type,a.max_score,a.opens_at,a.closes_at,a.duration_minutes,a.instructions,a.status,a.created_at,c.code,c.title as course_title,cl.name as class_name,(select count(*)::int from edu_assessment_questions q where q.assessment_id=a.id) as question_count,(select count(*)::int from edu_assessment_attempts t where t.assessment_id=a.id and t.status in ('submitted','marked')) as submission_count from edu_assessments a join edu_course_offerings o on o.id=a.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where o.lecturer_user_id=${access.user.id} order by a.created_at desc limit 200`;
    return NextResponse.json({ok:true,offerings,assessments});
  }catch(error){console.error('Lecturer assessments unavailable:',error);return NextResponse.json({ok:false,error:'Assessment database setup is not ready yet.'},{status:503});}
}

export async function POST(request){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const b=await request.json(),sql=getEducationSql();
    const offeringId=Number(b.offeringId),title=clean(b.title,240),description=clean(b.description,2000)||null,type=clean(b.assessmentType,20).toLowerCase();
    const instructions=clean(b.instructions,5000)||null;
    const maxScore=Number(b.maxScore),duration=b.durationMinutes?Number(b.durationMinutes):null;
    const opensDate=parseDate(b.opensAt),closesDate=parseDate(b.closesAt);
    if(b.opensAt&&!opensDate)return NextResponse.json({ok:false,error:'Enter a valid opening date and time.'},{status:400});
    if(b.closesAt&&!closesDate)return NextResponse.json({ok:false,error:'Enter a valid closing date and time.'},{status:400});
    const opensAt=opensDate?.toISOString()||null,closesAt=closesDate?.toISOString()||null;
    if(!Number.isFinite(offeringId)||!title||!['mcq','written','viva','osce','practical'].includes(type)||!Number.isFinite(maxScore)||maxScore<=0)return NextResponse.json({ok:false,error:'Course, title, valid assessment type and maximum score are required.'},{status:400});
    if(duration!==null&&(!Number.isInteger(duration)||duration<=0))return NextResponse.json({ok:false,error:'Duration must be a positive whole number of minutes.'},{status:400});
    if(opensDate&&closesDate&&closesDate<=opensDate)return NextResponse.json({ok:false,error:'Closing time must be after opening time.'},{status:400});
    if(duration&&opensDate&&closesDate){const windowMinutes=(closesDate.getTime()-opensDate.getTime())/60000;if(duration>windowMinutes)return NextResponse.json({ok:false,error:`Duration (${duration} minutes) cannot exceed the assessment window (${Math.floor(windowMinutes)} minutes).`},{status:400});}
    if(b.publish)return NextResponse.json({ok:false,error:'Create the assessment as a draft, add its questions, then publish it from the assessment builder after validation.'},{status:400});
    const own=await sql`select id from edu_course_offerings where id=${offeringId} and lecturer_user_id=${access.user.id} limit 1`;
    if(!own.length)return NextResponse.json({ok:false,error:'You can only create assessments for your assigned courses.'},{status:403});
    const rows=await sql`insert into edu_assessments (offering_id,created_by,title,description,assessment_type,max_score,opens_at,closes_at,duration_minutes,instructions,status) values (${offeringId},${access.user.id},${title},${description},${type},${maxScore},${opensAt},${closesAt},${duration},${instructions},'draft') returning id,title,status`;
    await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'assessment_created','assessment',${String(rows[0].id)},${JSON.stringify({offeringId,type,maxScore,duration,opensAt,closesAt,status:'draft'})}::jsonb)`;
    return NextResponse.json({ok:true,assessment:rows[0]});
  }catch(error){console.error('Assessment save unavailable:',error);return NextResponse.json({ok:false,error:'Unable to save assessment.'},{status:503});}
}
