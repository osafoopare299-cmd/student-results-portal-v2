import Link from 'next/link';
import { LockKeyhole, ShieldCheck, Stethoscope } from 'lucide-react';
import { isAdmin } from '../../../lib/admin-auth';
import Workspace from '../workspace';

export const metadata = { title: 'Administrator Portal | Dropare Education' };
export const dynamic = 'force-dynamic';

export default async function EducationAdminPortal(){
  const authenticated = await isAdmin();

  if (!authenticated) {
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'linear-gradient(160deg,#e9f8ef,#f7fbf8)',fontFamily:'Arial,sans-serif'}}>
      <section style={{width:'min(100%,460px)',background:'#fff',border:'1px solid #dcebe1',borderRadius:'24px',padding:'32px',boxShadow:'0 22px 60px rgba(17,78,45,.12)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',color:'#14532d',marginBottom:'26px'}}><span style={{width:'42px',height:'42px',display:'grid',placeItems:'center',borderRadius:'14px',background:'#e8f5ec'}}><Stethoscope size={22}/></span><div><b style={{display:'block',fontSize:'18px'}}>Dropare Education</b><small style={{color:'#64748b'}}>Administrator security</small></div></div>
        <div style={{width:'54px',height:'54px',display:'grid',placeItems:'center',borderRadius:'18px',background:'#ecfdf3',color:'#166534',marginBottom:'18px'}}><LockKeyhole size={26}/></div>
        <h1 style={{fontSize:'28px',lineHeight:1.1,margin:'0 0 10px',color:'#102418'}}>Administrator sign-in required</h1>
        <p style={{margin:'0 0 24px',lineHeight:1.65,color:'#64748b'}}>The Education Administrator workspace now uses the existing secure administrator session. Sign in through the current administrator portal, then return here.</p>
        <Link href="/admin" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'9px',textDecoration:'none',background:'#166534',color:'#fff',fontWeight:700,padding:'14px 18px',borderRadius:'14px'}}><ShieldCheck size={18}/> Open administrator sign-in</Link>
        <Link href="/education" style={{display:'block',textAlign:'center',marginTop:'16px',color:'#166534',fontWeight:700,textDecoration:'none'}}>Back to Education</Link>
      </section>
    </main>;
  }

  return <Workspace role="admin"/>;
}
