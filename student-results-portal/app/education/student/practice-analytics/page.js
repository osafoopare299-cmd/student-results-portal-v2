'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, BrainCircuit, Clock3, Gauge, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react';

const masteryLabels={needs_work:'Needs work',developing:'Developing',proficient:'Proficient',mastered:'Mastered'};
const difficultyLabels={foundation:'Foundation',standard:'Standard',challenge:'Challenge'};

function minutes(seconds){
  const value=Math.max(0,Number(seconds)||0);
  if(value<60)return `${value}s`;
  const mins=Math.round(value/60);
  if(mins<60)return `${mins} min`;
  const hours=Math.floor(mins/60),remainder=mins%60;
  return remainder?`${hours}h ${remainder}m`:`${hours}h`;
}

export default function PracticeAnalyticsPage(){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    fetch('/api/education/student/ai-tutor/analytics',{cache:'no-store'})
      .then(async response=>{const body=await response.json();if(!response.ok||!body.ok)throw new Error(body.error||'Unable to load practice analytics.');setData(body);})
      .catch(err=>setError(err.message||'Unable to load practice analytics.'))
      .finally(()=>setLoading(false));
  },[]);

  const card={background:'#fff',border:'1px solid #dce9e2',borderRadius:18,padding:18,boxShadow:'0 10px 28px rgba(19,61,43,.06)'};
  const summary=data?.summary;

  return <main style={{minHeight:'100vh',background:'#f3f8f5',padding:24,color:'#17352b'}}><div style={{maxWidth:1120,margin:'0 auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:18}}>
      <Link href="/education/student" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#0b6d45',fontWeight:800,textDecoration:'none'}}><ArrowLeft size={18}/> Student portal</Link>
      <Link href="/education/student/ai-tutor" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#0b6d45',fontWeight:800,textDecoration:'none'}}>Open AI Tutor</Link>
    </div>
    <div style={{...card,background:'linear-gradient(135deg,#0f5b3d,#0b7b4b)',color:'#fff',padding:26,marginBottom:18}}><div style={{display:'flex',alignItems:'center',gap:12}}><BarChart3 size={30}/><div><h1 style={{margin:0,fontSize:30}}>AI Practice Analytics</h1><p style={{margin:'6px 0 0',color:'#e5f8ee'}}>Full-history mastery, difficulty, timing and performance analytics for your private AI Tutor practice.</p></div></div></div>

    {loading?<div style={card}>Loading analytics…</div>:error?<div style={card}>{error}</div>:!summary?.mcqAttempts?<div style={card}>Complete an AI Tutor MCQ practice set to start building your mastery analytics.</div>:<>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:16}}>
        <div style={card}><small>Average score</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{Math.round(summary.average)}%</div></div>
        <div style={card}><small>Best score</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{Math.round(summary.best)}%</div></div>
        <div style={card}><small>Recent average</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{Math.round(summary.recentAverage)}%</div></div>
        <div style={card}><small>Topics practised</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{summary.topicsPractised}</div></div>
        <div style={card}><small>Total sessions</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{summary.totalSessions}</div><small style={{color:'#789087'}}>{summary.writtenSessions} written</small></div>
        <div style={card}><small>Practice time</small><div style={{fontSize:26,fontWeight:900,marginTop:7}}>{minutes(summary.totalElapsedSeconds)}</div></div>
      </section>

      <section style={{...card,marginBottom:16}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><BrainCircuit size={20}/><b>Topic mastery</b></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>{Object.entries(data.masteryCounts||{}).map(([key,value])=><div key={key} style={{padding:14,borderRadius:14,background:'#f5faf7'}}><small>{masteryLabels[key]||key}</small><div style={{fontSize:28,fontWeight:900,marginTop:4}}>{value}</div><small style={{color:'#789087'}}>topic{value===1?'':'s'}</small></div>)}</div></section>

      <section style={{...card,marginBottom:16}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>{summary.trendDelta>=0?<TrendingUp size={20}/>:<TrendingDown size={20}/>}<b>Performance trend</b></div><p style={{margin:'0 0 14px',color:'#60786e'}}>{summary.trendDelta>1?`Improving by about ${Math.round(summary.trendDelta)} percentage points versus the previous five scored attempts.`:summary.trendDelta<-1?`Recent performance is about ${Math.abs(Math.round(summary.trendDelta))} percentage points lower than the previous five attempts.`:'Recent performance is broadly stable.'}</p><div style={{display:'flex',alignItems:'end',gap:7,height:125,paddingTop:8}}>{(data.trend||[]).map((item,index)=><div key={item.id||index} title={`${item.topic}: ${Math.round(item.score)}%`} style={{flex:1,minWidth:10,height:`${Math.max(8,item.score)}%`,background:'#0d7548',borderRadius:'8px 8px 3px 3px'}}/> )}</div><small style={{display:'block',marginTop:8,color:'#789087'}}>Last {(data.trend||[]).length} scored MCQ attempts</small></section>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16,marginBottom:16}}>
        <div style={card}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Gauge size={20}/><b>By difficulty</b></div>{(data.difficulty||[]).map((item,index)=><div key={item.difficulty} style={{padding:'11px 0',borderTop:index?'1px solid #edf3ef':'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><b>{difficultyLabels[item.difficulty]||item.difficulty}</b><b>{item.attempts?`${Math.round(item.average)}%`:'—'}</b></div><small style={{color:'#789087'}}>{item.attempts} attempt{item.attempts===1?'':'s'}{item.attempts?` • best ${Math.round(item.best)}%`:''}</small></div>)}</div>
        <div style={card}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Clock3 size={20}/><b>Timed vs self-paced</b></div>{(data.timing||[]).map((item,index)=><div key={item.type} style={{padding:'11px 0',borderTop:index?'1px solid #edf3ef':'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><b>{item.type==='timed'?'Timed':'Self-paced'}</b><b>{item.attempts?`${Math.round(item.average)}%`:'—'}</b></div><small style={{color:'#789087'}}>{item.attempts} attempt{item.attempts===1?'':'s'}{item.attempts?` • best ${Math.round(item.best)}%`:''}</small></div>)}</div>
      </section>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
        <div style={card}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Trophy size={20}/><b>Strongest topics</b></div>{(data.strongest||[]).map((item,index)=><div key={item.topic} style={{padding:'11px 0',borderTop:index?'1px solid #edf3ef':'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><span>{item.topic}</span><b>{Math.round(item.average)}%</b></div><small style={{color:'#789087'}}>{masteryLabels[item.mastery]} • {item.attempts} attempt{item.attempts===1?'':'s'}</small></div>)}</div>
        <div style={card}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Target size={20}/><b>Priority revision topics</b></div>{(data.weakest||[]).map((item,index)=><div key={item.topic} style={{padding:'11px 0',borderTop:index?'1px solid #edf3ef':'none'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><span>{item.topic}</span><b>{Math.round(item.average)}%</b></div><small style={{color:'#789087'}}>{masteryLabels[item.mastery]} • {item.attempts} attempt{item.attempts===1?'':'s'}</small></div>)}</div>
      </section>
    </>}
  </div></main>;
}
