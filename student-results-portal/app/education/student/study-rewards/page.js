'use client';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft,Award,Bell,CalendarClock,CheckCircle2,Flame,Medal,Plus,RefreshCw,Trash2,Trophy } from 'lucide-react';

export default function StudyRewardsPage(){
  const [data,setData]=useState(null);const [msg,setMsg]=useState('Loading your study progress…');const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({title:'',offeringId:'',remindAt:'',repeatRule:'once'});
  async function load(){try{const r=await fetch('/api/education/student/study-engagement',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);setMsg('');}catch(e){setMsg(e.message||'Unable to load study progress.');}}
  useEffect(()=>{load();},[]);
  async function act(payload){setBusy(true);try{const r=await fetch('/api/education/student/study-engagement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error);await load();return true;}catch(e){setMsg(e.message||'Update failed.');return false;}finally{setBusy(false);}}
  async function create(e){e.preventDefault();if(await act({action:'create',...form})){setForm({title:'',offeringId:'',remindAt:'',repeatRule:'once'});setMsg('Revision reminder saved.');}}
  const earned=useMemo(()=>data?.badges?.filter(b=>b.earned)||[],[data]);
  const locked=useMemo(()=>data?.badges?.filter(b=>!b.earned)||[],[data]);
  const card={background:'#fff',border:'1px solid #dce9e3',borderRadius:18,padding:18};const input={width:'100%',padding:'11px 12px',border:'1px solid #d6e4dd',borderRadius:12,boxSizing:'border-box'};
  return <main style={{minHeight:'100vh',background:'#f4faf7',padding:24,fontFamily:'Arial,sans-serif',color:'#17342a'}}><div style={{maxWidth:1100,margin:'auto'}}>
    <Link href="/education/student" style={{display:'inline-flex',gap:7,alignItems:'center',color:'#08744d',fontWeight:800,textDecoration:'none'}}><ArrowLeft size={18}/> Student dashboard</Link>
    <section style={{marginTop:18,background:'linear-gradient(120deg,#08744d,#11a36d)',color:'#fff',borderRadius:24,padding:'28px 30px'}}><small style={{fontWeight:800,letterSpacing:'.14em'}}>STUDY MOMENTUM</small><h1 style={{fontSize:36,margin:'8px 0'}}>Streaks, Rewards & Revision</h1><p style={{margin:0,color:'#d8f5e9'}}>Rewards are earned from real study activity: completed AI practice, flashcard reviews and completed planner tasks.</p></section>
    {data&&<><section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,margin:'16px 0'}}>
      <article style={card}><Flame size={22}/><small style={{display:'block',marginTop:7}}>Current streak</small><strong style={{fontSize:28}}>{data.streak.current} days</strong></article>
      <article style={card}><Trophy size={22}/><small style={{display:'block',marginTop:7}}>Longest streak</small><strong style={{fontSize:28}}>{data.streak.longest} days</strong></article>
      <article style={card}><Award size={22}/><small style={{display:'block',marginTop:7}}>Study points</small><strong style={{fontSize:28}}>{data.points}</strong></article>
      <article style={card}><Medal size={22}/><small style={{display:'block',marginTop:7}}>Level</small><strong style={{fontSize:20}}>{data.level}</strong></article>
    </section>
    <section style={{display:'grid',gridTemplateColumns:'1.1fr .9fr',gap:14,alignItems:'start'}}>
      <div style={{display:'grid',gap:14}}>
        <article style={card}><h2 style={{marginTop:0}}>Earned badges</h2>{earned.length?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>{earned.map(b=><div key={b.id} style={{padding:14,borderRadius:14,background:'#eaf8f1'}}><CheckCircle2 size={18}/><b style={{display:'block',margin:'6px 0'}}>{b.label}</b><small>{b.copy}</small></div>)}</div>:<p style={{color:'#6b8077'}}>Complete your first tracked study activity to unlock your first badge.</p>}</article>
        <article style={card}><h2 style={{marginTop:0}}>Next badges</h2><div style={{display:'grid',gap:8}}>{locked.map(b=><div key={b.id} style={{padding:12,border:'1px dashed #cbded4',borderRadius:12}}><b>{b.label}</b><small style={{display:'block',color:'#70857c',marginTop:4}}>{b.copy}</small></div>)}</div></article>
      </div>
      <div style={{display:'grid',gap:14}}>
        <article style={card}><div style={{display:'flex',alignItems:'center',gap:8}}><CalendarClock size={20}/><h2 style={{margin:0}}>Revision reminder</h2></div><form onSubmit={create} style={{display:'grid',gap:10,marginTop:14}}><input style={input} placeholder="e.g. Revise paediatric shock" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><select style={input} value={form.offeringId} onChange={e=>setForm({...form,offeringId:e.target.value})}><option value="">General study</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}</select><input style={input} type="datetime-local" value={form.remindAt} onChange={e=>setForm({...form,remindAt:e.target.value})}/><select style={input} value={form.repeatRule} onChange={e=>setForm({...form,repeatRule:e.target.value})}><option value="once">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select><button disabled={busy} style={{border:0,background:'#08744d',color:'#fff',borderRadius:12,padding:'11px 13px',fontWeight:800,display:'inline-flex',gap:7,alignItems:'center',justifyContent:'center'}}><Plus size={16}/> Save reminder</button></form></article>
        <article style={card}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 style={{margin:0}}>My reminders</h2><button onClick={load} style={{border:0,background:'transparent'}}><RefreshCw size={17}/></button></div><div style={{display:'grid',gap:9,marginTop:12}}>{data.reminders.length?data.reminders.map(r=><div key={r.id} style={{padding:12,border:'1px solid #dce9e3',borderRadius:12,opacity:r.is_active?1:.55}}><b>{r.title}</b><small style={{display:'block',color:'#70857c',marginTop:4}}>{r.course_code?`${r.course_code} • `:''}{new Date(r.remind_at).toLocaleString()} • {r.repeat_rule}</small><div style={{display:'flex',gap:8,marginTop:8}}><button disabled={busy} onClick={()=>act({action:'toggle',id:r.id})} style={{border:0,borderRadius:9,padding:'7px 9px',fontWeight:800}}>{r.is_active?'Pause':'Resume'}</button><button disabled={busy} onClick={()=>act({action:'delete',id:r.id})} style={{border:0,borderRadius:9,padding:'7px 9px'}}><Trash2 size={15}/></button></div></div>):<small style={{color:'#70857c'}}>No reminders yet.</small>}</div></article>
      </div>
    </section></>}
    {msg&&<p style={{marginTop:16,padding:13,background:'#e8f7f0',borderRadius:12}}><Bell size={15} style={{verticalAlign:'middle',marginRight:6}}/>{msg}</p>}
  </div></main>;
}
