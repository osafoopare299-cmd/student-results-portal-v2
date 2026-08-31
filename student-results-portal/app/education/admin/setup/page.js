'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Database, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';

export default function EducationSetupPage(){
  const [data,setData]=useState(null),[message,setMessage]=useState('Checking isolated education database…'),[busy,setBusy]=useState(false);
  async function load(){setBusy(true);try{const r=await fetch('/api/education/admin/setup',{cache:'no-store'});const d=await r.json();setData(d);setMessage(r.ok?'':(d.error||'Unable to check database.'));}catch(e){setMessage(e.message||'Unable to check database.');}finally{setBusy(false);}}
  useEffect(()=>{load();},[]);
  async function initialize(){setBusy(true);setMessage('Initializing education tables on the isolated database…');try{const r=await fetch('/api/education/admin/setup',{method:'POST'});const d=await r.json();setData(d);setMessage(r.ok?'Education database initialized successfully.':(d.error||'Setup failed.'));}catch(e){setMessage(e.message||'Setup failed.');}finally{setBusy(false);}}
  const ready=Boolean(data?.status?.foundation&&data?.status?.materials);
  const card={background:'#fff',border:'1px solid #dfeae5',borderRadius:20,padding:22};
  return <main style={{minHeight:'100vh',background:'#f5faf8',padding:24,fontFamily:'Arial,sans-serif',color:'#153126'}}><section style={{maxWidth:900,margin:'auto'}}>
    <Link href="/education/admin" style={{color:'#08744d',fontWeight:800,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:7}}><ArrowLeft size={18}/> Administrator dashboard</Link>
    <div style={{margin:'24px 0 18px',display:'flex',gap:16,alignItems:'center'}}><span style={{width:54,height:54,borderRadius:16,background:'#e6f7ef',display:'grid',placeItems:'center'}}><Database size={28}/></span><div><small style={{fontWeight:800,color:'#08744d'}}>DROPARE EDUCATION</small><h1 style={{fontSize:36,margin:'4px 0'}}>Database Setup</h1><p style={{margin:0,color:'#657d74'}}>Initialize only the isolated education database. The existing Student Results database remains separate.</p></div></div>
    <section style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><h2 style={{margin:'0 0 6px'}}>Isolation status</h2><p style={{margin:0,color:'#657d74'}}>{data?.configured?'EDUCATION_DATABASE_URL is configured for this preview.':'EDUCATION_DATABASE_URL has not been configured for this preview yet.'}</p></div><button onClick={load} disabled={busy} style={{border:'1px solid #cfe3d9',background:'#fff',borderRadius:11,padding:'10px 13px',fontWeight:800,color:'#08744d',display:'inline-flex',gap:7,alignItems:'center'}}><RefreshCw size={17}/> Recheck</button></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginTop:18}}><Status label="Separate education URL" ok={Boolean(data?.configured)}/><Status label="Database isolated" ok={Boolean(data?.isolated)}/><Status label="Foundation tables" ok={Boolean(data?.status?.foundation)}/><Status label="Learning materials" ok={Boolean(data?.status?.materials)}/></div>
    </section>
    <section style={{...card,marginTop:16}}><div style={{display:'flex',gap:12,alignItems:'flex-start'}}>{ready?<CheckCircle2 size={24} color="#08744d"/>:<ShieldCheck size={24} color="#08744d"/>}<div><h2 style={{margin:'0 0 7px'}}>{ready?'Education database ready':'Safe initialization'}</h2><p style={{margin:'0 0 15px',color:'#657d74'}}>Initialization is blocked unless an explicit, separate EDUCATION_DATABASE_URL is present. The setup action creates only education tables and indexes and does not modify the original results tables.</p><button onClick={initialize} disabled={busy||!data?.configured||!data?.isolated||ready} style={{background:'#08744d',color:'#fff',border:0,borderRadius:12,padding:'13px 17px',fontWeight:800,opacity:(busy||!data?.configured||!data?.isolated||ready)?.55:1}}>{busy?'Working…':ready?'Already initialized':'Initialize education database'}</button></div></div></section>
    {message&&<p style={{marginTop:16,padding:14,borderRadius:12,background:'#fff4df',display:'flex',alignItems:'center',gap:8}}><TriangleAlert size={18}/>{message}</p>}
  </section></main>;
}

function Status({label,ok}){return <div style={{padding:14,border:'1px solid #e2ece7',borderRadius:14,background:'#fbfdfc'}}><div style={{display:'flex',alignItems:'center',gap:8,fontWeight:800}}>{ok?<CheckCircle2 size={18} color="#08744d"/>:<TriangleAlert size={18} color="#9a5a12"/>}{label}</div><small style={{display:'block',marginTop:6,color:'#6d8179'}}>{ok?'Ready':'Not ready'}</small></div>}
