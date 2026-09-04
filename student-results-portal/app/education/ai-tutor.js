'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, ArrowLeft, BookOpen, Bot, CheckCircle2, Clock3, FileQuestion, FileText, History, ListChecks, RotateCcw, Search, Send, ShieldCheck, Sparkles, Target } from 'lucide-react';
import styles from './ai-tutor.module.css';

const prompts=['Explain the key points in this topic.','Summarise the approved material for revision.','What are the most important exam points here?'];

function formatTime(total){
  const safe=Math.max(0,total||0),minutes=Math.floor(safe/60),seconds=safe%60;
  return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}

function difficultyLabel(value){
  if(value==='foundation')return 'Foundation';
  if(value==='challenge')return 'Challenge';
  return 'Standard';
}

function cleanMasteryTopic(value){
  return String(value||'').replace(/\s+—\s+mistake review$/i,'').trim();
}

function masteryFor(scores){
  const values=scores.map(item=>Number(item.percent)||0);
  const attempts=values.length;
  const average=attempts?values.reduce((sum,value)=>sum+value,0)/attempts:0;
  const recent=values.slice(-2);
  const recentStrong=recent.length>=2&&recent.every(value=>value>=80);
  if(attempts>=3&&average>=85&&recentStrong)return {level:'Mastered',rank:4};
  if(attempts>=2&&average>=75)return {level:'Proficient',rank:3};
  if(average>=60)return {level:'Developing',rank:2};
  return {level:'Needs work',rank:1};
}

function masteryStyle(level){
  if(level==='Mastered')return {background:'#e7f7ee',border:'1px solid #bfe2cf',color:'#08744d'};
  if(level==='Proficient')return {background:'#edf6ff',border:'1px solid #cfe0f3',color:'#245a8d'};
  if(level==='Developing')return {background:'#fff8e8',border:'1px solid #efdcae',color:'#7b5d15'};
  return {background:'#fff1f0',border:'1px solid #f0cbc7',color:'#a13b32'};
}

function PracticeSet({set,onComplete}){
  const [selected,setSelected]=useState({});
  const [writtenAnswers,setWrittenAnswers]=useState({});
  const [shown,setShown]=useState({});
  const [finished,setFinished]=useState(false);
  const [retryQuestions,setRetryQuestions]=useState(null);
  const [secondsLeft,setSecondsLeft]=useState(set.timed?Math.max(1,Number(set.durationMinutes)||10)*60:0);
  const startedAt=useRef(Date.now());
  const saved=useRef(false);

  const retryActive=Boolean(retryQuestions);
  const activeQuestions=retryQuestions||set.questions;
  const timedSession=Boolean(set.timed&&!retryActive);
  const answered=set.mode==='mcq'?Object.keys(selected).length:Object.values(writtenAnswers).filter(value=>String(value||'').trim()).length;
  const score=set.mode==='mcq'&&finished?activeQuestions.reduce((sum,q,index)=>sum+(selected[index]===q.correctIndex?1:0),0):null;
  const wrongCount=set.mode==='mcq'&&finished?activeQuestions.length-score:0;

  function finish(reason='submitted'){
    if(finished)return;
    setFinished(true);
    if(saved.current)return;
    saved.current=true;
    const answeredNow=set.mode==='mcq'?Object.keys(selected).length:Object.values(writtenAnswers).filter(value=>String(value||'').trim()).length;
    const correctNow=set.mode==='mcq'?activeQuestions.reduce((sum,q,index)=>sum+(selected[index]===q.correctIndex?1:0),0):null;
    const elapsedSeconds=Math.max(0,Math.round((Date.now()-startedAt.current)/1000));
    onComplete?.({
      mode:set.mode,
      topic:retryActive?`${set.topic} — mistake review`:set.topic,
      questionCount:activeQuestions.length,
      answeredCount:answeredNow,
      correctCount:correctNow,
      timed:timedSession,
      durationMinutes:timedSession?set.durationMinutes:null,
      elapsedSeconds,
      completionReason:reason,
      offeringId:set.offeringId||null,
      difficulty:set.difficulty||'standard'
    });
  }

  useEffect(()=>{
    if(!timedSession||finished)return;
    const timer=setInterval(()=>setSecondsLeft(value=>{
      if(value<=1){setTimeout(()=>finish('time_expired'),0);return 0;}
      return value-1;
    }),1000);
    return ()=>clearInterval(timer);
  },[timedSession,finished]);

  function choose(index,option){
    if(finished)return;
    setSelected(value=>({...value,[index]:option}));
    if(!timedSession)setShown(value=>({...value,[index]:true}));
  }

  function retryMistakes(){
    if(set.mode!=='mcq'||!finished)return;
    const wrong=activeQuestions.filter((q,index)=>selected[index]!==q.correctIndex);
    if(!wrong.length)return;
    setRetryQuestions(wrong);
    setSelected({});
    setShown({});
    setFinished(false);
    setSecondsLeft(0);
    saved.current=false;
    startedAt.current=Date.now();
  }

  return <div style={{marginTop:14,padding:14,border:'1px solid #dbe9e2',borderRadius:16,background:'#fbfefd'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginBottom:10,flexWrap:'wrap'}}>
      <div><b>{retryActive?`Mistake review — ${set.title}`:set.title}</b><small style={{display:'block',marginTop:3}}>{activeQuestions.length} questions • {difficultyLabel(set.difficulty)}{timedSession?` • ${set.durationMinutes} minute timed session`:retryActive?' • focused retry':' • self-paced'}</small></div>
      {timedSession&&<div style={{display:'flex',alignItems:'center',gap:7,padding:'8px 11px',borderRadius:12,background:finished?'#eef5f1':secondsLeft<=60?'#fff1f0':'#eef8f3',fontWeight:900,color:secondsLeft<=60&&!finished?'#b42318':'#08744d'}}><Clock3 size={17}/>{finished?'Finished':formatTime(secondsLeft)}</div>}
    </div>
    <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',padding:'10px 12px',borderRadius:12,background:'#f3f8f5',marginBottom:12,flexWrap:'wrap'}}>
      <span style={{fontSize:13,fontWeight:700}}>{finished?`Answered ${answered} of ${activeQuestions.length}`:`${timedSession?'Countdown active':retryActive?'Mistake review in progress':'Practice in progress'} • ${answered} answered`}</span>
      {!finished&&<button onClick={()=>{if(!timedSession||window.confirm('Submit this practice now?'))finish('submitted');}} style={{border:0,background:'#08744d',color:'#fff',padding:'8px 11px',borderRadius:10,fontWeight:800}}>{timedSession?'Submit practice':'Finish practice'}</button>}
      {finished&&set.mode==='mcq'&&<b>Score: {score}/{activeQuestions.length} ({Math.round((score/activeQuestions.length)*100)}%)</b>}
      {finished&&set.mode==='written'&&<b>Completed</b>}
    </div>
    {finished&&set.mode==='mcq'&&wrongCount>0&&<div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',padding:'12px',borderRadius:12,background:'#fff8e8',border:'1px solid #f0ddb4',marginBottom:12,flexWrap:'wrap'}}><div><b style={{display:'block'}}>Focus on your mistakes</b><small style={{color:'#74623b'}}>{wrongCount} question{wrongCount===1?'':'s'} to retry. The retry is self-paced and uses only the questions you missed.</small></div><button onClick={retryMistakes} style={{border:0,background:'#08744d',color:'#fff',padding:'9px 12px',borderRadius:10,fontWeight:800,display:'inline-flex',gap:7,alignItems:'center'}}><RotateCcw size={16}/> Retry {wrongCount} mistake{wrongCount===1?'':'s'}</button></div>}
    {finished&&retryActive&&set.mode==='mcq'&&wrongCount===0&&<div style={{padding:'12px',borderRadius:12,background:'#e9f8ef',border:'1px solid #cce9d7',marginBottom:12,fontWeight:800,color:'#08744d'}}><CheckCircle2 size={17} style={{verticalAlign:'middle',marginRight:7}}/>All reviewed mistakes corrected.</div>}
    <div style={{display:'grid',gap:12}}>{activeQuestions.map((q,index)=><article key={`${retryActive?'retry':'main'}-${q.id||index}`} style={{background:'#fff',border:'1px solid #e3eee8',borderRadius:14,padding:13}}><b>{index+1}. {q.question}</b>
      {set.mode==='mcq'?<div style={{display:'grid',gap:7,marginTop:10}}>{(q.options||[]).map((opt,i)=>{const chosen=selected[index]===i,reveal=finished||(!timedSession&&shown[index]);return <button key={i} disabled={finished} onClick={()=>choose(index,i)} style={{textAlign:'left',padding:'10px 11px',borderRadius:10,border:'1px solid #d9e7e0',background:reveal&&i===q.correctIndex?'#e9f8ef':reveal&&chosen&&i!==q.correctIndex?'#fff1f0':chosen?'#eef8f3':'#fff',fontWeight:chosen?800:600,cursor:finished?'default':'pointer'}}>{String.fromCharCode(65+i)}. {opt}</button>})}{(finished||(!timedSession&&shown[index]))&&<div style={{padding:10,borderRadius:10,background:'#f4faf7',lineHeight:1.5}}><b>{selected[index]===q.correctIndex?'Correct.':'Review this answer.'}</b> {q.explanation}</div>}</div>:<div style={{marginTop:10}}>{!finished&&<textarea value={writtenAnswers[index]||''} onChange={e=>setWrittenAnswers(value=>({...value,[index]:e.target.value}))} placeholder="Type your answer here…" rows={4} style={{width:'100%',boxSizing:'border-box',border:'1px solid #d6e4dd',borderRadius:10,padding:10,resize:'vertical'}}/>}{finished&&<><button onClick={()=>setShown(v=>({...v,[index]:!v[index]}))} style={{padding:'9px 11px',borderRadius:10,border:'1px solid #cfe1d8',background:'#eef8f3',fontWeight:800,color:'#08744d'}}>{shown[index]?'Hide answer guide':'Show answer guide'}</button>{shown[index]&&<div style={{marginTop:8,padding:10,borderRadius:10,background:'#f4faf7',lineHeight:1.55}}>{q.answerGuide}</div>}</>}</div>}
    </article>)}</div>
  </div>;
}

export default function AITutor(){
  const [sources,setSources]=useState([]),[course,setCourse]=useState('all'),[question,setQuestion]=useState(''),[messages,setMessages]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [topic,setTopic]=useState(''),[practiceType,setPracticeType]=useState('mcq'),[count,setCount]=useState(5),[timed,setTimed]=useState(false),[durationMinutes,setDurationMinutes]=useState(20),[difficulty,setDifficulty]=useState('standard'),[history,setHistory]=useState([]),[historyMsg,setHistoryMsg]=useState('');

  async function loadHistory(){try{const r=await fetch('/api/education/student/ai-tutor/history',{cache:'no-store'});const d=await r.json();if(r.ok&&d.ok)setHistory(d.history||[]);}catch{}}
  useEffect(()=>{fetch('/api/education/student/ai-tutor',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.ok)setSources(data.sources||[]);else setError(data.error||'AI Tutor sources unavailable.');}).catch(()=>setError('AI Tutor sources unavailable.'));loadHistory();},[]);

  const courses=useMemo(()=>[...new Map(sources.map(s=>[String(s.offering_id),{id:String(s.offering_id),label:`${s.code} — ${s.course_title}`}])).values()],[sources]);
  const visibleSources=useMemo(()=>course==='all'?sources:sources.filter(s=>String(s.offering_id)===course),[course,sources]);
  const masteryTopics=useMemo(()=>{
    const grouped=new Map();
    history.filter(item=>item.mode==='mcq'&&item.percent_score!==null&&item.percent_score!==undefined).forEach(item=>{
      const topicName=cleanMasteryTopic(item.topic);
      const key=topicName.toLowerCase().replace(/\s+/g,' ');
      if(!key)return;
      const current=grouped.get(key)||{topic:topicName,scores:[],lastAt:0};
      current.scores.push({percent:Number(item.percent_score)||0,at:new Date(item.completed_at).getTime()||0});
      current.lastAt=Math.max(current.lastAt,new Date(item.completed_at).getTime()||0);
      grouped.set(key,current);
    });
    return [...grouped.values()].map(item=>{
      const ordered=[...item.scores].sort((a,b)=>a.at-b.at);
      const mastery=masteryFor(ordered);
      const average=ordered.length?ordered.reduce((sum,entry)=>sum+entry.percent,0)/ordered.length:0;
      return {...item,attempts:ordered.length,average,...mastery};
    }).sort((a,b)=>b.rank-a.rank||b.average-a.average||b.lastAt-a.lastAt);
  },[history]);
  const weakTopics=useMemo(()=>[...masteryTopics].sort((a,b)=>a.rank-b.rank||a.average-b.average||b.lastAt-a.lastAt).slice(0,3),[masteryTopics]);

  async function post(payload,scopeOverride){const offeringId=scopeOverride===undefined?(course==='all'?null:Number(course)):scopeOverride;const response=await fetch('/api/education/student/ai-tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,offeringId})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'AI Tutor request failed.');return data;}
  async function savePractice(payload){try{const response=await fetch('/api/education/student/ai-tutor/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Unable to save practice history.');setHistoryMsg('Practice saved to your history. Mastery has been updated.');await loadHistory();}catch(e){setHistoryMsg(e.message||'Unable to save practice history.');}}
  async function ask(text){const clean=String(text||question).trim();if(!clean||loading)return;setQuestion('');setLoading(true);setError('');try{const data=await post({mode:'answer',question:clean});setMessages(prev=>[...prev,{kind:'answer',q:clean,a:data.answer,citations:data.citations||[],serviceReady:data.serviceReady!==false}]);}catch(e){setError(e.message||'AI Tutor request failed.');}finally{setLoading(false);}}
  async function generatePractice(type,focus,label,scopeOverride){const clean=String(focus||topic).trim();if(!clean||loading)return;setLoading(true);setError('');setHistoryMsg('');const offeringId=scopeOverride===undefined?(course==='all'?null:Number(course)):scopeOverride;try{const data=await post({mode:type,topic:clean,count,difficulty},scopeOverride);setMessages(prev=>[...prev,{kind:'practice',q:label||`${type==='mcq'?'MCQs':'Written questions'} on: ${clean}`,set:{mode:type,title:data.title||'Practice questions',questions:data.questions||[],timed,durationMinutes:timed?durationMinutes:null,topic:clean,offeringId,difficulty:data.difficulty||difficulty},a:data.answer||'',citations:data.citations||[],serviceReady:data.serviceReady!==false}]);}catch(e){setError(e.message||'Practice generation failed.');}finally{setLoading(false);}}
  function practiceWeakest(){const weakest=weakTopics[0];if(!weakest||loading)return;setPracticeType('mcq');setTopic(weakest.topic);generatePractice('mcq',weakest.topic,`Adaptive practice — ${weakest.topic}`,null);}

  const buttonStyle={border:'1px solid #cfe1d8',background:'#eef8f3',color:'#08744d',padding:'9px 11px',borderRadius:10,fontWeight:800,display:'inline-flex',gap:6,alignItems:'center'};

  return <main className={styles.page}>
    <header className={styles.header}><div><Link href="/education/student" className={styles.back}><ArrowLeft size={18}/> Student portal</Link><span className={styles.eyebrow}>APPROVED-MATERIAL AI</span><h1><Sparkles size={28}/> AI Tutor</h1><p>Learn, test yourself, correct mistakes, and build topic mastery over time.</p></div><div className={styles.guard}><ShieldCheck size={20}/><span>Grounded answers only</span></div></header>
    <section className={styles.grid}>
      <aside className={styles.sources}>
        <div className={styles.sectionTitle}><BookOpen size={19}/><div><b>Approved sources</b><small>{visibleSources.length} available</small></div></div>
        <label>Course scope<select value={course} onChange={e=>setCourse(e.target.value)}><option value="all">All approved courses</option>{courses.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <div className={styles.sourceList}>{visibleSources.map(item=><article key={item.id}><span className={styles.fileIcon}><FileText size={18}/></span><div><strong>{item.title}</strong><small>{item.code} · {item.material_type}</small></div><CheckCircle2 size={17}/></article>)}</div>
        <div style={{marginTop:16,padding:14,border:'1px solid #dce9e3',borderRadius:16,background:'#fff'}}><b style={{display:'block',marginBottom:8}}>Create practice on any approved topic</b><textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3} placeholder="e.g. septic shock, neonatal jaundice, asthma management" style={{width:'100%',boxSizing:'border-box',border:'1px solid #d6e4dd',borderRadius:10,padding:10,resize:'vertical'}}/><div style={{display:'flex',gap:7,marginTop:8,flexWrap:'wrap'}}><button onClick={()=>setPracticeType('mcq')} style={{...buttonStyle,background:practiceType==='mcq'?'#dff4e9':'#eef8f3'}}><ListChecks size={15}/> MCQ</button><button onClick={()=>setPracticeType('written')} style={{...buttonStyle,background:practiceType==='written'?'#dff4e9':'#eef8f3'}}><FileQuestion size={15}/> Written</button><select value={count} onChange={e=>setCount(Number(e.target.value))} style={{border:'1px solid #cfe1d8',borderRadius:10,padding:'9px 10px'}}><option value={5}>5 questions</option><option value={10}>10 questions</option><option value={20}>20 questions</option><option value={30}>30 questions</option><option value={50}>50 questions</option></select><select value={difficulty} onChange={e=>setDifficulty(e.target.value)} style={{border:'1px solid #cfe1d8',borderRadius:10,padding:'9px 10px'}}><option value="foundation">Foundation</option><option value="standard">Standard</option><option value="challenge">Challenge</option></select></div><div style={{display:'flex',gap:7,marginTop:8,flexWrap:'wrap',alignItems:'center'}}><button onClick={()=>setTimed(v=>!v)} style={{...buttonStyle,background:timed?'#dff4e9':'#eef8f3'}}><Clock3 size={15}/>{timed?'Timed mode on':'Use countdown timer'}</button>{timed&&<select value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))} style={{border:'1px solid #cfe1d8',borderRadius:10,padding:'9px 10px'}}>{[5,10,15,20,30,45,60,90,120].map(n=><option key={n} value={n}>{n} minutes</option>)}</select>}<button disabled={!topic.trim()||loading||!sources.length} onClick={()=>generatePractice(practiceType,topic)} style={{...buttonStyle,background:'#08744d',color:'#fff'}}>Generate now</button></div></div>
        <div style={{marginTop:16,padding:14,border:'1px solid #cfe1d8',borderRadius:16,background:'#f8fcfa'}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><Target size={18}/><b>Adaptive practice</b></div>{weakTopics.length?<><small style={{display:'block',color:'#60786e',lineHeight:1.45,marginBottom:9}}>Your lowest mastery topics are prioritised first, then lower average scores.</small><div style={{display:'grid',gap:7,marginBottom:10}}>{weakTopics.map((item,index)=><div key={item.topic} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'8px 9px',borderRadius:10,background:'#fff'}}><div><b style={{fontSize:13}}>{index===0?'Focus first: ':''}{item.topic}</b><small style={{display:'block',marginTop:2,color:'#789087'}}>{item.attempts} attempt{item.attempts===1?'':'s'} • {item.level}</small></div><b style={{fontSize:13,color:item.average<70?'#b42318':'#08744d'}}>{Math.round(item.average)}%</b></div>)}</div><button disabled={loading||!sources.length} onClick={practiceWeakest} style={{...buttonStyle,width:'100%',justifyContent:'center',background:'#08744d',color:'#fff'}}><Target size={15}/> Practice my weak areas</button></>:<small style={{color:'#70857c',lineHeight:1.45}}>Complete at least one MCQ practice set and your weakest topics will appear here automatically.</small>}</div>
        <div style={{marginTop:16,padding:14,border:'1px solid #dce9e3',borderRadius:16,background:'#fff'}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}><Award size={18}/><b>Topic mastery</b></div><small style={{display:'block',color:'#60786e',lineHeight:1.45,marginBottom:10}}>Mastery uses repeated MCQ performance. A topic needs at least 3 strong sessions and strong recent scores to become Mastered.</small>{masteryTopics.length?<div style={{display:'grid',gap:8}}>{masteryTopics.slice(0,6).map(item=><div key={item.topic} style={{padding:'10px',borderRadius:12,background:'#f8fbf9'}}><div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><b style={{fontSize:13}}>{item.topic}</b><span style={{...masteryStyle(item.level),padding:'4px 7px',borderRadius:999,fontSize:11,fontWeight:900,whiteSpace:'nowrap'}}>{item.level}</span></div><div style={{height:6,borderRadius:999,background:'#e5eee9',overflow:'hidden',marginTop:8}}><div style={{height:'100%',width:`${Math.max(4,Math.min(100,item.average))}%`,background:'#138455',borderRadius:999}}/></div><small style={{display:'block',marginTop:5,color:'#71877e'}}>{Math.round(item.average)}% average • {item.attempts} scored session{item.attempts===1?'':'s'}</small></div>)}</div>:<small style={{color:'#70857c'}}>Your mastery levels will appear after MCQ practice is completed.</small>}</div>
        <div style={{marginTop:16,padding:14,border:'1px solid #dce9e3',borderRadius:16,background:'#fff'}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><History size={18}/><b>Recent practice</b></div>{history.length?<div style={{display:'grid',gap:8}}>{history.slice(0,6).map(item=><div key={item.id} style={{padding:'9px 10px',borderRadius:11,background:'#f5faf7'}}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><b style={{fontSize:13}}>{item.mode==='mcq'?'MCQ':'Written'} • {item.question_count} Q • {difficultyLabel(item.difficulty)}</b>{item.percent_score!==null&&item.percent_score!==undefined?<b style={{fontSize:13,color:'#08744d'}}>{Math.round(Number(item.percent_score))}%</b>:<small>Completed</small>}</div><small style={{display:'block',marginTop:3,color:'#60786e'}}>{item.topic}</small><small style={{display:'block',marginTop:3,color:'#789087'}}>{item.timed?`${item.duration_minutes} min timed • `:''}{new Date(item.completed_at).toLocaleDateString()}</small></div>)}</div>:<small style={{color:'#70857c'}}>Completed AI practice sessions will appear here.</small>}{historyMsg&&<small style={{display:'block',marginTop:9,color:'#08744d',fontWeight:800}}>{historyMsg}</small>}</div>
        <div className={styles.rule}><ShieldCheck size={18}/><p><b>No unsupported questions.</b> Practice is generated only from published, lecturer-approved material in your active courses.</p></div>
      </aside>
      <section className={styles.chat}><div className={styles.chatHead}><Bot size={22}/><div><b>Dropare AI Tutor</b><small>Student learning assistant</small></div></div>
        <div className={styles.chatBody}>{error&&<div className={styles.rule}><p>{error}</p></div>}{messages.length===0?<div className={styles.empty}><span><Bot size={30}/></span><h2>Learn, test, master</h2><p>{sources.length?'Ask a lesson question, generate up to 50 questions, retry mistakes, and build mastery through repeated MCQ performance.':'No AI-approved course material is available for your enrolments yet.'}</p><div className={styles.prompts}>{prompts.map(item=><button key={item} disabled={!sources.length||loading} onClick={()=>ask(item)}><Search size={15}/>{item}</button>)}</div></div>:messages.map((item,index)=><div className={styles.exchange} key={`${item.q}-${index}`}><div className={styles.userBubble}><b>You</b><p>{item.q}</p></div><div className={styles.aiBubble}><b><Bot size={16}/> AI Tutor</b>{item.a&&<p>{item.a}</p>}{item.kind==='answer'&&item.serviceReady&&<div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:10}}><button style={buttonStyle} disabled={loading} onClick={()=>generatePractice('mcq',item.q,'Quiz me on what I just learned — MCQs')}><ListChecks size={15}/> Quiz me with MCQs</button><button style={buttonStyle} disabled={loading} onClick={()=>generatePractice('written',item.q,'Quiz me on what I just learned — Written')}><FileQuestion size={15}/> Written questions</button></div>}{item.kind==='practice'&&item.set?.questions?.length>0&&<PracticeSet set={item.set} onComplete={savePractice}/>} {item.citations.length>0&&<small><ShieldCheck size={14}/> Sources: {item.citations.map(c=>`${c.courseCode} — ${c.title}`).join(' · ')}</small>}</div></div>)}</div>
        <div className={styles.composer}><textarea value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask();}}} placeholder="Ask a question from approved course materials…" rows={2}/><button disabled={loading||!sources.length} onClick={()=>ask()} aria-label="Ask AI Tutor"><Send size={19}/></button></div>
      </section>
    </section>
  </main>;
}
