import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../../lib/education-session';
import { getEducationSql } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

function average(values){
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : 0;
}

function baseTopic(value){
  return String(value||'').replace(/\s+[—-]\s+mistake review\s*$/i,'').trim() || 'Untitled topic';
}

function masteryLevel(attempts,averageScore,recentAverage){
  if(attempts>=3 && averageScore>=85 && recentAverage>=85) return 'mastered';
  if(attempts>=2 && averageScore>=75 && recentAverage>=75) return 'proficient';
  if(averageScore>=55 || recentAverage>=60) return 'developing';
  return 'needs_work';
}

export async function GET(){
  const access=await getEducationUser('student');
  if(!access.ok) return NextResponse.json({ok:false,error:'Student access required.'},{status:401});

  try{
    const sql=getEducationSql();
    const rows=await sql`
      select h.id,h.mode,h.topic,h.question_count,h.answered_count,h.correct_count,h.percent_score,
             h.timed,h.duration_minutes,h.elapsed_seconds,h.completion_reason,h.difficulty,h.completed_at,
             c.code as course_code,c.title as course_title
      from edu_ai_practice_history h
      left join edu_course_offerings o on o.id=h.offering_id
      left join edu_courses c on c.id=o.course_id
      where h.student_user_id=${access.user.id}
      order by h.completed_at asc
    `;

    const mcq=rows.filter(item=>item.mode==='mcq'&&item.percent_score!==null&&item.percent_score!==undefined)
      .map(item=>({...item,score:Number(item.percent_score)||0,topic:baseTopic(item.topic)}));
    const written=rows.filter(item=>item.mode==='written');
    const scores=mcq.map(item=>item.score);
    const recent=mcq.slice(-5).map(item=>item.score);
    const previous=mcq.slice(-10,-5).map(item=>item.score);
    const totalElapsed=rows.reduce((sum,item)=>sum+(Number(item.elapsed_seconds)||0),0);

    const topicMap=new Map();
    mcq.forEach(item=>{
      const key=item.topic.toLowerCase().replace(/\s+/g,' ');
      const group=topicMap.get(key)||{topic:item.topic,scores:[],attempts:0,lastAt:null};
      group.scores.push(item.score);
      group.attempts+=1;
      group.lastAt=item.completed_at;
      topicMap.set(key,group);
    });
    const topics=[...topicMap.values()].map(group=>{
      const avg=average(group.scores);
      const recentAvg=average(group.scores.slice(-3));
      return {...group,average:avg,recentAverage:recentAvg,mastery:masteryLevel(group.attempts,avg,recentAvg)};
    });

    const masteryOrder={needs_work:0,developing:1,proficient:2,mastered:3};
    const difficulty=['foundation','standard','challenge'].map(name=>{
      const subset=mcq.filter(item=>item.difficulty===name);
      return {difficulty:name,attempts:subset.length,average:average(subset.map(item=>item.score)),best:subset.length?Math.max(...subset.map(item=>item.score)):0};
    });
    const timing=['self_paced','timed'].map(kind=>{
      const subset=mcq.filter(item=>kind==='timed'?item.timed:!item.timed);
      return {type:kind,attempts:subset.length,average:average(subset.map(item=>item.score)),best:subset.length?Math.max(...subset.map(item=>item.score)):0};
    });

    const strongest=[...topics].sort((a,b)=>masteryOrder[b.mastery]-masteryOrder[a.mastery]||b.average-a.average||b.attempts-a.attempts).slice(0,5);
    const weakest=[...topics].sort((a,b)=>masteryOrder[a.mastery]-masteryOrder[b.mastery]||a.average-b.average||b.attempts-a.attempts).slice(0,5);
    const masteryCounts={needs_work:0,developing:0,proficient:0,mastered:0};
    topics.forEach(item=>{masteryCounts[item.mastery]+=1;});

    return NextResponse.json({
      ok:true,
      summary:{
        totalSessions:rows.length,
        mcqAttempts:mcq.length,
        writtenSessions:written.length,
        average:average(scores),
        best:scores.length?Math.max(...scores):0,
        recentAverage:average(recent),
        trendDelta:recent.length&&previous.length?average(recent)-average(previous):0,
        totalElapsedSeconds:totalElapsed,
        topicsPractised:topics.length
      },
      masteryCounts,
      topics,
      strongest,
      weakest,
      difficulty,
      timing,
      trend:mcq.slice(-12).map(item=>({id:item.id,score:item.score,topic:item.topic,difficulty:item.difficulty,timed:item.timed,completedAt:item.completed_at})),
      recentSessions:rows.slice(-10).reverse()
    });
  }catch(error){
    console.error('AI practice analytics unavailable:',error);
    return NextResponse.json({ok:false,error:'Practice analytics are not ready yet.'},{status:503});
  }
}
