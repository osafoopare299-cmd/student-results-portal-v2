'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Bookmark, CheckCircle2, Download, ExternalLink, FileText, Save, Search, Sparkles, StickyNote, Video } from 'lucide-react';

const iconFor={note:BookOpen,pdf:FileText,video:Video,link:ExternalLink};
const LEGACY_STORAGE_KEY='dropare-education-offline-materials-v1';

function safeUserPart(value){return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,120);}
function storageKey(userId){return `dropare-education-offline-materials-v2-${safeUserPart(userId)}`;}
function resourceCache(userId){return `dropare-education-resources-v2-${safeUserPart(userId)}`;}
function readSaved(userId){if(!userId)return[];try{return JSON.parse(localStorage.getItem(storageKey(userId))||'[]');}catch{return [];}}
function writeSaved(userId,items){if(!userId)return;try{localStorage.setItem(storageKey(userId),JSON.stringify(items));}catch{}}
function resourceHref(m){return m.file_url||m.resource_url||null;}

export default function StudentMaterials(){
  const [data,setData]=useState({offerings:[],materials:[]});
  const [query,setQuery]=useState('');
  const [course,setCourse]=useState('all');
  const [offlineOnly,setOfflineOnly]=useState(false);
  const [bookmarkedOnly,setBookmarkedOnly]=useState(false);
  const [savedIds,setSavedIds]=useState([]);
  const [userId,setUserId]=useState(null);
  const [library,setLibrary]=useState({});
  const [noteDrafts,setNoteDrafts]=useState({});
  const [openNotes,setOpenNotes]=useState({});
  const [msg,setMsg]=useState('Loading your learning materials…');

  async function loadLibrary(){
    try{
      const r=await fetch('/api/education/student/study-library',{cache:'no-store',credentials:'include'});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.error||'Unable to load study library.');
      const next={};
      (d.library||[]).forEach(item=>{next[String(item.material_id)]=item;});
      setLibrary(next);
      setNoteDrafts(Object.fromEntries(Object.entries(next).map(([id,item])=>[id,item.personal_note||''])));
    }catch{}
  }

  useEffect(()=>{
    (async()=>{
      try{
        const meResponse=await fetch('/api/education/me',{cache:'no-store',credentials:'include'});
        const me=await meResponse.json();
        if(!meResponse.ok||!me?.user?.id)throw new Error(me.error||'Unable to verify your Education account.');
        const uid=String(me.user.id);
        setUserId(uid);
        try{localStorage.removeItem(LEGACY_STORAGE_KEY);}catch{}
        const saved=readSaved(uid);
        setSavedIds(saved.map(x=>String(x.id)));
        try{
          const [materialsResponse]=await Promise.all([
            fetch('/api/education/student/materials',{cache:'no-store',credentials:'include'}),
            loadLibrary()
          ]);
          const d=await materialsResponse.json();
          if(!materialsResponse.ok)throw new Error(d.error||'Unable to load materials.');
          setData(d);setMsg('');
        }catch(e){
          if(saved.length){
            const offeringMap=new Map();
            saved.forEach(m=>{if(!offeringMap.has(String(m.offering_id)))offeringMap.set(String(m.offering_id),{id:m.offering_id,code:m.code,title:m.course_title,materials_count:0,offline_count:0,ai_count:0});const o=offeringMap.get(String(m.offering_id));o.materials_count++;o.offline_count++;if(m.is_ai_approved)o.ai_count++;});
            setData({offerings:[...offeringMap.values()],materials:saved});
            setMsg('Offline mode: showing materials saved for this signed-in Education account on this device.');
          } else setMsg(e.message||'Unable to load materials.');
        }
      }catch(e){
        setData({offerings:[],materials:[]});
        setSavedIds([]);
        setMsg(e.message||'Unable to verify your Education account. Stored offline materials are hidden until your account can be verified.');
      }
    })();
  },[]);

  async function saveOffline(material){
    if(!userId){setMsg('Your Education account must be verified before saving offline materials.');return;}
    if(!material.is_offline_available){setMsg('This resource has not been approved by the lecturer for offline access.');return;}
    const href=resourceHref(material);
    const existing=readSaved(userId).filter(x=>String(x.id)!==String(material.id));
    const saved={...material,saved_at:new Date().toISOString()};
    writeSaved(userId,[saved,...existing]);
    setSavedIds(ids=>[...new Set([...ids,String(material.id)])]);
    let resourceCached=false;
    if(href&&'caches' in window){
      try{
        const response=await fetch(href,{credentials:material.has_uploaded_file?'include':'omit',cache:'no-store'});
        if(response.ok){const cache=await caches.open(resourceCache(userId));await cache.put(href,response.clone());resourceCached=true;}
      }catch{}
    }
    setMsg(resourceCached?'Saved for offline use, including the resource file.':'Saved for offline use. Note text and material details are available offline; some external files may still require internet access.');
  }

  function removeOffline(material){
    if(!userId)return;
    const next=readSaved(userId).filter(x=>String(x.id)!==String(material.id));
    writeSaved(userId,next);setSavedIds(next.map(x=>String(x.id)));setMsg('Removed from offline saved materials.');
    const href=resourceHref(material);if(href&&'caches' in window)caches.open(resourceCache(userId)).then(cache=>cache.delete(href)).catch(()=>{});
  }

  async function updateLibrary(materialId,changes,successMessage){
    try{
      const r=await fetch('/api/education/student/study-library',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({materialId:Number(materialId),...changes})});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.error||'Unable to update study library.');
      setLibrary(prev=>({...prev,[String(materialId)]:d.item}));
      if(Object.prototype.hasOwnProperty.call(changes,'personalNote'))setNoteDrafts(prev=>({...prev,[String(materialId)]:d.item.personal_note||''}));
      setMsg(successMessage);
    }catch(e){setMsg(e.message||'Unable to update study library.');}
  }

  function toggleBookmark(material){
    const id=String(material.id),current=Boolean(library[id]?.bookmarked);
    updateLibrary(material.id,{bookmarked:!current},!current?'Bookmarked for quick revision.':'Bookmark removed.');
  }

  function saveNote(material){
    const id=String(material.id);
    updateLibrary(material.id,{personalNote:noteDrafts[id]||''},'Private study note saved.');
  }

  const bookmarkedCount=Object.values(library).filter(x=>x.bookmarked).length;
  const noteCount=Object.values(library).filter(x=>String(x.personal_note||'').trim()).length;
  const materials=useMemo(()=>data.materials.filter(m=>{
    const hay=`${m.title} ${m.description||''} ${m.code} ${m.course_title}`.toLowerCase();
    const bookmarked=Boolean(library[String(m.id)]?.bookmarked);
    return hay.includes(query.trim().toLowerCase()) && (course==='all'||String(m.offering_id)===course) && (!offlineOnly||savedIds.includes(String(m.id))) && (!bookmarkedOnly||bookmarked);
  }),[data,query,course,offlineOnly,bookmarkedOnly,savedIds,library]);

  const card={background:'#fff',border:'1px solid #dce9e3',borderRadius:18,padding:18};
  const control={border:'1px solid #d6e4dd',background:'#fff',borderRadius:12,padding:'11px 12px'};
  const smallButton={border:'1px solid #d6e4dd',background:'#fff',color:'#35584a',borderRadius:10,padding:'8px 10px',fontWeight:800,display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'};

  return <main style={{minHeight:'100vh',background:'#f4faf7',padding:24,fontFamily:'Arial,sans-serif',color:'#17342a'}}><div style={{maxWidth:1120,margin:'auto'}}>
    <Link href="/education/student" style={{display:'inline-flex',gap:7,alignItems:'center',color:'#08744d',fontWeight:800,textDecoration:'none'}}><ArrowLeft size={18}/> Student dashboard</Link>
    <section style={{marginTop:18,background:'linear-gradient(120deg,#08744d,#11a36d)',color:'#fff',borderRadius:24,padding:'28px 30px'}}><small style={{fontWeight:800,letterSpacing:'.14em'}}>MY LEARNING</small><h1 style={{fontSize:38,margin:'8px 0'}}>Course Materials</h1><p style={{margin:0,color:'#d8f5e9'}}>Published course resources, offline study, bookmarks and private personal notes in one place.</p></section>
    <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,margin:'14px 0 22px'}}>{data.offerings.map(o=><article key={o.id} style={card}><b>{o.code}</b><div style={{fontSize:13,marginTop:4}}>{o.title}</div><small style={{display:'block',marginTop:8,color:'#70857c'}}>{o.materials_count} materials • {o.offline_count} offline • {o.ai_count} AI-approved</small></article>)}<article style={card}><b>My Study Library</b><div style={{fontSize:13,marginTop:4}}>Private to your account</div><small style={{display:'block',marginTop:8,color:'#70857c'}}>{bookmarkedCount} bookmarked • {noteCount} with notes</small></article></section>
    <section style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}><label style={{...control,display:'flex',alignItems:'center',gap:8,flex:'1 1 280px'}}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search materials" style={{border:0,outline:0,width:'100%'}}/></label><select value={course} onChange={e=>setCourse(e.target.value)} style={control}><option value="all">All courses</option>{data.offerings.map(o=><option key={o.id} value={o.id}>{o.code} — {o.title}</option>)}</select><button onClick={()=>setBookmarkedOnly(v=>!v)} style={{...control,color:bookmarkedOnly?'#08744d':'#526a60',fontWeight:800}}><Bookmark size={16} style={{verticalAlign:'middle',marginRight:6}}/>Bookmarked ({bookmarkedCount})</button><button onClick={()=>setOfflineOnly(v=>!v)} style={{...control,color:offlineOnly?'#08744d':'#526a60',fontWeight:800}}><Download size={16} style={{verticalAlign:'middle',marginRight:6}}/>Offline ({savedIds.length})</button></section>
    <section style={{display:'grid',gap:12}}>{materials.length?materials.map(m=>{const Icon=iconFor[m.material_type]||FileText;const saved=savedIds.includes(String(m.id));const href=resourceHref(m);const id=String(m.id);const bookmarked=Boolean(library[id]?.bookmarked);const hasNote=Boolean(String(library[id]?.personal_note||'').trim());const noteOpen=Boolean(openNotes[id]);return <article key={m.id} style={card}><div style={{display:'flex',gap:13,alignItems:'flex-start'}}><span style={{width:42,height:42,borderRadius:12,background:'#e8f7f0',display:'grid',placeItems:'center',color:'#08744d',flex:'none'}}><Icon size={20}/></span><div style={{flex:1,minWidth:0}}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><small style={{fontWeight:800,color:'#08744d'}}>{m.code} • {m.material_type.toUpperCase()}</small><h2 style={{fontSize:18,margin:'4px 0 6px'}}>{m.title}</h2></div><div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap'}}>{m.has_uploaded_file&&<span style={{fontSize:11,fontWeight:800,background:'#e8f7f0',padding:'6px 8px',borderRadius:999}}>Secure file</span>}{saved&&<span style={{fontSize:11,fontWeight:800,background:'#e5f8ee',padding:'6px 8px',borderRadius:999}}><CheckCircle2 size={12} style={{verticalAlign:'middle'}}/> Offline</span>}{bookmarked&&<span style={{fontSize:11,fontWeight:800,background:'#fff4d8',padding:'6px 8px',borderRadius:999}}><Bookmark size={12} style={{verticalAlign:'middle'}}/> Bookmarked</span>}{hasNote&&<span style={{fontSize:11,fontWeight:800,background:'#eef3ff',padding:'6px 8px',borderRadius:999}}><StickyNote size={12} style={{verticalAlign:'middle'}}/> Note</span>}{m.is_ai_approved&&<span style={{fontSize:11,fontWeight:800,background:'#eef7f3',padding:'6px 8px',borderRadius:999}}><Sparkles size={12} style={{verticalAlign:'middle'}}/> AI source</span>}</div></div>{m.description&&<p style={{color:'#60786e',lineHeight:1.55}}>{m.description}</p>}{m.content_text&&m.material_type==='note'&&<div style={{background:'#f7fbf9',borderRadius:12,padding:13,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{m.content_text}</div>}{m.original_filename&&<div style={{fontSize:12,color:'#60786e',marginTop:8}}>{m.original_filename}{m.file_size_bytes?` • ${(Number(m.file_size_bytes)/1048576).toFixed(1)} MB`:''}</div>}<div style={{fontSize:12,color:'#789087',marginTop:10}}>{m.class_name}{m.term?` • ${m.term}`:''}{m.lecturer_name?` • ${m.lecturer_name}`:''}</div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>{href&&<a href={href} target="_blank" rel="noreferrer" style={{...smallButton,textDecoration:'none',color:'#08744d'}}>Open resource <ExternalLink size={15}/></a>}<button onClick={()=>toggleBookmark(m)} style={{...smallButton,background:bookmarked?'#fff4d8':'#fff'}}><Bookmark size={14}/>{bookmarked?'Remove bookmark':'Bookmark'}</button><button onClick={()=>setOpenNotes(prev=>({...prev,[id]:!prev[id]}))} style={{...smallButton,background:noteOpen?'#eef3ff':'#fff'}}><StickyNote size={14}/>{hasNote?'Edit note':'Add note'}</button>{m.is_offline_available&&(saved?<button onClick={()=>removeOffline(m)} style={smallButton}>Remove offline</button>:<button onClick={()=>saveOffline(m)} style={{...smallButton,background:'#08744d',color:'#fff',borderColor:'#08744d'}}><Download size={14}/> Save offline</button>)}</div>{noteOpen&&<div style={{marginTop:12,padding:13,background:'#f7f9ff',border:'1px solid #dfe6f7',borderRadius:12}}><label style={{fontWeight:800,fontSize:13}}>My private study note</label><textarea value={noteDrafts[id]??library[id]?.personal_note??''} onChange={e=>setNoteDrafts(prev=>({...prev,[id]:e.target.value}))} placeholder="Add your own summary, reminder, mnemonic or revision point…" rows={5} style={{width:'100%',boxSizing:'border-box',marginTop:7,border:'1px solid #ccd7ee',borderRadius:10,padding:10,resize:'vertical'}}/><div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',marginTop:8,flexWrap:'wrap'}}><small style={{color:'#70857c'}}>Visible only to your signed-in Education account.</small><button onClick={()=>saveNote(m)} style={{...smallButton,background:'#08744d',color:'#fff',borderColor:'#08744d'}}><Save size={14}/> Save note</button></div></div>}</div></div></article>;}):<section style={{...card,textAlign:'center',color:'#6b8077'}}>No materials match this view yet.</section>}</section>
    {msg&&<p style={{marginTop:16,padding:13,background:'#e8f7f0',borderRadius:12}}>{msg}</p>}
  </div></main>;
}
