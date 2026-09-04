import Link from 'next/link';
import { RefreshCw, WifiOff } from 'lucide-react';

export const metadata={title:'Offline'};
export default function EducationOfflinePage(){
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#f5faf8',fontFamily:'Arial,sans-serif',color:'#173126'}}><section style={{width:'min(100%,520px)',background:'#fff',border:'1px solid #dfe9e4',borderRadius:24,padding:28,boxShadow:'0 20px 60px rgba(15,80,50,.10)'}}><div style={{width:58,height:58,borderRadius:18,display:'grid',placeItems:'center',background:'#eaf6ef',color:'#166534'}}><WifiOff size={28}/></div><h1 style={{fontSize:32,margin:'20px 0 8px'}}>You are offline</h1><p style={{lineHeight:1.65,color:'#667d74'}}>For privacy, signed-in Education pages are not stored as offline HTML. Materials explicitly saved from the Learning Hub remain stored for the verified student account on this device. Live assessments, AI Tutor requests, result updates and other authenticated actions need an internet connection.</p><div style={{display:'grid',gap:10,marginTop:22}}><Link href="/education/student" style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8,textDecoration:'none',background:'#166534',color:'#fff',padding:14,borderRadius:14,fontWeight:800}}><RefreshCw size={18}/> Try Student Portal again</Link></div></section></main>;
}
