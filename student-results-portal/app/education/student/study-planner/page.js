'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, Clock3, Plus, Trash2 } from 'lucide-react';

function fmt(value){
  if(!value)return 'No due date';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return 'No due date';
  return d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
}

export default function StudyPlannerPage(){
  const [tasks,setTasks]=useState([]),[courses,setCourses]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const [title,setTitle]=useState(''),[details,setDetails]=useState(''),[dueAt,setDueAt]=useState(''),[priority,setPriority]=useState('medium'),[offeringId,setOfferingId]=useState('');

  async function load(){
    setLoading(true);setError('');
    try{const r=await fetch('/api/education/student/study-planner',{cache:'no-store'});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Unable to load study planner.');setTasks(d.tasks||[]);setCourses(d.courses||[]);}catch(e){setError(e.message||'Unable to load study planner.');}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);

  async function act(payload){
    setSaving(true);setError('');
    try{const r=await fetch('/api/education/student/study-planner',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Unable to update study planner.');await load();return true;}catch(e){setError(e.message||'Unable to update study planner.');return false;}finally{setSaving(false);}
  }
  async function addTask(e){
    e.preventDefault();
    const ok=await act({action:'create',title,details,dueAt:dueAt?new Date(dueAt).toISOString():null,priority,offeringId:offeringId?Number(offeringId):null});
    if(ok){setTitle('');setDetails('');setDueAt('');setPriority('medium');setOfferingId('');}
  }

  const pending=useMemo(()=>tasks.filter(t=>t.status==='pending'),[tasks]);
  const completed=useMemo(()=>tasks.filter(t=>t.status==='completed'),[tasks]);
  const overdue=useMemo(()=>pending.filter(t=>t.due_at&&new Date(t.due_at)<new Date()).length,[pending]);
  const card={background:'#fff',border:'1px solid #dce9e2',borderRadius:18,padding:18,boxShadow:'0 10px 28px rgba(19,61,43,.06)'};
  const input={width:'100%',boxSizing:'border-box',border:'1px solid #cfe1d8',borderRadius:11,padding:'11px 12px',background:'#fff'};

  return <main style={{minHeight:'100vh',background:'#f3f8f5',padding:24,color:'#17352b'}}><div style={{maxWidth:1100,margin:'0 auto'}}>
    <Link href="/education/student" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#0b6d45',fontWeight:800,textDecoration:'none',marginBottom:18}}><ArrowLeft size={18}/> Student portal</Link>
    <section style={{...card,background:'linear-gradient(135deg,#0f5b3d,#0b7b4b)',color:'#fff',padding:24,marginBottom:18}}><div style={{display:'flex',gap:11,alignItems:'center'}}><CalendarDays size={28}/><div><h1 style={{margin:0,fontSize:30}}>Personal Study Planner</h1><p style={{margin:'6px 0 0',color:'#e5f8ee'}}>Plan revision, assignments and course study sessions in one private workspace.</p></div></div></section>

    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:18}}>
      <div style={card}><small>Pending tasks</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{pending.length}</div></div>
      <div style={card}><small>Completed</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{completed.length}</div></div>
      <div style={card}><small>Overdue</small><div style={{fontSize:30,fontWeight:900,marginTop:4}}>{overdue}</div></div>
    </section>

    <section style={{display:'grid',gridTemplateColumns:'minmax(280px,360px) 1fr',gap:18,alignItems:'start'}}>
      <form onSubmit={addTask} style={{...card,position:'sticky',top:20}}><h2 style={{marginTop:0}}>Add study task</h2>
        <label style={{display:'grid',gap:6,marginBottom:12}}><span style={{fontWeight:800,fontSize:13}}>Task</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Revise septic shock" style={input}/></label>
        <label style={{display:'grid',gap:6,marginBottom:12}}><span style={{fontWeight:800,fontSize:13}}>Course</span><select value={offeringId} onChange={e=>setOfferingId(e.target.value)} style={input}><option value="">General study</option>{courses.map(c=><option key={c.offering_id} value={c.offering_id}>{c.code} — {c.title}</option>)}</select></label>
        <label style={{display:'grid',gap:6,marginBottom:12}}><span style={{fontWeight:800,fontSize:13}}>Due date and time</span><input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)} style={input}/></label>
        <label style={{display:'grid',gap:6,marginBottom:12}}><span style={{fontWeight:800,fontSize:13}}>Priority</span><select value={priority} onChange={e=>setPriority(e.target.value)} style={input}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label style={{display:'grid',gap:6,marginBottom:14}}><span style={{fontWeight:800,fontSize:13}}>Notes</span><textarea value={details} onChange={e=>setDetails(e.target.value)} rows={4} placeholder="Optional details or study goals" style={{...input,resize:'vertical'}}/></label>
        <button disabled={saving||!title.trim()} style={{width:'100%',border:0,borderRadius:11,padding:'11px 13px',background:'#08744d',color:'#fff',fontWeight:900,display:'inline-flex',gap:8,justifyContent:'center',alignItems:'center'}}><Plus size={17}/>{saving?'Saving…':'Add task'}</button>
        {error&&<p style={{color:'#b42318',fontWeight:700,fontSize:13}}>{error}</p>}
      </form>

      <div style={{display:'grid',gap:16}}>
        <section style={card}><h2 style={{marginTop:0}}>Upcoming study</h2>{loading?<p>Loading planner…</p>:pending.length===0?<p style={{color:'#60786e'}}>No pending study tasks. Add your next revision goal.</p>:<div style={{display:'grid',gap:10}}>{pending.map(task=>{const isOverdue=task.due_at&&new Date(task.due_at)<new Date();return <article key={task.id} style={{border:'1px solid #e3eee8',borderRadius:14,padding:13,background:isOverdue?'#fff8f0':'#fbfefd'}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><button disabled={saving} onClick={()=>act({action:'toggle',id:task.id})} title="Mark complete" style={{border:0,background:'transparent',padding:2,color:'#08744d'}}><Circle size={22}/></button><div style={{flex:1}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><b>{task.title}</b><span style={{fontSize:12,fontWeight:900,textTransform:'uppercase',color:task.priority==='high'?'#b42318':task.priority==='low'?'#60786e':'#8a6500'}}>{task.priority}</span></div><small style={{display:'block',marginTop:4,color:isOverdue?'#b42318':'#60786e'}}><Clock3 size={13} style={{verticalAlign:'middle',marginRight:4}}/>{fmt(task.due_at)}{task.course_code?` • ${task.course_code}`:''}</small>{task.details&&<p style={{margin:'8px 0 0',lineHeight:1.5,color:'#49685c'}}>{task.details}</p>}</div><button disabled={saving} onClick={()=>act({action:'delete',id:task.id})} title="Delete" style={{border:0,background:'transparent',color:'#8b3a32'}}><Trash2 size={18}/></button></div></article>})}</div>}</section>

        <section style={card}><h2 style={{marginTop:0}}>Completed</h2>{completed.length===0?<p style={{color:'#60786e'}}>Completed study tasks will appear here.</p>:<div style={{display:'grid',gap:9}}>{completed.slice(0,30).map(task=><article key={task.id} style={{display:'flex',gap:10,alignItems:'center',borderTop:'1px solid #edf3ef',paddingTop:9}}><button disabled={saving} onClick={()=>act({action:'toggle',id:task.id})} style={{border:0,background:'transparent',color:'#08744d'}}><CheckCircle2 size={21}/></button><div style={{flex:1}}><b style={{textDecoration:'line-through',color:'#60786e'}}>{task.title}</b><small style={{display:'block',color:'#789087'}}>{task.course_code||'General study'} • completed</small></div><button disabled={saving} onClick={()=>act({action:'delete',id:task.id})} style={{border:0,background:'transparent',color:'#8b3a32'}}><Trash2 size={17}/></button></article>)}</div>}</section>
      </div>
    </section>
  </div></main>;
}
