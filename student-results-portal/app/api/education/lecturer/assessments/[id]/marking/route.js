import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../../lib/db';

export const dynamic='force-dynamic';
const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);

async function ownedAssessment(sql,id,userId){
  const rows=await sql`select a.id,a.title,a.max_score,a.assessment_type,a.status,c.code,c.title as course_title,cl.name as class_name from edu_assessments a join edu_course_offerings o on o.id=a.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where a.id=${id} and o.lecturer_user_id=${userId} limit 1`;
  return rows?.[0];
}

export async function GET(request,{params}){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const {id}=await params,sql=getEducationSql(),assessment=await ownedAssessment(sql,id,access.user.id);
    if(!assessment)return NextResponse.json({ok:false,error:'Assessment not found.'},{status:404});
    const attempts=await sql`select t.id,t.status,t.started_at,t.submitted_at,t.score,t.feedback,t.marked_at,u.full_name,u.email from edu_assessment_attempts t join edu_users u on u.id=t.student_user_id where t.assessment_id=${id} and t.status in ('submitted','marked') order by t.submitted_at asc nulls last,u.full_name`;
    const attemptId=new URL(request.url).searchParams.get('attemptId');
    if(!attemptId)return NextResponse.json({ok:true,assessment,attempts});
    const attempt=attempts.find(x=>String(x.id)===String(attemptId));
    if(!attempt)return NextResponse.json({ok:false,error:'Submission not found.'},{status:404});
    const answers=await sql`select q.id as question_id,q.position,q.question_type,q.prompt,q.max_score,q.required,a.id as answer_id,a.answer,a.score,a.feedback from edu_assessment_questions q left join edu_assessment_answers a on a.question_id=q.id and a.attempt_id=${attemptId} where q.assessment_id=${id} order by q.position`;
    return NextResponse.json({ok:true,assessment,attempts,attempt,answers});
  }catch(error){console.error('Assessment marking unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load assessment marking.'},{status:503});}
}

export async function POST(request,{params}){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const {id}=await params,b=await request.json(),sql=getEducationSql(),assessment=await ownedAssessment(sql,id,access.user.id);
    if(!assessment)return NextResponse.json({ok:false,error:'Assessment not found.'},{status:404});
    const attemptId=Number(b.attemptId);
    const attempt=(await sql`select * from edu_assessment_attempts where id=${attemptId} and assessment_id=${id} and status in ('submitted','marked') limit 1`)[0];
    if(!attempt)return NextResponse.json({ok:false,error:'Submission not found.'},{status:404});
    if(b.action==='save-answer'){
      const questionId=Number(b.questionId),score=Number(b.score),feedback=clean(b.feedback);
      const q=(await sql`select id,max_score,question_type from edu_assessment_questions where id=${questionId} and assessment_id=${id} limit 1`)[0];
      if(!q)return NextResponse.json({ok:false,error:'Question not found.'},{status:404});
      if(q.question_type==='mcq')return NextResponse.json({ok:false,error:'MCQ scores are marked automatically.'},{status:400});
      if(!Number.isFinite(score)||score<0||score>Number(q.max_score))return NextResponse.json({ok:false,error:`Score must be between 0 and ${Number(q.max_score)}.`},{status:400});
      const answer=(await sql`select id from edu_assessment_answers where attempt_id=${attemptId} and question_id=${questionId} limit 1`)[0];
      if(!answer)return NextResponse.json({ok:false,error:'No submitted answer exists for this question.'},{status:400});
      await sql`update edu_assessment_answers set score=${score},feedback=${feedback||null},updated_at=now() where id=${answer.id}`;
      return NextResponse.json({ok:true});
    }
    if(b.action==='finalize'){
      const pending=await sql`select q.position from edu_assessment_questions q join edu_assessment_answers a on a.question_id=q.id and a.attempt_id=${attemptId} where q.assessment_id=${id} and q.question_type<>'mcq' and a.score is null order by q.position`;
      if(pending.length)return NextResponse.json({ok:false,error:`Mark all submitted manual answers before finalizing. Pending: ${pending.map(x=>'Q'+x.position).join(', ')}.`},{status:400});
      const totals=await sql`select coalesce(sum(coalesce(a.score,0)),0)::numeric as total from edu_assessment_questions q left join edu_assessment_answers a on a.question_id=q.id and a.attempt_id=${attemptId} where q.assessment_id=${id}`;
      const total=Number(totals[0]?.total||0);
      if(total>Number(assessment.max_score))return NextResponse.json({ok:false,error:'Calculated score exceeds the assessment maximum.'},{status:400});
      const feedback=clean(b.feedback);
      await sql`update edu_assessment_attempts set status='marked',score=${total},feedback=${feedback||null},marked_by=${access.user.id},marked_at=now() where id=${attemptId}`;
      await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${access.user.id},'assessment_attempt_marked','edu_assessment_attempt',${String(attemptId)},${JSON.stringify({assessmentId:String(id),score:total})}::jsonb)`;
      return NextResponse.json({ok:true,status:'marked',score:total});
    }
    return NextResponse.json({ok:false,error:'Unknown marking action.'},{status:400});
  }catch(error){console.error('Assessment marking save unavailable:',error);return NextResponse.json({ok:false,error:'Unable to save assessment marking.'},{status:503});}
}
