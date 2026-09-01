import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { ensureEducationResultReleaseSchema } from '../../../../../lib/education-results-schema';
import { applyEducationGrade,getEducationGradingBands } from '../../../../../lib/education-grading';

export const dynamic='force-dynamic';

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{
    const sql=getEducationSql();
    await ensureEducationResultReleaseSchema(sql);
    const [rows,bands]=await Promise.all([
      sql`select t.id as attempt_id,t.score,t.feedback,t.marked_at,t.submitted_at,t.released_at,a.id as assessment_id,a.title,a.assessment_type,a.max_score,c.code,c.title as course_title,cl.name as class_name,y.name as academic_year,o.term from edu_assessment_attempts t join edu_assessments a on a.id=t.assessment_id join edu_course_offerings o on o.id=a.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id join edu_academic_years y on y.id=o.academic_year_id where t.student_user_id=${access.user.id} and t.status='marked' and t.released_at is not null order by t.released_at desc,t.marked_at desc nulls last,t.submitted_at desc`,
      getEducationGradingBands(sql)
    ]);
    const results=rows.map(r=>{
      const score=Number(r.score||0),maxScore=Number(r.max_score||0),percentage=maxScore>0?Math.round((score/maxScore)*10000)/100:0;
      const grading=applyEducationGrade(percentage,bands);
      return {...r,percentage,grade:grading.grade,outcome:grading.outcome};
    });
    const percentages=results.map(r=>r.percentage);
    const average=percentages.length?Math.round((percentages.reduce((a,b)=>a+b,0)/percentages.length)*100)/100:0;
    const best=percentages.length?Math.max(...percentages):0;
    const passCount=results.filter(r=>r.outcome==='PASS').length;
    const chronological=[...results].sort((a,b)=>new Date(a.released_at||a.marked_at||a.submitted_at||0)-new Date(b.released_at||b.marked_at||b.submitted_at||0));
    const recent=chronological.slice(-3).map(r=>r.percentage),previous=chronological.slice(-6,-3).map(r=>r.percentage);
    const recentAvg=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:0,previousAvg=previous.length?previous.reduce((a,b)=>a+b,0)/previous.length:recentAvg;
    const trendDelta=Math.round((recentAvg-previousAvg)*100)/100;
    return NextResponse.json({ok:true,student:{id:access.user.id,email:access.user.email,fullName:access.user.full_name||access.user.fullName||access.user.email},gradingBands:bands,summary:{count:results.length,average,best,passCount,reviewCount:results.length-passCount,trendDelta},results});
  }catch(error){console.error('Education student results unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load Education assessment results.'},{status:503});}
}
