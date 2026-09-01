'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { Activity,ArrowLeft,BarChart3,BookOpen,CheckCircle2,ClipboardCheck,GraduationCap,RefreshCw,Users } from 'lucide-react';

const box={background:'#fff',border:'1px solid #dce9e3',borderRadius:18,padding:18};
const pct=v=>`${Number(v||0).toFixed(1)}%`;
export default function EducationAdminAnalytics(){
 const [data,setData]=useState(null),[msg,setMsg]=useState('Loading platform analytics…'),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);try{const r=await fetch('/api/education/admin/analytics',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);setMsg('');}catch(e){setMsg(e.message||'Unable to load analytics.');}finally{setBusy(false)}}
 useEffect(()=>{load()},[]);
 const s=data?.summary||{};
 return <main style={{minHeight:'100vh',background:'#f4faf7',padding:24,fontFamily:'Arial,sans-serif',color:'#17342a'}}><div style={{maxWidth:1180,margin:'auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><Link href="/education/admin" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#08744d',fontWeight:800,textDecoration:'none'}}><ArrowLeft size={18}/> Administrator</Link><button onClick={load} disabled={busy} style={{border:'1px solid #cfe0d8',background:'#fff',borderRadius:12,padding:'10px 13px',fontWeight:800,color:'#08744d'}}><RefreshCw size={16} style={{verticalAlign:'middle',marginRight:6}}/>{busy?'Refreshing…':'Refresh'}</button></div>
  <section style={{marginTop:18,background:'linear-gradient(120deg,#08744d,#11a36d)',color:'#fff',borderRadius:24,padding:'28px 30px'}}><small style={{fontWeight:800,letterSpacing:'.14em'}}>PLATFORM ANALYTICS</small><h1 style={{fontSize:38,margin:'8px 0'}}>Education overview</h1><p style={{margin:0,color:'#d8f5e9'}}>Live operational totals from the isolated Education database.</p></section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,margin:'18px 0'}}>{[[Users,'Active students',s.students],[GraduationCap,'Lecturers',s.lecturers],[BookOpen,'Active enrolments',s.activeEnrolments],[ClipboardCheck,'Assessments',s.assessments],[CheckCircle2,'Released results',s.releasedResults],[Activity,'Attendance',pct(s.attendanceRate)]].map(([Icon,label,value])=><article key={label} style={box}><Icon size={20} color="#08744d"/><small style={{display:'block',marginTop:12,color:'#6b8077'}}>{label}</small><strong style={{fontSize:28}}>{value??0}</strong></article>)}</section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
   <article style={box}><h2 style={{marginTop:0}}>Learning & assessments</h2><p>Published materials <b>{s.publishedMaterials||0}</b> / {s.materials||0}</p><p>AI-approved sources <b>{s.aiApprovedMaterials||0}</b></p><p>Offline-ready resources <b>{s.offlineMaterials||0}</b></p><p>Published assessments <b>{s.publishedAssessments||0}</b></p><p>Draft assessments <b>{s.draftAssessments||0}</b></p><p>Waiting for marking <b>{s.submittedAttempts||0}</b></p></article>
   <article style={box}><h2 style={{marginTop:0}}>Results & attendance</h2><p>Marked attempts <b>{s.markedAttempts||0}</b></p><p>Released results <b>{s.releasedResults||0}</b></p><p>Released in last 30 days <b>{s.releasedLast30Days||0}</b></p><p>Published attendance sessions <b>{s.attendanceSessions||0}</b></p><p>Attendance records <b>{s.attendanceRecords||0}</b></p><p>Overall attendance <b>{pct(s.attendanceRate)}</b></p></article>
  </section>
  <section style={{...box,marginTop:16}}><h2 style={{display:'flex',alignItems:'center',gap:8,marginTop:0}}><BarChart3 size={20}/> Released result performance by course</h2>{data?.coursePerformance?.length?<div style={{display:'grid',gap:10}}>{data.coursePerformance.map(c=><div key={c.code} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:12,padding:'11px 0',borderBottom:'1px solid #edf2ef'}}><span><b>{c.code}</b><small style={{display:'block',color:'#6b8077'}}>{c.title}</small></span><strong>{pct(c.average_percentage)}</strong><small>{c.released_results} released</small></div>)}</div>:<p style={{color:'#6b8077'}}>No released Education results yet.</p>}</section>
  <section style={{...box,marginTop:16}}><h2 style={{marginTop:0}}>Recent audited activity</h2>{data?.recentActivity?.length?data.recentActivity.map((x,i)=><div key={`${x.created_at}-${i}`} style={{padding:'9px 0',borderBottom:'1px solid #edf2ef'}}><b>{String(x.action).replaceAll('_',' ')}</b><small style={{display:'block',color:'#6b8077'}}>{x.entity_type||'platform'}{x.entity_id?` · ${x.entity_id}`:''} · {new Date(x.created_at).toLocaleString()}</small></div>):<p style={{color:'#6b8077'}}>No audited activity yet.</p>}</section>
  {msg&&<p style={{marginTop:16,padding:13,background:'#fff4df',borderRadius:12}}>{msg}</p>}
 </div></main>
}
