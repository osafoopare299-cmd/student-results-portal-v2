import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function EducationNotFound(){
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f4faf7',fontFamily:'Arial,sans-serif',color:'#17342a'}}>
    <section style={{width:'min(100%,520px)',background:'#fff',border:'1px solid #dce9e3',borderRadius:24,padding:30,textAlign:'center',boxShadow:'0 18px 55px rgba(16,74,49,.10)'}}>
      <span style={{width:58,height:58,borderRadius:18,display:'grid',placeItems:'center',background:'#e8f7f0',color:'#08744d',margin:'0 auto'}}><SearchX size={28}/></span>
      <h1 style={{fontSize:30,margin:'18px 0 8px'}}>Education page not found</h1>
      <p style={{color:'#657b72',lineHeight:1.6}}>The link may be old, incomplete, or no longer available. Return to Dropare Education and choose the feature from your workspace.</p>
      <Link href="/education" style={{marginTop:18,borderRadius:12,padding:'12px 16px',background:'#08744d',color:'#fff',fontWeight:800,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8}}><ArrowLeft size={17}/> Back to Education</Link>
    </section>
  </main>;
}
