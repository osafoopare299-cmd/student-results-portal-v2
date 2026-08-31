'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, GraduationCap, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import styles from './catalog.module.css';

export default function EducationCatalogAdmin(){
  const [data,setData]=useState({courses:[],classes:[],years:[]});
  const [course,setCourse]=useState({code:'',title:'',description:''});
  const [klass,setKlass]=useState({name:'',code:'',level:'',academicYearId:''});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function load(){
    setBusy(true); setMessage('');
    try{
      const res=await fetch('/api/education/admin/catalog',{cache:'no-store'});
      const json=await res.json();
      if(!res.ok) throw new Error(json.error||'Unable to load courses and classes.');
      setData({courses:json.courses||[],classes:json.classes||[],years:json.years||[]});
    }catch(err){setMessage(err.message);}finally{setBusy(false);}
  }
  useEffect(()=>{load();},[]);

  async function save(payload,reset){
    setBusy(true); setMessage('');
    try{
      const res=await fetch('/api/education/admin/catalog',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const json=await res.json();
      if(!res.ok) throw new Error(json.error||'Unable to save item.');
      reset(); setMessage('Saved successfully.'); await load();
    }catch(err){setMessage(err.message);}finally{setBusy(false);}
  }

  return <main className={styles.page}><div className={styles.wrap}>
    <div className={styles.top}><Link href="/education/admin"><ArrowLeft size={18}/> Administrator</Link><span><ShieldCheck size={16}/> Protected workspace</span></div>
    <section className={styles.hero}><div><small>ACADEMIC STRUCTURE</small><h1>Courses & Classes</h1><p>Create the academic structure that enrolments, lecturers, timetables and assessments will use.</p></div><GraduationCap size={42}/></section>

    {message&&<div className={styles.message}>{message}</div>}
    <section className={styles.forms}>
      <form className={styles.card} onSubmit={e=>{e.preventDefault();save({type:'course',...course},()=>setCourse({code:'',title:'',description:''}));}}>
        <div className={styles.head}><BookOpen size={20}/><h2>Add course</h2></div>
        <label>Course code<input required value={course.code} onChange={e=>setCourse({...course,code:e.target.value})} placeholder="e.g. PAED 301"/></label>
        <label>Course title<input required value={course.title} onChange={e=>setCourse({...course,title:e.target.value})} placeholder="Paediatrics"/></label>
        <label>Description<textarea value={course.description} onChange={e=>setCourse({...course,description:e.target.value})} placeholder="Optional course description"/></label>
        <button disabled={busy}><Save size={17}/> Save course</button>
      </form>

      <form className={styles.card} onSubmit={e=>{e.preventDefault();save({type:'class',...klass},()=>setKlass({name:'',code:'',level:'',academicYearId:''}));}}>
        <div className={styles.head}><GraduationCap size={20}/><h2>Add class</h2></div>
        <label>Class name<input required value={klass.name} onChange={e=>setKlass({...klass,name:e.target.value})} placeholder="Third Year PA"/></label>
        <div className={styles.two}><label>Class code<input value={klass.code} onChange={e=>setKlass({...klass,code:e.target.value})} placeholder="PA3"/></label><label>Level<input value={klass.level} onChange={e=>setKlass({...klass,level:e.target.value})} placeholder="Level 300"/></label></div>
        <label>Academic year<select value={klass.academicYearId} onChange={e=>setKlass({...klass,academicYearId:e.target.value})}><option value="">Not assigned</option>{data.years.map(y=><option value={y.id} key={y.id}>{y.name}{y.is_active?' (Active)':''}</option>)}</select></label>
        <button disabled={busy}><Save size={17}/> Save class</button>
      </form>
    </section>

    <section className={styles.lists}>
      <article className={styles.card}><div className={styles.listHead}><h2>Courses</h2><button className={styles.refresh} onClick={load} disabled={busy}><RefreshCw size={16}/></button></div>{data.courses.length?data.courses.map(c=><div className={styles.row} key={c.id}><div><strong>{c.code}</strong><small>{c.title}</small></div><span>{c.active?'Active':'Inactive'}</span></div>):<div className={styles.empty}>No courses available yet.</div>}</article>
      <article className={styles.card}><div className={styles.listHead}><h2>Classes</h2></div>{data.classes.length?data.classes.map(c=><div className={styles.row} key={c.id}><div><strong>{c.name}</strong><small>{[c.code,c.level,c.academic_year].filter(Boolean).join(' · ')}</small></div></div>):<div className={styles.empty}>No classes available yet.</div>}</article>
    </section>
  </div></main>;
}
