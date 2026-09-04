'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function EducationError({error,reset}){
  useEffect(()=>{console.error('Education route error:',error);},[error]);
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f4faf7',fontFamily:'Arial,sans-serif',color:'#17342a'}}>
    <section style={{width:'min(100%,520px)',background:'#fff',border:'1px solid #dce9e3',borderRadius:24,padding:30,boxShadow:'0 18px 55px rgba(16,74,49,.12)'}}>
      <span style={{width:52,height:52,borderRadius:16,display:'grid',placeItems:'center',background:'#fff3e8',color:'#a34b23'}}><AlertTriangle size={26}/></span>
      <h1 style={{fontSize:30,margin:'18px 0 8px'}}>This Education page could not load</h1>
      <p style={{color:'#657b72',lineHeight:1.6}}>Your account data has not been changed. Retry the page, or return to the Education home and open the workspace again.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:20}}>
        <button type="button" onClick={()=>reset()} style={{border:0,borderRadius:12,padding:'12px 16px',background:'#08744d',color:'#fff',fontWeight:800,display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'}}><RefreshCw size={17}/> Retry</button>
        <Link href="/education" style={{border:'1px solid #d6e4dd',borderRadius:12,padding:'12px 16px',color:'#315347',fontWeight:800,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8}}><Home size={17}/> Education home</Link>
      </div>
    </section>
  </main>;
}
