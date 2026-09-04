import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';
import { ensureEducationAssessmentReviewSchema } from '../../../../../../lib/education-assessment-review';

export const dynamic='force-dynamic';

async function studentAssessment(sql,id,userId){
  const rows=await sql`select a.*,c.code,c.title as course_title,cl.name as class_name from edu_enrolments e join edu_course_offerings o on o.id=e.offering_id join edu_assessments a on a.offering_id=o.id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where e.student_user_id=${userId} and e.status='active' and a.id=${id} and a.status in ('published','closed') limit 1`;
  return rows?.[0];
}

function availabilityError(assessment){
  const now=Date.now();
  if(assessment.opens_at&&new Date(assessment.opens_at).getTime()>now)return NextResponse.json({ok:false,error:'This assessment has not opened yet.'},{status:403});
  return null;
}

function attemptExpired(assessment,attempt,now=Date.now()){
  if(!assessment.duration_minutes||!attempt?.started_at)return false;
  return new Date(attempt.started_at).getTime()+Number(assessment.duration_minutes)*60000<=now;
}

export async function GET(request,{params}){
  const access=await getEducationUser('student'); if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{const {id}=await params,sql=getEducationSql();await ensureEducationAssessmentReviewSchema(sql);const assessment=await studentAssessment(sql,id,access.user.id);if(!assessment)return NextResponse.json({ok:false,error:'Assessment not available.'},{status:404});
    const unavailable=availabilityError(assessment);if(unavailable)return unavailable;
    const now=Date.now(),closed=assessment.status==='closed'||(assessment.closes_at&&new Date(assessment.closes_at).getTime()<=now);
    const attempts=await sql`select id,status,started_at,submitted_at,score from edu_assessment_attempts where assessment_id=${id} and student_user_id=${access.user.id} limit 1`;
    if(closed&&!assessment.review_enabled)return NextResponse.json({ok:true,assessment:{...assessment,review_enabled:false},questions:[],attempt:attempts[0]||null,answers:[],reviewLocked:true,message:'This assessment is closed. Question review has not been enabled by the lecturer.'});
    const questions=await sql`select id,position,question_type,prompt,options,max_score,required from edu_assessment_questions where assessment_id=${id} order by position`;
    let answers=[];if(attempts[0])answers=await sql`select question_id,answer,score from edu_assessment_answers where attempt_id=${attempts[0].id}`;
    return NextResponse.json({ok:true,assessment,questions,attempt:attempts[0]||null,answers,reviewLocked:false,timeExpired:attemptExpired(assessment,attempts[0],now)});
  }catch(error){console.error('Student assessment unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load assessment.'},{status:503});}
}

export async function POST(request,{params}){
  const access=await getEducationUser('student'); if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{const {id}=await params,b=await request.json(),sql=getEducationSql();await ensureEducationAssessmentReviewSchema(sql);const assessment=await studentAssessment(sql,id,access.user.id);if(!assessment)return NextResponse.json({ok:false,error:'Assessment not available.'},{status:404});
    const now=Date.now();if(assessment.opens_at&&new Date(assessment.opens_at).getTime()>now)return NextResponse.json({ok:false,error:'This assessment has not opened yet.'},{status:403});if((assessment.closes_at&&new Date(assessment.closes_at).getTime()<=now)||assessment.status==='closed')return NextResponse.json({ok:false,error:'This assessment is closed.'},{status:403});
    let attempt=(await sql`select * from edu_assessment_attempts where assessment_id=${id} and student_user_id=${access.user.id} limit 1`)[0];if(!attempt){attempt=(await sql`insert into edu_assessment_attempts (assessment_id,student_user_id) values (${id},${access.user.id}) returning *`)[0];}
    if(attempt.status!=='started')return NextResponse.json({ok:false,error:'This assessment has already been submitted.'},{status:409});
    const expired=attemptExpired(assessment,attempt,now);
    if(expired&&b.action!=='submit')return NextResponse.json({ok:false,error:'Time has expired. Submit your assessment.'},{status:409});
    if(b.action==='save'){
      const qid=Number(b.questionId);const q=(await sql`select id,question_type,options from edu_assessment_questions where id=${qid} and assessment_id=${id}`)[0];if(!q)return NextResponse.json({ok:false,error:'Question not found.'},{status:404});
      const value=b.value??'';
      if(q.question_type==='mcq'&&(!Array.isArray(q.options)||!q.options.some(option=>String(option)===String(value))))return NextResponse.json({ok:false,error:'Choose one of the published answer options.'},{status:400});
      const normalized=typeof value==='string'?value.slice(0,20000):value;
      await sql`insert into edu_assessment_answers (attempt_id,question_id,answer,updated_at) values (${attempt.id},${qid},${JSON.stringify({value:normalized})}::jsonb,now()) on conflict (attempt_id,question_id) do update set answer=excluded.answer,updated_at=now()`;return NextResponse.json({ok:true,attemptId:attempt.id});
    }
    if(b.action==='submit'){
      const questions=await sql`select id,question_type,options,correct_answer,max_score,required from edu_assessment_questions where assessment_id=${id}`;const answers=await sql`select id,question_id,answer from edu_assessment_answers where attempt_id=${attempt.id}`;
      if(!expired){
        const missingRequired=questions.filter(q=>q.required).find(q=>{const a=answers.find(x=>Number(x.question_id)===Number(q.id));return !a||String(a.answer?.value??'').trim()==='';});
        if(missingRequired)return NextResponse.json({ok:false,error:'Answer all required questions before submitting.'},{status:400});
      }
      let autoScore=0;for(const q of questions){if(q.question_type!=='mcq')continue;const a=answers.find(x=>Number(x.question_id)===Number(q.id));const expected=q.correct_answer?.value??'';const actual=a?.answer?.value??'';const validOption=Array.isArray(q.options)&&q.options.some(option=>String(option)===String(actual));const score=validOption&&String(actual)===String(expected)?Number(q.max_score):0;autoScore+=score;if(a)await sql`update edu_assessment_answers set score=${score} where id=${a.id}`;}
      const hasManual=questions.some(q=>q.question_type!=='mcq');const status=hasManual?'submitted':'marked';await sql`update edu_assessment_attempts set status=${status},submitted_at=now(),score=${autoScore},marked_at=${hasManual?null:new Date().toISOString()} where id=${attempt.id}`;
      await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},${expired?'assessment_auto_submitted_time_expired':'assessment_submitted'},'assessment_attempt',${String(attempt.id)},${JSON.stringify({assessmentId:String(id),status,expired})}::jsonb)`;
      return NextResponse.json({ok:true,status,score:autoScore,timeExpired:expired});
    }
    return NextResponse.json({ok:true,attemptId:attempt.id});
  }catch(error){console.error('Student attempt save unavailable:',error);return NextResponse.json({ok:false,error:'Unable to save assessment attempt.'},{status:503});}
}
