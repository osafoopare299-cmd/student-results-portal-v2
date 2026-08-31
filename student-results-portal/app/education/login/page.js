'use client';

import Link from 'next/link';
import { GraduationCap, LockKeyhole, Mail, ShieldCheck, Stethoscope } from 'lucide-react';
import styles from './page.module.css';

export default function EducationLogin(){
  return <main className={styles.page}><section className={styles.card}>
    <div className={styles.brand}><span><Stethoscope size={24}/></span><div><b>Dropare Education</b><small>Secure education gateway</small></div></div>
    <div className={styles.intro}><span>STUDENT EDUCATION SYSTEM</span><h1>Welcome back.</h1><p>Sign in to access your authorized learning, assessment and academic workspace.</p></div>
    <form onSubmit={e=>e.preventDefault()}>
      <label>Email address<div><Mail size={18}/><input type="email" placeholder="your@email.com" required/></div></label>
      <label>Password<div><LockKeyhole size={18}/><input type="password" placeholder="••••••••" required/></div></label>
      <button type="submit" disabled><ShieldCheck size={18}/> Sign in <small>Auth connection pending</small></button>
    </form>
    <div className={styles.preview}><GraduationCap size={18}/><p><b>Preview workspaces</b><span>Authentication is intentionally disabled until the Neon auth connection is provisioned.</span></p></div>
    <div className={styles.links}><Link href="/education/student">Student</Link><Link href="/education/lecturer">Lecturer</Link><Link href="/education/admin">Administrator</Link></div>
  </section></main>;
}
