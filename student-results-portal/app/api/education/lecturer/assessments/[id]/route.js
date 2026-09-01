import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';

export const dynamic='force-dynamic';
const clean=(v,max=10000)=>String(v||'').trim().slice(0,max);

async function ownedAssessment(sql,id,userId){
  const rows=await sql`select a.*,c.code,c.title as course_title,cl.name as class_name from edu_assessments a join edu_course_offerings o on o.id=a.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where a.id=${id} and o.lecturer_user_id=${userId} limit 1`;
  return rows?.[0];
}

export async function GET(request,{params}){
  const access=await getEducationUser('lecturer'); if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{const {id}=await params,sql=getEducationSql(),assessment=await ownedAssessment(sql,id,access.user.id);if(!assessment)return NextResponse.json({ok:false,error:'Assessment not found.'},{status:404});
    const questions=await sql`select id,position,question_type,prompt,options,correct_answer,max_score,required from edu_assessment_questions where assessment_id=${id} order by position`;
    return NextResponse.json({ok:true,assessment,questions});
  }catch(error){console.error('Assessment builder unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load assessment builder.'},{status:503});}
}

export async function POST(request,{params}){
  const access=await getEducationUser('lecturer'); if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{const {id}=await params,b=await request.json(),sql=getEducationSql(),assessment=await ownedAssessment(sql,id,access.user.id);if(!assessment)return NextResponse.json({ok:false,error:'Assessment not found.'},{status:404});
    if(b.action==='publish'){
      const questions=await sql`select question_type,options,correct_answer,max_score from edu_assessment_questions where assessment_id=${id} order by position`;
      if(!questions.length)return NextResponse.json({ok:false,error:'Add at least one question before publishing.'},{status:400});
      const invalidMcq=questions.find(q=>q.question_type==='mcq'&&(!q.correct_answer?.value||!Array.isArray(q.options)||!q.options.some(option=>String(option)===String(q.correct_answer.value))));
      if(invalidMcq)return NextResponse.json({ok:false,error:'Every MCQ must have a correct answer that matches one of its options before publishing.'},{status:400});
      const questionTotal=questions.reduce((sum,q)=>sum+Number(q.max_score||0),0);
      if(Math.abs(questionTotal-Number(assessment.max_score))>0.0001)return NextResponse.json({ok:false,error:`Question marks total ${questionTotal}, but the assessment maximum is ${Number(assessment.max_score)}. Make the totals match before publishing.`},{status:400});
      await sql`update edu_assessments set status='published',updated_at=now() where id=${id}`;return NextResponse.json({ok:true});
    }
    if(b.action==='delete'){await sql`delete from edu_assessment_questions where id=${b.questionId} and assessment_id=${id}`;return NextResponse.json({ok:true});}
    const type=clean(b.questionType,20).toLowerCase(),prompt=clean(b.prompt),maxScore=Number(b.maxScore),options=Array.isArray(b.options)?b.options.map(x=>clean(x,1000)).filter(Boolean):[];if(!['mcq','short','long','viva','osce','practical'].includes(type)||!prompt||!Number.isFinite(maxScore)||maxScore<0)return NextResponse.json({ok:false,error:'Question type, prompt and valid score are required.'},{status:400});if(type==='mcq'&&options.length<2)return NextResponse.json({ok:false,error:'MCQ questions need at least two options.'},{status:400});
    const correctAnswer=clean(b.correctAnswer,1000);
    if(type==='mcq'&&(!correctAnswer||!options.includes(correctAnswer)))return NextResponse.json({ok:false,error:'Choose a correct answer that matches one of the MCQ options.'},{status:400});
    const pos=await sql`select coalesce(max(position),0)+1 as next from edu_assessment_questions where assessment_id=${id}`;const correct=type==='mcq'?JSON.stringify({value:correctAnswer}):null;
    const rows=await sql`insert into edu_assessment_questions (assessment_id,position,question_type,prompt,options,correct_answer,max_score,required) values (${id},${pos[0].next},${type},${prompt},${JSON.stringify(options)}::jsonb,${correct}::jsonb,${maxScore},${b.required!==false}) returning id`;
    return NextResponse.json({ok:true,questionId:rows[0].id});
  }catch(error){console.error('Assessment question save unavailable:',error);return NextResponse.json({ok:false,error:'Unable to update assessment.'},{status:503});}
}
