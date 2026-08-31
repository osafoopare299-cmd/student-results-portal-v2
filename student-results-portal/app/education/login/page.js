'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GraduationCap, LockKeyhole, Mail, ShieldCheck, Stethoscope } from 'lucide-react';
import { educationAuthClient } from '../../../lib/education-auth-client';
import styles from './page.module.css';

export default function EducationLogin(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function submit(event){
    event.preventDefault();
    setBusy(true); setError('');
    const form=new FormData(event.currentTarget);
    const email=String(form.get('email')||'').trim();
    const password=String(form.get('password')||'');

    try {
      const result=await educationAuthClient.signIn.email({ email, password });
      if (result?.error) throw new Error(result.error.message || 'Unable to sign in.');

      const response=await fetch('/api/education/me',{ cache:'no-store' });
      const payload=await response.json().catch(()=>({}));
      if (!response.ok || !payload?.user?.role) throw new Error(payload?.error || 'Your education role could not be resolved.');

      const destinations={ student:'/education/student', lecturer:'/education/lecturer', admin:'/education/admin' };
      window.location.assign(destinations[payload.user.role] || '/education');
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.');
      setBusy(false);
    }
  }

  return <main className={styles.page}><section className={styles.card}>
    <div className={styles.brand}><span><Stethoscope size={24}/></span><div><b>Dropare Education</b><small>Secure education gateway</small></div></div>
    <div className={styles.intro}><span>STUDENT EDUCATION SYSTEM</span><h1>Welcome back.</h1><p>Sign in to access the workspace assigned to your authenticated education account.</p></div>
    <form onSubmit={submit}>
      <label>Email address<div><Mail size={18}/><input name="email" type="email" placeholder="your@email.com" autoComplete="email" required/></div></label>
      <label>Password<div><LockKeyhole size={18}/><input name="password" type="password" placeholder="••••••••" autoComplete="current-password" required/></div></label>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" disabled={busy}><ShieldCheck size={18}/> {busy?'Signing in…':'Sign in'}</button>
    </form>
    <div className={styles.preview}><GraduationCap size={18}/><p><b>Role-based routing</b><span>Successful sign-in is matched to the active Student, Lecturer or Administrator record in the education database. Until Neon Auth is provisioned, this form safely reports that setup is pending.</span></p></div>
    <div className={styles.links}><Link href="/">Student results</Link><Link href="/admin">Existing admin</Link><Link href="/education">Education home</Link></div>
  </section></main>;
}
