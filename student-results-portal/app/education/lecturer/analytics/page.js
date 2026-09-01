'use client';

import Link from 'next/link';
import { useEffect,useState } from 'react';
import { Activity,ArrowLeft,BarChart3,CheckCircle2,ClipboardCheck,RefreshCw,Users } from 'lucide-react';

export default function LecturerAnalytics(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function load(){setBusy(true);setMessage('');try{const r=await fetch('/api/education/lecturer/analytics',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load analytics.');setData(d);}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 const s=data?.summary||{}; const card={background:'#fff',border:'1px solid #dce9e3',borderRadius:18,padding:18};
 return <main style={{minHeight:'100vh',background:'#f4faf7',padding:24,fontFamily:'Arial,sans-serif',color:'#17342a'}}><div style={{maxWidth:1100,margin:'auto'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><Link href="/education/lecturer" style={{display:'inline-flex',alignItems:'center',gap:7,color:'#08744d',fontWeight:800,textDecoration:'none'}}><ArrowLeft size={18}/> Lecturer dashboard</Link><button onClick={load} disabled={busy} style={{border:'1px solid #cfe3d8',background:'#fff',borderRadius:12,padding:'10px 13px',fontWeight:800,color:'#08744d'}}><RefreshCw size={16} style={{verticalAlign:'middle',marginRight:6}}/>{busy?'Refreshing…':'Refresh'}</button></div>
  <section style={{marginTop:18,background:'linear-gradient(120deg,#08744d,#11a36d)',color:'#fff',borderRadius:24,padding:'28px 30px'}}><small style={{fontWeight:800,letterSpacing:'.14em'}}>LECTURER ANALYTICS</small><h1 style={{fontSize:38,margin:'8px 0'}}>Class Performance</h1><p style={{margin:0,color:'#d8f5e9'}}>Only courses and students assigned to your own course offerings are included.</p></section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginTop:16}}>
   {[['Course offerings',s.offerings||0,BarChart3],['Enrolments',s.enrolledStudents||0,Users],['Assessments',s.assessments||0,ClipboardCheck],['Marking backlog',s.markingBacklog||0,Activity],['Released results',s.released||0,CheckCircle2],['Attendance',`${s.attendanceRate||0}%`,CheckCircle2]].map(([label,value,Icon])=><article key={label} style={card}><Icon size={20} color="#08744d"/><div style={{fontSize:12,color:'#6c8178',marginTop:10}}>{label}</div><strong style={{fontSize:27,display:'block',marginTop:3}}>{value}</strong></article>)}
  </section>
  <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14,marginTop:16}}>
   <article style={card}><h2 style={{fontSize:19,marginTop:0}}>Owned course offerings</h2><div style={{display:'grid',gap:9}}>{data?.offerings?.length?data.offerings.map(o=><div key={o.id} style={{border:'1px solid #e3eee8',borderRadius:12,padding:12}}><b>{o.code} — {o.title}</b><div style={{fontSize:13,color:'#667d73',marginTop:4}}>{o.class_name}{o.term?` • ${o.term}`:''} • {o.students} active students</div></div>):<p style={{color:'#6c8178'}}>No assigned course offerings yet.</p>}</div></article>
   <article style={card}><h2 style={{fontSize:19,marginTop:0}}>Assessment workflow</h2><div style={{display:'grid',gap:10}}>{[['Draft assessments',s.draftAssessments||0],['Published assessments',s.publishedAssessments||0],['Closed assessments',s.closedAssessments||0],['Marked submissions',s.marked||0],['Attendance sessions',s.attendanceSessions||0]].map(([label,value])=><div key={label} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #edf3f0',paddingBottom:8}}><span>{label}</span><b>{value}</b></div>)}</div></article>
  </section>
  <section style={{...card,marginTop:16}}><h2 style={{fontSize:19,marginTop:0}}>Released result performance by course</h2><div style={{display:'grid',gap:10}}>{data?.coursePerformance?.length?data.coursePerformance.map(c=><div key={c.offeringId} style={{display:'grid',gridTemplateColumns:'1.7fr .7fr .7fr .7fr',gap:10,alignItems:'center',border:'1px solid #e3eee8',borderRadius:12,padding:12}}><div><b>{c.code} — {c.title}</b><div style={{fontSize:12,color:'#6c8178'}}>{c.className}</div></div><div><small>Average</small><b style={{display:'block'}}>{c.average}%</b></div><div><small>Pass rate</small><b style={{display:'block'}}>{c.passRate}%</b></div><div><small>Results</small><b style={{display:'block'}}>{c.count}</b></div></div>):<p style={{color:'#6c8178'}}>Released results will appear here after marking and publication.</p>}</div></section>
  {message&&<p style={{...card,marginTop:14,color:'#315f4d'}}>{message}</p>}
 </div></main>;
}
