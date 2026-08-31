'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GraduationCap, LockKeyhole, Mail, ShieldCheck, Stethoscope, UserPlus } from 'lucide-react';
import { educationAuthClient } from '../../../lib/education-auth-client';
import styles from './page.module.css';

export default function EducationLogin(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [mode,setMode]=useState('signin');

  async function resolveRole(){
    const response=await fetch('/api/education/me',{ cache:'no-store' });
    const payload=await response.json().catch(()=>({}));
    if (!response.ok || !payload?.user?.role) throw new Error(payload?.error || 'Your education role could not be resolved.');
    const destinations={ student:'/education/student', lecturer:'/education/lecturer', admin:'/education/admin' };
    window.location.assign(destinations[payload.user.role] || '/education');
  }

  async function submit(event){
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    const form=new FormData(event.currentTarget);
    const email=String(form.get('email')||'').trim();
    const password=String(form.get('password')||'');

    try {
      if (mode === 'activate') {
        const confirmPassword=String(form.get('confirmPassword')||'');
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        if (password !== confirmPassword) throw new Error('The passwords do not match.');

        const approval=await fetch('/api/education/activate/check',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email}),
        });
        const approved=await approval.json().catch(()=>({}));
        if (!approval.ok || !approved?.user) throw new Error(approved?.error || 'This education account is not approved.');

        const result=await educationAuthClient.signUp.email({
          email,
          name:approved.user.fullName,
          password,
        });
        if (result?.error) throw new Error(result.error.message || 'Unable to activate this account.');

        setNotice('Account activated successfully. Opening your workspace…');
        await resolveRole();
        return;
      }

      const result=await educationAuthClient.signIn.email({ email, password });
      if (result?.error) throw new Error(result.error.message || 'Unable to sign in.');
      await resolveRole();
    } catch (err) {
      setError(err?.message || 'Unable to continue. Please try again.');
      setBusy(false);
    }
  }

  function changeMode(next){
    setMode(next); setError(''); setNotice('');
  }

  return <main className={styles.page}><section className={styles.card}>
    <div className={styles.brand}><span><Stethoscope size={24}/></span><div><b>Dropare Education</b><small>Secure education gateway</small></div></div>
    <div className={styles.intro}><span>STUDENT EDUCATION SYSTEM</span><h1>{mode==='signin'?'Welcome back.':'Activate account.'}</h1><p>{mode==='signin'?'Sign in to access the workspace assigned to your authenticated education account.':'Approved students and lecturers can choose a password and activate their Dropare Education account.'}</p></div>

    <div className={styles.modeSwitch}>
      <button type="button" className={mode==='signin'?styles.activeMode:''} onClick={()=>changeMode('signin')}>Sign in</button>
      <button type="button" className={mode==='activate'?styles.activeMode:''} onClick={()=>changeMode('activate')}>Activate account</button>
    </div>

    <form onSubmit={submit}>
      <label>Email address<div><Mail size={18}/><input name="email" type="email" placeholder="your@email.com" autoComplete="email" required/></div></label>
      <label>{mode==='signin'?'Password':'Choose password'}<div><LockKeyhole size={18}/><input name="password" type="password" placeholder="••••••••" autoComplete={mode==='signin'?'current-password':'new-password'} required/></div></label>
      {mode==='activate' && <label>Confirm password<div><LockKeyhole size={18}/><input name="confirmPassword" type="password" placeholder="••••••••" autoComplete="new-password" required/></div></label>}
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}
      <button type="submit" disabled={busy}>{mode==='activate'?<UserPlus size={18}/>:<ShieldCheck size={18}/>} {busy?(mode==='activate'?'Activating…':'Signing in…'):(mode==='activate'?'Activate account':'Sign in')}</button>
    </form>

    <div className={styles.preview}><GraduationCap size={18}/><p><b>Approved users only</b><span>Activation first checks the Education database. Only active Student, Lecturer or Administrator records can receive a Dropare workspace.</span></p></div>
    <div className={styles.links}><Link href="/">Student results</Link><Link href="/admin">Existing admin</Link><Link href="/education">Education home</Link></div>
  </section></main>;
}
