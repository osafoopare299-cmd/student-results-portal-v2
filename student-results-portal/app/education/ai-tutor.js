'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Bot, CheckCircle2, FileText, Search, Send, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './ai-tutor.module.css';

const prompts = ['Explain the key points in this topic.','Summarise the approved material for revision.','Create five revision questions from the approved material.'];

export default function AITutor() {
  const [sources,setSources]=useState([]);
  const [course,setCourse]=useState('all');
  const [question,setQuestion]=useState('');
  const [messages,setMessages]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{ fetch('/api/education/student/ai-tutor',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.ok)setSources(data.sources||[]);else setError(data.error||'AI Tutor sources unavailable.');}).catch(()=>setError('AI Tutor sources unavailable.')); },[]);
  const courses=useMemo(()=>[...new Map(sources.map(s=>[String(s.offering_id),{id:String(s.offering_id),label:`${s.code} — ${s.course_title}`}])).values()], [sources]);
  const visibleSources=useMemo(()=>course==='all'?sources:sources.filter(s=>String(s.offering_id)===course),[course,sources]);

  async function ask(text){
    const clean=String(text||question).trim(); if(!clean||loading)return;
    setQuestion(''); setLoading(true); setError('');
    try{
      const response=await fetch('/api/education/student/ai-tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:clean,offeringId:course==='all'?null:Number(course)})});
      const data=await response.json();
      if(!response.ok||!data.ok) throw new Error(data.error||'AI Tutor request failed.');
      setMessages(prev=>[...prev,{q:clean,a:data.answer,citations:data.citations||[],serviceReady:data.serviceReady!==false}]);
    }catch(e){setError(e.message||'AI Tutor request failed.');}finally{setLoading(false);}
  }

  return <main className={styles.page}>
    <header className={styles.header}><div><Link href="/education/student" className={styles.back}><ArrowLeft size={18}/> Student portal</Link><span className={styles.eyebrow}>APPROVED-MATERIAL AI</span><h1><Sparkles size={28}/> AI Tutor</h1><p>Ask questions against lecturer-approved course materials only.</p></div><div className={styles.guard}><ShieldCheck size={20}/><span>Grounded answers only</span></div></header>
    <section className={styles.grid}>
      <aside className={styles.sources}><div className={styles.sectionTitle}><BookOpen size={19}/><div><b>Approved sources</b><small>{visibleSources.length} available</small></div></div>
        <label>Course scope<select value={course} onChange={e=>setCourse(e.target.value)}><option value="all">All approved courses</option>{courses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <div className={styles.sourceList}>{visibleSources.map(item=><article key={item.id}><span className={styles.fileIcon}><FileText size={18}/></span><div><strong>{item.title}</strong><small>{item.code} · {item.material_type}</small></div><CheckCircle2 size={17}/></article>)}</div>
        <div className={styles.rule}><ShieldCheck size={18}/><p><b>No unsupported answers.</b> Only published materials explicitly approved by the lecturer for AI grounding are eligible.</p></div>
      </aside>
      <section className={styles.chat}><div className={styles.chatHead}><Bot size={22}/><div><b>Dropare AI Tutor</b><small>Student learning assistant</small></div></div>
        <div className={styles.chatBody}>{error&&<div className={styles.rule}><p>{error}</p></div>}{messages.length===0?<div className={styles.empty}><span><Bot size={30}/></span><h2>Ask from your approved materials</h2><p>{sources.length?'Choose a course scope or ask across all approved sources.':'No AI-approved course material is available for your enrolments yet.'}</p><div className={styles.prompts}>{prompts.map(item=><button key={item} disabled={!sources.length||loading} onClick={()=>ask(item)}><Search size={15}/>{item}</button>)}</div></div>:messages.map((item,index)=><div className={styles.exchange} key={`${item.q}-${index}`}><div className={styles.userBubble}><b>You</b><p>{item.q}</p></div><div className={styles.aiBubble}><b><Bot size={16}/> AI Tutor</b><p>{item.a}</p>{item.citations.length>0&&<small><ShieldCheck size={14}/> Sources: {item.citations.map(c=>`${c.courseCode} — ${c.title}`).join(' · ')}</small>}</div></div>)}</div>
        <div className={styles.composer}><textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask();}}} placeholder="Ask a question from approved course materials…" rows={2}/><button disabled={loading||!sources.length} onClick={()=>ask()} aria-label="Ask AI Tutor"><Send size={19}/></button></div>
      </section>
    </section>
  </main>;
}
