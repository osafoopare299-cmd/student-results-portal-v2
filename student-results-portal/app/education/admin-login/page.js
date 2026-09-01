'use client';

import { useState } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck, Stethoscope } from 'lucide-react';

export default function EducationAdminLoginPage(){
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function login(event){
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Unable to sign in.');
      window.location.assign('/education/admin/setup');
    } catch(error){ setError(error.message); setLoading(false); }
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'linear-gradient(160deg,#e9f8ef,#f7fbf8)',fontFamily:'Arial,sans-serif'}}><section style={{width:'min(100%,460px)',background:'#fff',border:'1px solid #dcebe1',borderRadius:'24px',padding:'32px',boxShadow:'0 22px 60px rgba(17,78,45,.12)'}}><div style={{display:'flex',alignItems:'center',gap:'12px',color:'#14532d',marginBottom:'26px'}}><span style={{width:42,height:42,display:'grid',placeItems:'center',borderRadius:14,background:'#e8f5ec'}}><Stethoscope size={22}/></span><div><b style={{display:'block',fontSize:18}}>Dropare Education</b><small style={{color:'#64748b'}}>Administrator security</small></div></div><div style={{width:54,height:54,display:'grid',placeItems:'center',borderRadius:18,background:'#ecfdf3',color:'#166534',marginBottom:18}}><ShieldCheck size={26}/></div><h1 style={{fontSize:28,lineHeight:1.1,margin:'0 0 10px',color:'#102418'}}>Education administrator sign-in</h1><p style={{margin:'0 0 24px',lineHeight:1.65,color:'#64748b'}}>Use the existing administrator password. After sign-in you will return directly to Education Database Setup.</p><form onSubmit={login} style={{display:'grid',gap:14}}><label style={{display:'grid',gap:8,fontWeight:700,color:'#183323'}}>Administrator password<div style={{display:'flex',alignItems:'center',gap:10,border:'1px solid #cfe3d6',borderRadius:14,padding:'0 14px'}}><KeyRound size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoFocus style={{width:'100%',border:0,outline:0,padding:'14px 0',fontSize:16,background:'transparent'}}/></div></label>{error&&<div style={{padding:'11px 13px',borderRadius:12,background:'#fff1f2',color:'#9f1239'}}>{error}</div>}<button disabled={loading} style={{border:0,borderRadius:14,padding:'14px 18px',background:'#166534',color:'#fff',fontWeight:800,fontSize:16,cursor:'pointer'}}>{loading?'Signing in…':'Sign in to Education Admin'}</button></form><a href="/education" style={{display:'block',textAlign:'center',marginTop:16,color:'#166534',fontWeight:700,textDecoration:'none'}}>Back to Education</a></section></main>;
}
