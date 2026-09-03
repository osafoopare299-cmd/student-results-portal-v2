'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react';

function avg(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}

export default function PracticeAnalyticsPage(){
  const [history,setHistory]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{fetch('/api/education/student/ai-tutor/history',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Unable to load practice analytics.');setHistory(d.history||[]);}).catch(e=>setError(e.message||'Unable to load practice analytics.')).finally(()=>setLoading(false));},[]);

  const analytics=useMemo(()=>{
    const mcq=history.filter(item=>item.mode==='mcq'&&item.percent_score!==null&&item.percent_score!==undefined).map(item=>({...item,score:Number(item.percent_score)||0}));
    const scores=mcq.map(item=>item.score);
    const grouped=new Map();
    mcq.forEach(item=>{const topic=String(item.topic||'').trim()||'Untitled topic',key=topic.toLowerCase().replace(/\s+/g,' '),g=grouped.get(key)||{topic,total:0,n:0,last:0};g.total+=item.score;g.n+=1;g.last=Math.max(g.last,new Date(item.completed_at).getTime()||0);grouped.set(key,g);});
    const topics=[...grouped.values()].map(g=>({...g,average:g.total/g.n}));
    const strongest=[...topics].sort((a,b)=>b.average-a.average||b.last-a.last).slice(0,3);
    const weakest=[...topics].sort((a,b)=>a.average-b.average||b.last-a.last).slice(0,3);
    const chronological=[...mcq].sort((a,b)=>new Date(a.completed_at)-new Date(b.completed_at));
    const recent=chronological.slice(-5).map(x=>x.score),previous=chronological.slice(-10,-5).map(x=>x.score);
    const delta=recent.length&&previous.length?avg(recent)-avg(previous):0;
    return {attempts:mcq.length,average:avg(scores),best:scores.length?Math.max(...scores):0,recentAverage:avg(recent),delta,strongest,weakest,trend:chronological.slice(-10)};
  },[history]);

  const card={background:'#fff',border:'1px solid #dce9e2',borderRadius:18,padding:18,boxShadow:'0 10px 28px rgba(19,61,43,.06)'};
  return <main style={{minHeight:'100vh',background:'#f3f8f5',padding:24,color:'#17352b'}}><div style={{maxWidth:1050,margin:'0 auto'}}>
    <Link href="/education/student" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#0b6d45',fontWeight:800,textDecoration:'none',marginBottom:18}}><ArrowLeft size={18}/> Student portal</Link>
    <div style={{...card,background:'linear-gradient(135deg,#0f5b3d,#0b7b4b)',color:'#fff',padding:24,marginBottom:18}}><div style={{display:'flex',alignItems:'center',gap:10}}><BarChart3 size={28}/><div><h1 style={{margin:0,fontSize:30}}>AI Practice Analytics</h1><p style={{margin:'6px 0 0',color:'#e5f8ee'}}>Your private MCQ practice progress from AI Tutor sessions.</p></div></div></div>
    {loading?<div style={card}>Loading analytics…</div>:error?<div style={card}>{error}</div>:analytics.attempts===0?<div style={card}>Complete an AI Tutor MCQ practice set to start building your analytics.</div>:<>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:16}}><div style={card}><small>Average score</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{Math.round(analytics.average)}%</div></div><div style={card}><small>Best score</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{Math.round(analytics.best)}%</div></div><div style={card}><small>Recent average</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{Math.round(analytics.recentAverage)}%</div></div><div style={card}><small>MCQ attempts</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{analytics.attempts}</div></div></section>
      <section style={{...card,marginBottom:16}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>{analytics.delta>=0?<TrendingUp size={20}/>:<TrendingDown size={20}/>}<b>Performance trend</b></div><p style={{margin:'0 0 14px',color:'#60786e'}}>{analytics.delta>1?`Improving by about ${Math.round(analytics.delta)} percentage points compared with the previous five attempts.`:analytics.delta<-1?`Recent performance is about ${Math.abs(Math.round(analytics.delta))} percentage points lower than the previous five attempts.`:'Recent performance is broadly stable.'}</p><div style={{display:'flex',alignItems:'end',gap:8,height:120,paddingTop:8}}>{analytics.trend.map((item,index)=><div key={item.id||index} title={`${Math.round(item.score)}%`} style={{flex:1,minWidth:12,height:`${Math.max(8,item.score)}%`,background:'#0d7548',borderRadius:'8px 8px 3px 3px'}}/> )}</div><small style={{display:'block',marginTop:8,color:'#789087'}}>Last {analytics.trend.length} MCQ attempts</small></section>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}><div style={card}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Trophy size={20}/><b>Strongest topics</b></div>{analytics.strongest.map((item,index)=><div key={item.topic} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderTop:index?'1px solid #edf3ef':'none'}}><span>{item.topic}</span><b>{Math.round(item.average)}%</b></div>)}</div><div style={card}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><Target size={20}/><b>Weakest topics</b></div>{analytics.weakest.map((item,index)=><div key={item.topic} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderTop:index?'1px solid #edf3ef':'none'}}><span>{item.topic}</span><b>{Math.round(item.average)}%</b></div>)}</div></section>
    </>}
  </div></main>;
}
