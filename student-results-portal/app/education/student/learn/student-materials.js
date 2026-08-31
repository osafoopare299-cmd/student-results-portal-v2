'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Download, FileText, Search, Sparkles, Video, ExternalLink } from 'lucide-react';

const iconFor={note:BookOpen,pdf:FileText,video:Video,link:ExternalLink};

export default function StudentMaterials(){
  const [data,setData]=useState({offerings:[],materials:[]});
  const [query,setQuery]=useState('');
  const [course,setCourse]=useState('all');
  const [offlineOnly,setOfflineOnly]=useState(false);
  const [msg,setMsg]=useState('Loading your learning materials…');

  useEffect(()=>{(async()=>{try{const r=await fetch('/api/education/student/materials',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load materials.');setData(d);setMsg('');}catch(e){setMsg(e.message||'Unable to load materials.');}})();},[]);

  const materials=useMemo(()=>data.materials.filter(m=>{
    const hay=`${m.title} ${m.description||''} ${m.code} ${m.course_title}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase()) && (course==='all'||String(m.offering_id)===course) && (!offlineOnly||m.is_offline_available);
  }),[data,query,course,offlineOnly]);

  const card={background:'#fff',border:'1px solid #dce9e3',borderRadius:18,padding:18};
  const control={border:'1px solid #d6e4dd',background:'#fff',borderRadius:12,padding:'11px 12px'};

  return <main style={{minHeight:'100vh',background:'#f4faf7',padding:24,fontFamily:'Arial,sans-serif',color:'#17342a'}}><div style={{maxWidth:1120,margin:'auto'}}>
    <Link href="/education/student" style={{display:'inline-flex',gap:7,alignItems:'center',color:'#08744d',fontWeight:800,textDecoration:'none'}}><ArrowLeft size={18}/> Student dashboard</Link>
    <section style={{marginTop:18,background:'linear-gradient(120deg,#08744d,#11a36d)',color:'#fff',borderRadius:24,padding:'28px 30px'}}><small style={{fontWeight:800,letterSpacing:'.14em'}}>MY LEARNING</small><h1 style={{fontSize:38,margin:'8px 0'}}>Course Materials</h1><p style={{margin:0,color:'#d8f5e9'}}>Only published resources from courses you are actively enrolled in appear here.</p></section>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,margin:'14px 0 22px'}}>{data.offerings.map(o=><article key={o.id} style={card}><b>{o.code}</b><div style={{fontSize:13,marginTop:4}}>{o.title}</div><small style={{display:'block',marginTop:8,color:'#70857c'}}>{o.materials_count} materials • {o.offline_count} offline • {o.ai_count} AI-approved</small></article>)}</section>
    <section style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}><label style={{...control,display:'flex',alignItems:'center',gap:8,flex:'1 1 280px'}}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search materials" style={{border:0,outline:0,width:'100%'}}/></label><select value={course} onChange={e=>setCourse(e.target.value)} style={control}><option value="all">All courses</option>{data.offerings.map(o=><option key={o.id} value={o.id}>{o.code} — {o.title}</option>)}</select><button onClick={()=>setOfflineOnly(v=>!v)} style={{...control,color:offlineOnly?'#08744d':'#526a60',fontWeight:800}}><Download size={16} style={{verticalAlign:'middle',marginRight:6}}/>Offline ready</button></section>
    <section style={{display:'grid',gap:12}}>{materials.length?materials.map(m=>{const Icon=iconFor[m.material_type]||FileText;return <article key={m.id} style={card}><div style={{display:'flex',gap:13,alignItems:'flex-start'}}><span style={{width:42,height:42,borderRadius:12,background:'#e8f7f0',display:'grid',placeItems:'center',color:'#08744d',flex:'none'}}><Icon size={20}/></span><div style={{flex:1,minWidth:0}}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><small style={{fontWeight:800,color:'#08744d'}}>{m.code} • {m.material_type.toUpperCase()}</small><h2 style={{fontSize:18,margin:'4px 0 6px'}}>{m.title}</h2></div><div style={{display:'flex',gap:7,alignItems:'center'}}>{m.is_offline_available&&<span style={{fontSize:11,fontWeight:800,background:'#eef7f3',padding:'6px 8px',borderRadius:999}}>Offline</span>}{m.is_ai_approved&&<span style={{fontSize:11,fontWeight:800,background:'#eef7f3',padding:'6px 8px',borderRadius:999}}><Sparkles size={12} style={{verticalAlign:'middle'}}/> AI source</span>}</div></div>{m.description&&<p style={{color:'#60786e',lineHeight:1.55}}>{m.description}</p>}{m.content_text&&m.material_type==='note'&&<div style={{background:'#f7fbf9',borderRadius:12,padding:13,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{m.content_text}</div>}<div style={{fontSize:12,color:'#789087',marginTop:10}}>{m.class_name}{m.term?` • ${m.term}`:''}{m.lecturer_name?` • ${m.lecturer_name}`:''}</div>{m.resource_url&&<a href={m.resource_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,marginTop:12,color:'#08744d',fontWeight:800,textDecoration:'none'}}>Open resource <ExternalLink size={15}/></a>}</div></div></article>;}):<section style={{...card,textAlign:'center',color:'#6b8077'}}>No published materials match this view yet.</section>}</section>
    {msg&&<p style={{marginTop:16,padding:13,background:'#e8f7f0',borderRadius:12}}>{msg}</p>}
  </div></main>;
}
