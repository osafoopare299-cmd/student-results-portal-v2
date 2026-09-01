'use client';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft,Clock3,Save,Send } from 'lucide-react';

const card={background:'#fff',border:'1px solid #dfe9e4',borderRadius:18,padding:18};
export default function StudentAssessmentAttempt(){
 const {id}=useParams();const [data,setData]=useState(null),[answers,setAnswers]=useState({}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
 async function load(){const r=await fetch(`/api/education/student/assessments/${id}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);const initial={};for(const a of d.answers||[])initial[a.question_id]=a.answer?.value??'';setAnswers(initial)}
 useEffect(()=>{load().catch(e=>setMessage(e.message))},[id]);useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 const remaining=useMemo(()=>{if(!data?.attempt||!data?.assessment?.duration_minutes)return null;return Math.max(0,Math.floor((new Date(data.attempt.started_at).getTime()+Number(data.assessment.duration_minutes)*60000-now)/1000))},[data,now]);
 const timeText=remaining===null?'Untimed':`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 async function api(body){setBusy(true);setMessage('');try{const r=await fetch(`/api/education/student/assessments/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);return d}catch(e){setMessage(e.message)}finally{setBusy(false)}return null}
 async function save(qid,value){setAnswers(x=>({...x,[qid]:value}));const d=await api({action:'save',questionId:qid,value});if(d&&!data.attempt)await load();}
 async function start(){const d=await api({action:'start'});if(d)await load();}
 async function submit(){if(!confirm('Submit this assessment now? You will not be able to change your answers afterwards.'))return;const d=await api({action:'submit'});if(d){setMessage(d.status==='marked'?`Submitted. MCQ score: ${d.score}`:'Submitted successfully. Awaiting lecturer marking.');await load();}}
 if(!data)return <main style={{padding:30,fontFamily:'Arial'}}>Loading assessment… {message}</main>;
 const a=data.assessment,attempt=data.attempt,locked=attempt&&attempt.status!=='started';
 return <main style={{minHeight:'100vh',background:'#f5faf8',padding:22,fontFamily:'Arial',color:'#173126'}}><section style={{maxWidth:900,margin:'auto'}}><Link href="/education/student/assessments" style={{color:'#08744d',fontWeight:800,textDecoration:'none',display:'inline-flex',gap:7}}><ArrowLeft size={18}/> Assessments</Link><section style={{...card,margin:'20px 0'}}><small style={{fontWeight:900,color:'#08744d'}}>DROPARE EDUCATION</small><h1 style={{fontSize:'clamp(30px,5vw,46px)',margin:'8px 0'}}>{a.title}</h1><p>{a.code} · {a.course_title} · {Number(a.max_score)} marks</p>{a.instructions&&<p style={{color:'#5f756d'}}>{a.instructions}</p>}<div style={{display:'flex',gap:8,alignItems:'center',fontWeight:900}}><Clock3 size={18}/>{timeText}</div></section>
 {!attempt&&!locked&&<button onClick={start} disabled={busy} style={{width:'100%',padding:15,border:0,borderRadius:14,background:'#075f40',color:'#fff',fontWeight:900}}>Start assessment</button>}
 {message&&<p style={{padding:12,background:'#fff4df',borderRadius:12}}>{message}</p>}
 {attempt&&<section style={{display:'grid',gap:14}}>{data.questions.map(q=><article key={q.id} style={card}><small style={{fontWeight:900,color:'#08744d'}}>Question {q.position} · {Number(q.max_score)} marks</small><h3>{q.prompt}</h3>{q.question_type==='mcq'?<div style={{display:'grid',gap:8}}>{(q.options||[]).map(opt=><label key={opt} style={{display:'flex',gap:9,padding:10,border:'1px solid #dce7e1',borderRadius:10}}><input type="radio" name={`q${q.id}`} checked={answers[q.id]===opt} disabled={locked} onChange={()=>save(q.id,opt)}/>{opt}</label>)}</div>:<textarea rows={q.question_type==='long'?8:4} value={answers[q.id]||''} disabled={locked} onChange={e=>setAnswers(x=>({...x,[q.id]:e.target.value}))} onBlur={e=>!locked&&save(q.id,e.target.value)} style={{width:'100%',padding:12}}/>}</article>)}</section>}
 {attempt&&!locked&&<button onClick={submit} disabled={busy} style={{marginTop:18,width:'100%',padding:15,border:0,borderRadius:14,background:'#075f40',color:'#fff',fontWeight:900,display:'flex',justifyContent:'center',gap:8}}><Send size={18}/> Submit assessment</button>}
 {attempt&&locked&&<section style={{...card,marginTop:18}}><b>Assessment submitted</b><p style={{marginBottom:0,color:'#60766e'}}>Status: {attempt.status}{attempt.status==='marked'&&attempt.score!=null?` · Score ${Number(attempt.score)}`:''}</p></section>}
 </section></main>
}
