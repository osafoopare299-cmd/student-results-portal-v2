'use client';

import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { ArrowLeft,BookOpen,CheckCircle2,GraduationCap,Mail,Phone,Save,ShieldCheck,UserRound } from 'lucide-react';

export default function StudentProfilePage(){
  const [data,setData]=useState(null),[phone,setPhone]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');

  useEffect(()=>{
    fetch('/api/education/student/profile',{cache:'no-store'})
      .then(async r=>{const body=await r.json();if(!r.ok||!body.ok)throw new Error(body.error||'Unable to load profile.');return body;})
      .then(body=>{setData(body);setPhone(body.profile?.phone||'');})
      .catch(e=>setError(e.message||'Unable to load profile.'))
      .finally(()=>setLoading(false));
  },[]);

  const initials=useMemo(()=>String(data?.profile?.full_name||'Student').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join(''),[data]);

  async function save(){
    if(saving)return;setSaving(true);setMessage('');setError('');
    try{
      const response=await fetch('/api/education/student/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
      const body=await response.json();if(!response.ok||!body.ok)throw new Error(body.error||'Unable to update profile.');
      setMessage('Profile updated successfully.');
    }catch(e){setError(e.message||'Unable to update profile.');}finally{setSaving(false);}
  }

  const shell={minHeight:'100vh',background:'linear-gradient(180deg,#f3fbf7 0%,#f8fbf9 55%,#fff 100%)',padding:'24px 16px 48px',color:'#173b2d'};
  const card={background:'#fff',border:'1px solid #dceae3',borderRadius:20,padding:18,boxShadow:'0 12px 34px rgba(25,78,57,.07)'};
  const label={display:'block',fontSize:12,fontWeight:900,letterSpacing:'.06em',textTransform:'uppercase',color:'#668477',marginBottom:6};
  const value={fontSize:16,fontWeight:800,color:'#173b2d'};

  if(loading)return <main style={shell}><div style={{maxWidth:900,margin:'0 auto'}}><p>Loading your profile…</p></div></main>;
  if(error&&!data)return <main style={shell}><div style={{maxWidth:900,margin:'0 auto'}}><Link href="/education/student">Back to student portal</Link><div style={{...card,marginTop:18}}>{error}</div></div></main>;

  const p=data?.profile||{};
  return <main style={shell}>
    <div style={{maxWidth:900,margin:'0 auto'}}>
      <Link href="/education/student" style={{display:'inline-flex',gap:7,alignItems:'center',color:'#08744d',fontWeight:800,textDecoration:'none',marginBottom:18}}><ArrowLeft size={18}/> Student portal</Link>
      <section style={{...card,padding:22,background:'linear-gradient(135deg,#0d6a49,#0b7b54)',color:'#fff',border:'none'}}>
        <div style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{width:68,height:68,borderRadius:22,display:'grid',placeItems:'center',background:'rgba(255,255,255,.16)',fontSize:23,fontWeight:900}}>{initials||<UserRound/>}</div>
          <div style={{flex:1,minWidth:220}}><small style={{fontWeight:900,letterSpacing:'.08em'}}>STUDENT PROFILE</small><h1 style={{margin:'5px 0 3px',fontSize:'clamp(26px,5vw,38px)'}}>{p.full_name}</h1><div style={{opacity:.9}}>{p.student_number||'Student number not assigned'}</div></div>
          <div style={{display:'flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.14)',padding:'9px 12px',borderRadius:999,fontWeight:800}}><ShieldCheck size={17}/> Protected account</div>
        </div>
      </section>

      {(message||error)&&<div style={{marginTop:14,padding:'12px 14px',borderRadius:13,background:message?'#eaf8f0':'#fff1f1',border:`1px solid ${message?'#ccebd8':'#f0caca'}`,fontWeight:700}}>{message||error}</div>}

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14,marginTop:14}}>
        <article style={card}><span style={label}>Account</span><div style={{display:'grid',gap:14}}><div><Mail size={17}/><div style={value}>{p.email}</div></div><div><CheckCircle2 size={17}/><div style={value}>{p.status==='active'?'Active student':'Account status: '+p.status}</div></div></div></article>
        <article style={card}><span style={label}>Academic placement</span><div style={{display:'grid',gap:14}}><div><GraduationCap size={17}/><div style={value}>{p.class_name||'Class not assigned'}</div><small>{[p.class_code,p.level].filter(Boolean).join(' · ')||'Administrator can assign your class.'}</small></div><div><BookOpen size={17}/><div style={value}>{p.academic_year||'Academic year not assigned'}</div></div></div></article>
      </section>

      <section style={{...card,marginTop:14}}>
        <span style={label}>Contact details</span><h2 style={{margin:'0 0 6px'}}>Your phone number</h2><p style={{margin:'0 0 14px',color:'#61796f'}}>You can update your own phone number. Your name, email, student number and class remain administrator-controlled academic records.</p>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><div style={{position:'relative',flex:'1 1 260px'}}><Phone size={17} style={{position:'absolute',left:12,top:13,color:'#5f7f71'}}/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number" style={{width:'100%',boxSizing:'border-box',padding:'12px 12px 12px 38px',border:'1px solid #cfe1d8',borderRadius:12,fontSize:16}}/></div><button onClick={save} disabled={saving} style={{display:'inline-flex',gap:7,alignItems:'center',border:0,borderRadius:12,padding:'12px 16px',background:'#08744d',color:'#fff',fontWeight:900,cursor:'pointer'}}><Save size={17}/>{saving?'Saving…':'Save phone'}</button></div>
      </section>

      <section style={{...card,marginTop:14}}><span style={label}>Current enrolments</span><h2 style={{margin:'0 0 12px'}}>Your courses</h2>{data?.courses?.length?<div style={{display:'grid',gap:9}}>{data.courses.map((c,i)=><div key={`${c.code}-${i}`} style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',padding:12,border:'1px solid #e1ece6',borderRadius:13,flexWrap:'wrap'}}><div><b>{c.code} — {c.title}</b><div style={{fontSize:13,color:'#6a8177'}}>{[c.term,c.academic_year].filter(Boolean).join(' · ')}</div></div><CheckCircle2 size={18}/></div>)}</div>:<p style={{margin:0,color:'#61796f'}}>No active course enrolments are assigned yet.</p>}</section>
    </div>
  </main>;
}
