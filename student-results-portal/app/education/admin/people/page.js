'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Save, ShieldCheck, UserPlus, Users } from 'lucide-react';
import styles from './people.module.css';

const emptyForm={fullName:'',email:'',role:'student',status:'active'};

export default function EducationPeopleAdmin(){
  const [people,setPeople]=useState([]);
  const [form,setForm]=useState(emptyForm);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [ready,setReady]=useState(false);

  async function load(){
    setBusy(true); setMessage('');
    try{
      const res=await fetch('/api/education/admin/people',{cache:'no-store'});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Unable to load people.');
      setPeople(data.people||[]); setReady(true);
    }catch(err){ setReady(false); setMessage(err.message); }
    finally{ setBusy(false); }
  }

  useEffect(()=>{ load(); },[]);

  async function submit(e){
    e.preventDefault(); setBusy(true); setMessage('');
    try{
      const res=await fetch('/api/education/admin/people',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||'Unable to save person.');
      setForm(emptyForm); setMessage('Person saved successfully.'); await load();
    }catch(err){ setMessage(err.message); }
    finally{ setBusy(false); }
  }

  return <main className={styles.page}>
    <div className={styles.wrap}>
      <div className={styles.top}><Link href="/education/admin"><ArrowLeft size={18}/> Administrator</Link><span><ShieldCheck size={16}/> Protected workspace</span></div>
      <section className={styles.hero}><div><small>DROPARE EDUCATION</small><h1>People & Permissions</h1><p>Add and review students, lecturers and administrators. Records stay separate from the existing results portal.</p></div><Users size={40}/></section>

      <section className={styles.grid}>
        <form className={styles.card} onSubmit={submit}>
          <div className={styles.cardHead}><div><UserPlus size={20}/><h2>Add or update person</h2></div></div>
          <label>Full name<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Full name"/></label>
          <label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label>
          <div className={styles.two}>
            <label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="student">Student</option><option value="lecturer">Lecturer</option><option value="admin">Administrator</option></select></label>
            <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
          </div>
          <button disabled={busy} className={styles.primary}><Save size={17}/>{busy?'Saving…':'Save person'}</button>
          {!ready && <p className={styles.note}>This form will activate when the education database schema is available.</p>}
          {message && <p className={styles.message}>{message}</p>}
        </form>

        <section className={styles.card}>
          <div className={styles.cardHead}><div><Users size={20}/><h2>Education users</h2></div><button onClick={load} disabled={busy} className={styles.iconBtn}><RefreshCw size={17}/></button></div>
          <div className={styles.list}>{people.length?people.map(p=><article key={p.id}><div><strong>{p.full_name}</strong><small>{p.email}</small></div><span>{p.role}</span><em>{p.status}</em></article>):<div className={styles.empty}>No education users are available yet.</div>}</div>
        </section>
      </section>
    </div>
  </main>;
}
