'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Bot, CheckCircle2, Clock3, FileQuestion, FileText, ListChecks, Search, Send, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './ai-tutor.module.css';

const prompts=['Explain the key points in this topic.','Summarise the approved material for revision.','What are the most important exam points here?'];

function formatTime(total){
  const safe=Math.max(0,total||0),minutes=Math.floor(safe/60),seconds=safe%60;
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function PracticeSet({set}){
  const [selected,setSelected]=useState({});
  const [shown,setShown]=useState({});
  const [finished,setFinished]=useState(!set.timed);
  const [secondsLeft,setSecondsLeft]=useState(set.timed?Math.max(1,Number(set.durationMinutes)||10)*60:0);

  useEffect(()=>{
    if(!set.timed||finished)return;
    const timer=setInterval(()=>setSecondsLeft(value=>{
      if(value<=1){setFinished(true);return 0;}
      return value-1;
    }),1000);
    return ()=>clearInterval(timer);
  },[set.timed,finished]);

  const answered=Object.keys(selected).length;
  const score=set.mode==='mcq'&&finished?set.questions.reduce((sum,q,index)=>sum+(selected[index]===q.correctIndex?1:0),0):null;

  function choose(index,option){
    if(set.timed&&finished)return;
    setSelected(value=>({...value,[index]:option}));
    if(!set.timed)setShown(value=>({...value,[index]:true}));
  }

  return <div style={{marginTop:14,padding:14,border:'1px solid #dbe9e2',borderRadius:16,background:'#fbfefd'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginBottom:10,flexWrap:'wrap'}}><div><b>{set.title}</b><small style={{display:'block',marginTop:3}}>{set.questions.length} questions{set.timed?` • ${set.durationMinutes} minute timed session`:''}</small></div>{set.timed&&<div style={{display:'flex',alignItems:'center',gap:7,padding:'8px 11px',borderRadius:12,background:finished?'#eef5f1':secondsLeft<=60?'#fff1f0':'#eef8f3',fontWeight:900,color:secondsLeft<=60&&!finished?'#b42318':'#08744d'}}><Clock3 size={17}/>{finished?'Finished':formatTime(secondsLeft)}</div>}</div>
    {set.timed&&<div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',padding:'10px 12px',borderRadius:12,background:'#f3f8f5',marginBottom:12,flexWrap:'wrap'}}><span style={{fontSize:13,fontWeight:700}}>{finished?`Answered ${answered} of ${set.questions.length}`:`Countdown active • ${answered} answered`}</span>{!finished&&<button onClick={()=>{if(window.confirm('Submit this timed practice now?'))setFinished(true);}} style={{border:0,background:'#08744d',color:'#fff',padding:'8px 11px',borderRadius:10,fontWeight:800}}>Submit practice</button>}{finished&&set.mode==='mcq'&&<b>Score: {score}/{set.questions.length} ({Math.round((score/set.questions.length)*100)}%)</b>}</div>}
    <div style={{display:'grid',gap:12}}>{set.questions.map((q,index)=><article key={q.id||index} style={{background:'#fff',border:'1px solid #e3eee8',borderRadius:14,padding:13}}><b>{index+1}. {q.question}</b>
      {set.mode==='mcq'?<div style={{display:'grid',gap:7,marginTop:10}}>{(q.options||[]).map((opt,i)=>{const chosen=selected[index]===i,reveal=set.timed?finished:shown[index];return <button key={i} disabled={set.timed&&finished} onClick={()=>choose(index,i)} style={{textAlign:'left',padding:'10px 11px',borderRadius:10,border:'1px solid #d9e7e0',background:reveal&&i===q.correctIndex?'#e9f8ef':reveal&&chosen&&i!==q.correctIndex?'#fff1f0':chosen?'#eef8f3':'#fff',fontWeight:chosen?800:600,cursor:set.timed&&finished?'default':'pointer'}}>{String.fromCharCode(65+i)}. {opt}</button>})}{(set.timed?finished:shown[index])&&<div style={{padding:10,borderRadius:10,background:'#f4faf7',lineHeight:1.5}}><b>{selected[index]===q.correctIndex?'Correct.':'Review this answer.'}</b> {q.explanation}</div>}</div>:<div style={{marginTop:10}}>{set.timed&&!finished?<textarea placeholder="Type your answer here while the timer is running…" rows={4} style={{width:'100%',boxSizing:'border-box',border:'1px solid #d6e4dd',borderRadius:10,padding:10,resize:'vertical'}}/>:<><button onClick={()=>setShown(v=>({...v,[index]:!v[index]}))} style={{padding:'9px 11px',borderRadius:10,border:'1px solid #cfe1d8',background:'#eef8f3',fontWeight:800,color:'#08744d'}}>{shown[index]?'Hide answer guide':'Show answer guide'}</button>{shown[index]&&<div style={{marginTop:8,padding:10,borderRadius:10,background:'#f4faf7',lineHeight:1.55}}>{q.answerGuide}</div>}</>}</div>}
    </article>)}</div>
  </div>;
}

export default function AITutor(){
  const [sources,setSources]=useState([]),[course,setCourse]=useState('all'),[question,setQuestion]=useState(''),[messages,setMessages]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [topic,setTopic]=useState(''),[practiceType,setPracticeType]=useState('mcq'),[count,setCount]=useState(5),[timed,setTimed]=useState(false),[durationMinutes,setDurationMinutes]=useState(20);
  useEffect(()=>{fetch('/api/education/student/ai-tutor',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.ok)setSources(data.sources||[]);else setError(data.error||'AI Tutor sources unavailable.');}).catch(()=>setError('AI Tutor sources unavailable.'));},[]);
  const courses=useMemo(()=>[...new Map(sources.map(s=>[String(s.offering_id),{id:String(s.offering_id),label:`${s.code} — ${s.course_title}`}])).values()],[sources]);
  const visibleSources=useMemo(()=>course==='all'?sources:sources.filter(s=>String(s.offering_id)===course),[course,sources]);

  async function post(payload){
    const response=await fetch('/api/education/student/ai-tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,offeringId:course==='all'?null:Number(course)})});
    const data=await response.json(); if(!response.ok||!data.ok)throw new Error(data.error||'AI Tutor request failed.'); return data;
  }

  async function ask(text){
    const clean=String(text||question).trim(); if(!clean||loading)return; setQuestion('');setLoading(true);setError('');
    try{const data=await post({mode:'answer',question:clean});setMessages(prev=>[...prev,{kind:'answer',q:clean,a:data.answer,citations:data.citations||[],serviceReady:data.serviceReady!==false}]);}
    catch(e){setError(e.message||'AI Tutor request failed.');}finally{setLoading(false);}
  }

  async function generatePractice(type,focus,label){
    const clean=String(focus||topic).trim(); if(!clean||loading)return; setLoading(true);setError('');
    try{const data=await post({mode:type,topic:clean,count});setMessages(prev=>[...prev,{kind:'practice',q:label||`${type==='mcq'?'MCQs':'Written questions'} on: ${clean}`,set:{mode:type,title:data.title||'Practice questions',questions:data.questions||[],timed,durationMinutes:timed?durationMinutes:null},a:data.answer||'',citations:data.citations||[],serviceReady:data.serviceReady!==false}]);}
    catch(e){setError(e.message||'Practice generation failed.');}finally{setLoading(false);}
  }

  const buttonStyle={border:'1px solid #cfe1d8',background:'#eef8f3',color:'#08744d',padding:'9px 11px',borderRadius:10,fontWeight:800,display:'inline-flex',gap:6,alignItems:'center'};

  return <main className={styles.page}>
    <header className={styles.header}><div><Link href="/education/student" className={styles.back}><ArrowLeft size={18}/> Student portal</Link><span className={styles.eyebrow}>APPROVED-MATERIAL AI</span><h1><Sparkles size={28}/> AI Tutor</h1><p>Learn, then instantly test yourself with grounded MCQs or written questions.</p></div><div className={styles.guard}><ShieldCheck size={20}/><span>Grounded answers only</span></div></header>
    <section className={styles.grid}>
      <aside className={styles.sources}><div className={styles.sectionTitle}><BookOpen size={19}/><div><b>Approved sources</b><small>{visibleSources.length} available</small></div></div>
        <label>Course scope<select value={course} onChange={e=>setCourse(e.target.value)}><option value="all">All approved courses</option>{courses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <div className={styles.sourceList}>{visibleSources.map(item=><article key={item.id}><span className={styles.fileIcon}><FileText size={18}/></span><div><strong>{item.title}</strong><small>{item.code} · {item.material_type}</small></div><CheckCircle2 size={17}/></article>)}</div>
        <div style={{marginTop:16,padding:14,border:'1px solid #dce9e3',borderRadius:16,background:'#fff'}}><b style={{display:'block',marginBottom:8}}>Create practice on any approved topic</b><textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3} placeholder="e.g. septic shock, neonatal jaundice, asthma management" style={{width:'100%',boxSizing:'border-box',border:'1px solid #d6e4dd',borderRadius:10,padding:10,resize:'vertical'}}/><div style={{display:'flex',gap:7,marginTop:8,flexWrap:'wrap'}}><button onClick={()=>setPracticeType('mcq')} style={{...buttonStyle,background:practiceType==='mcq'?'#dff4e9':'#eef8f3'}}><ListChecks size={15}/> MCQ</button><button onClick={()=>setPracticeType('written')} style={{...buttonStyle,background:practiceType==='written'?'#dff4e9':'#eef8f3'}}><FileQuestion size={15}/> Written</button><select value={count} onChange={e=>setCount(Number(e.target.value))} style={{border:'1px solid #cfe1d8',borderRadius:10,padding:'9px 10px'}}><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={20}>20 questions</option><option value={30}>30 questions</option><option value={50}>50 questions</option></select></div><div style={{display:'flex',gap:7,marginTop:8,flexWrap:'wrap',alignItems:'center'}}><button onClick={()=>setTimed(v=>!v)} style={{...buttonStyle,background:timed?'#dff4e9':'#eef8f3'}}><Clock3 size={15}/>{timed?'Timed mode on':'Use countdown timer'}</button>{timed&&<select value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))} style={{border:'1px solid #cfe1d8',borderRadius:10,padding:'9px 10px'}}><option value={5}>5 minutes</option><option value={10}>10 minutes</option><option value={15}>15 minutes</option><option value={20}>20 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option><option value={120}>120 minutes</option></select>}<button disabled={!topic.trim()||loading||!sources.length} onClick={()=>generatePractice(practiceType,topic)} style={{...buttonStyle,background:'#08744d',color:'#fff'}}>Generate now</button></div></div>
        <div className={styles.rule}><ShieldCheck size={18}/><p><b>No unsupported questions.</b> Practice is generated only from published, lecturer-approved material in your active courses.</p></div>
      </aside>
      <section className={styles.chat}><div className={styles.chatHead}><Bot size={22}/><div><b>Dropare AI Tutor</b><small>Student learning assistant</small></div></div>
        <div className={styles.chatBody}>{error&&<div className={styles.rule}><p>{error}</p></div>}{messages.length===0?<div className={styles.empty}><span><Bot size={30}/></span><h2>Learn, then test yourself</h2><p>{sources.length?'Ask a lesson question, or use the topic practice builder to create up to 50 MCQs or written questions, with optional countdown timing.':'No AI-approved course material is available for your enrolments yet.'}</p><div className={styles.prompts}>{prompts.map(item=><button key={item} disabled={!sources.length||loading} onClick={()=>ask(item)}><Search size={15}/>{item}</button>)}</div></div>:messages.map((item,index)=><div className={styles.exchange} key={`${item.q}-${index}`}><div className={styles.userBubble}><b>You</b><p>{item.q}</p></div><div className={styles.aiBubble}><b><Bot size={16}/> AI Tutor</b>{item.a&&<p>{item.a}</p>}{item.kind==='answer'&&item.serviceReady&&<div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:10}}><button style={buttonStyle} disabled={loading} onClick={()=>generatePractice('mcq',item.q,'Quiz me on what I just learned — MCQs')}><ListChecks size={15}/> Quiz me with MCQs</button><button style={buttonStyle} disabled={loading} onClick={()=>generatePractice('written',item.q,'Quiz me on what I just learned — Written')}><FileQuestion size={15}/> Written questions</button></div>}{item.kind==='practice'&&item.set?.questions?.length>0&&<PracticeSet set={item.set}/>} {item.citations.length>0&&<small><ShieldCheck size={14}/> Sources: {item.citations.map(c=>`${c.courseCode} — ${c.title}`).join(' · ')}</small>}</div></div>)}</div>
        <div className={styles.composer}><textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask();}}} placeholder="Ask a question from approved course materials…" rows={2}/><button disabled={loading||!sources.length} onClick={()=>ask()} aria-label="Ask AI Tutor"><Send size={19}/></button></div>
      </section>
    </section>
  </main>;
}
