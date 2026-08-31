import Link from 'next/link';
import { LockKeyhole, ShieldCheck, Stethoscope } from 'lucide-react';

const copy = {
  setup: {
    title: 'Education sign-in setup is pending',
    body: 'The secure education sign-in service or education database schema is not available in this preview yet. Access is intentionally closed until both are ready.',
    action: 'Back to Education',
    href: '/education',
  },
  unauthenticated: {
    title: 'Sign in to continue',
    body: 'This workspace is protected. Sign in with your education account to continue.',
    action: 'Open education sign-in',
    href: '/education/login',
  },
  unregistered: {
    title: 'Account is not enrolled',
    body: 'Your sign-in is valid, but no active Dropare Education profile is linked to this email yet. Ask an administrator to add your account.',
    action: 'Back to Education',
    href: '/education',
  },
  inactive: {
    title: 'Education access is inactive',
    body: 'This account is currently inactive or suspended. Contact an administrator if you believe access should be restored.',
    action: 'Back to Education',
    href: '/education',
  },
  'wrong-role': {
    title: 'This workspace is not assigned to you',
    body: 'Your account is signed in, but your assigned role does not permit access to this workspace.',
    action: 'Open my workspace',
    href: '/education',
  },
};

export default function EducationAccessGate({ reason = 'unauthenticated', user }) {
  const item = copy[reason] || copy.unauthenticated;
  const roleHref = user?.role && ['student','lecturer','admin'].includes(user.role)
    ? `/education/${user.role}`
    : item.href;
  const href = reason === 'wrong-role' ? roleHref : item.href;

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:'24px',background:'linear-gradient(160deg,#e9f8ef,#f7fbf8)',fontFamily:'Arial,sans-serif'}}>
    <section style={{width:'min(100%,460px)',background:'#fff',border:'1px solid #dcebe1',borderRadius:'24px',padding:'32px',boxShadow:'0 22px 60px rgba(17,78,45,.12)'}}>
      <div style={{display:'flex',alignItems:'center',gap:'12px',color:'#14532d',marginBottom:'26px'}}><span style={{width:'42px',height:'42px',display:'grid',placeItems:'center',borderRadius:'14px',background:'#e8f5ec'}}><Stethoscope size={22}/></span><div><b style={{display:'block',fontSize:'18px'}}>Dropare Education</b><small style={{color:'#64748b'}}>Secure workspace access</small></div></div>
      <div style={{width:'54px',height:'54px',display:'grid',placeItems:'center',borderRadius:'18px',background:'#ecfdf3',color:'#166534',marginBottom:'18px'}}><LockKeyhole size={26}/></div>
      <h1 style={{fontSize:'28px',lineHeight:1.1,margin:'0 0 10px',color:'#102418'}}>{item.title}</h1>
      <p style={{margin:'0 0 24px',lineHeight:1.65,color:'#64748b'}}>{item.body}</p>
      <Link href={href} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'9px',textDecoration:'none',background:'#166534',color:'#fff',fontWeight:700,padding:'14px 18px',borderRadius:'14px'}}><ShieldCheck size={18}/> {reason === 'wrong-role' ? 'Open my workspace' : item.action}</Link>
      <Link href="/" style={{display:'block',textAlign:'center',marginTop:'16px',color:'#166534',fontWeight:700,textDecoration:'none'}}>Student Results Portal</Link>
    </section>
  </main>;
}
