'use client';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft,CheckCircle2,ClipboardCheck,Save } from 'lucide-react';

const box={background:'#fff',border:'1px solid #dfe9e4',borderRadius:18,padding:18};
const val=a=>a?.answer?.value??'';
export default function LecturerAssessmentMarking(){
 const {id}=useParams();const [data,setData]=useState(null),[selected,setSelected]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 async function load(attemptId=selected){const u=attemptId?`?attemptId=${encodeURIComponent(attemptId)}`:'';const r=await fetch(`/api/education/lecturer/assessments/${id}/marking${u}`,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);if(d.attempt?.feedback)setFeedback(d.attempt.feedback);}
 useEffect(()=>{load('').catch(e=>setMessage(e.message))},[id]);
 async function choose(v){setSelected(v);setMessage('');setFeedback('');try{await load(v)}catch(e){setMessage(e.message)}}
 async function saveAnswer(q,score,fb){setBusy(true);setMessage('');try{const r=await fetch(`/api/education/lecturer/assessments/${id}/marking`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save-answer',attemptId:selected,questionId:q.question_id,score,feedback:fb})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(`Q${q.position} mark saved.`);await load(selected)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function finalize(){setBusy(true);setMessage('');try{const r=await fetch(`/api/education/lecturer/assessments/${id}/marking`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'finalize',attemptId:selected,feedback})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(`Finalized: ${Number(d.score).toFixed(1)} marks.`);await load(selected)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 const a=data?.assessment;const attempts=data?.attempts||[];const manual=useMemo(()=>data?.answers?.filter(q=>q.question_type!=='mcq')||[],[data]);
 if(!data)return <main style={{padding:30,fontFamily:'Arial'}}>Loading marking workspace… {message}</main>;
 return <main style={{minHeight:'100vh',background:'#f5faf8',padding:22,fontFamily:'Arial',color:'#173126'}}><section style={{maxWidth:1050,margin:'auto'}}><Link href={`/education/lecturer/assessments/${id}`} style={{color:'#08744d',fontWeight:800,textDecoration:'none',display:'inline-flex',gap:7}}><ArrowLeft size={18}/> Assessment builder</Link><h1 style={{fontSize:'clamp(30px,5vw,46px)',margin:'20px 0 4px'}}>Mark submissions</h1><p style={{color:'#667d74'}}>{a.title} · {a.code} · {Number(a.max_score)} marks</p>
 <section style={{...box,margin:'22px 0'}}><label style={{fontWeight:800}}>Student submission<select value={selected} onChange={e=>choose(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:8}}><option value="">Select a submitted attempt</option>{attempts.map(t=><option key={t.id} value={t.id}>{t.full_name} — {t.status}{t.status==='marked'?` — ${Number(t.score||0).toFixed(1)}`:''}</option>)}</select></label>{attempts.length===0&&<p style={{color:'#667d74'}}>No submitted attempts are waiting for marking yet.</p>}</section>
 {message&&<p style={{padding:12,background:'#fff4df',borderRadius:12}}>{message}</p>}
 {selected&&data.attempt&&<><section style={{...box,marginBottom:16}}><div style={{display:'flex',alignItems:'center',gap:9}}><ClipboardCheck size={20}/><div><b>{data.attempt.full_name}</b><div style={{color:'#667d74',fontSize:14}}>{data.attempt.email}</div></div></div><p>Status: <b>{data.attempt.status}</b>{data.attempt.score!=null?` · Current total ${Number(data.attempt.score).toFixed(1)}/${Number(a.max_score).toFixed(1)}`:''}</p></section>
 <section style={{display:'grid',gap:12}}>{(data.answers||[]).map(q=><AnswerCard key={q.question_id} q={q} busy={busy} onSave={saveAnswer}/>)}</section>
 <section style={{...box,marginTop:16}}><label style={{fontWeight:800}}>Overall feedback<textarea rows="4" value={feedback} onChange={e=>setFeedback(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:8}}/></label><button disabled={busy||data.attempt.status==='marked'} onClick={finalize} style={{marginTop:12,width:'100%',background:data.attempt.status==='marked'?'#8ab9a4':'#075f40',color:'#fff',border:0,borderRadius:14,padding:15,fontWeight:900,display:'flex',justifyContent:'center',gap:8}}><CheckCircle2 size={18}/>{data.attempt.status==='marked'?'Finalized':'Finalize result'}</button></section></>}
 </section></main>
}

function AnswerCard({q,busy,onSave}){
 const [score,setScore]=useState(q.score??''),[fb,setFb]=useState(q.feedback??'');
 useEffect(()=>{setScore(q.score??'');setFb(q.feedback??'')},[q.score,q.feedback]);
 const auto=q.question_type==='mcq';
 return <article style={box}><small style={{color:'#08744d',fontWeight:900}}>Q{q.position} · {String(q.question_type).toUpperCase()} · /{Number(q.max_score)}</small><h3>{q.prompt}</h3><div style={{padding:12,background:'#f4f8f6',borderRadius:12,whiteSpace:'pre-wrap'}}>{String(val(q)||'No answer submitted')}</div>{auto?<p><b>Auto-marked:</b> {q.score==null?'Pending':`${Number(q.score).toFixed(1)}/${Number(q.max_score).toFixed(1)}`}</p>:q.answer_id?<div style={{display:'grid',gap:9,marginTop:12}}><label>Score<input type="number" min="0" max={Number(q.max_score)} step="0.25" value={score} onChange={e=>setScore(e.target.value)} style={{display:'block',width:'100%',padding:11}}/></label><label>Question feedback<textarea rows="2" value={fb} onChange={e=>setFb(e.target.value)} style={{display:'block',width:'100%',padding:11}}/></label><button disabled={busy||score===''} onClick={()=>onSave(q,score,fb)} style={{background:'#08744d',color:'#fff',border:0,borderRadius:11,padding:11,fontWeight:800,display:'inline-flex',justifyContent:'center',gap:7}}><Save size={17}/> Save mark</button></div>:<p style={{color:'#667d74'}}>No answer was submitted for this optional question.</p>}</article>
}
