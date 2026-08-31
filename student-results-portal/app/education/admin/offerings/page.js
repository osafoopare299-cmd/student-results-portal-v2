'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';

export default function CourseOfferings(){
  const [data,setData]=useState({courses:[],classes:[],years:[],lecturers:[],offerings:[]});
  const [message,setMessage]=useState('Loading course offerings…');
  const [form,setForm]=useState({courseId:'',classId:'',academicYearId:'',lecturerId:'',term:''});

  async function load(){
    const r=await fetch('/api/education/admin/offerings',{cache:'no-store'});
    const d=await r.json();
    if(d.ok){
      setData(d);
      const active=d.years.find(y=>y.is_active);
      setForm(f=>({...f,academicYearId:f.academicYearId||String(active?.id||'')}));
      setMessage('');
    } else setMessage(d.error);
  }
  useEffect(()=>{load();},[]);

  const selectedClass=useMemo(()=>data.classes.find(c=>String(c.id)===String(form.classId)),[data.classes,form.classId]);

  async function save(e){
    e.preventDefault();
    setMessage('Saving course offering…');
    const r=await fetch('/api/education/admin/offerings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});
    const d=await r.json();
    setMessage(d.ok?'Course offering saved.':d.error);
    if(d.ok){setForm(f=>({...f,courseId:'',classId:'',lecturerId:'',term:''}));load();}
  }

  const card={background:'#fff',border:'1px solid #dfeae5',borderRadius:20,padding:22};
  const field={width:'100%',padding:12,border:'1px solid #d7e5de',borderRadius:11,background:'#fff'};

  return <main style={{minHeight:'100vh',background:'#f5faf8',padding:24,fontFamily:'Arial,sans-serif',color:'#153126'}}>
    <section style={{maxWidth:1120,margin:'auto'}}>
      <Link href="/education/admin" style={{color:'#08744d',fontWeight:800,textDecoration:'none'}}>← Administrator dashboard</Link>
      <h1 style={{fontSize:36,marginBottom:8}}>Course Offerings</h1>
      <p style={{color:'#657d74',maxWidth:760}}>Create the teaching instance that connects a course to a class and academic year, with an optional term and lecturer.</p>
      <div style={{display:'grid',gridTemplateColumns:'minmax(300px,390px) 1fr',gap:18,alignItems:'start'}}>
        <form onSubmit={save} style={{...card,display:'grid',gap:12}}>
          <b>Create or update offering</b>
          <select required style={field} value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})}><option value="">Choose course</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}</select>
          <select required style={field} value={form.classId} onChange={e=>setForm({...form,classId:e.target.value})}><option value="">Choose class</option>{data.classes.map(c=><option key={c.id} value={c.id}>{c.name}{c.code?` — ${c.code}`:''}{c.level?` — ${c.level}`:''}</option>)}</select>
          <select required style={field} value={form.academicYearId} onChange={e=>setForm({...form,academicYearId:e.target.value})}><option value="">Choose academic year</option>{data.years.map(y=><option key={y.id} value={y.id}>{y.name}{y.is_active?' — Active':''}</option>)}</select>
          <input style={field} placeholder="Term / rotation e.g. Semester 1" value={form.term} onChange={e=>setForm({...form,term:e.target.value})}/>
          <select style={field} value={form.lecturerId} onChange={e=>setForm({...form,lecturerId:e.target.value})}><option value="">Lecturer can be assigned later</option>{data.lecturers.map(l=><option key={l.id} value={l.id}>{l.full_name} — {l.email}</option>)}</select>
          {selectedClass?.academic_year_id && form.academicYearId && String(selectedClass.academic_year_id)!==String(form.academicYearId) && <small style={{color:'#9a5a12'}}>This class is linked to a different academic year. You can still save, but review the class setup first.</small>}
          <button style={{background:'#08744d',color:'#fff',border:0,borderRadius:12,padding:13,fontWeight:800}}>Save course offering</button>
          {message&&<small>{message}</small>}
        </form>
        <section style={card}>
          <h2 style={{marginTop:0}}>Existing offerings</h2>
          {data.offerings.length?data.offerings.map(o=><article key={o.id} style={{padding:'14px 0',borderBottom:'1px solid #edf2ef'}}><b>{o.code} — {o.title}</b><div style={{color:'#70847c',fontSize:13,marginTop:5}}>{o.class_name}{o.class_code?` (${o.class_code})`:''} • {o.academic_year}{o.term?` • ${o.term}`:''}</div><div style={{color:'#08744d',fontSize:12,marginTop:5,fontWeight:700}}>{o.lecturer_name||'Lecturer not assigned'}</div></article>):<p style={{color:'#70847c'}}>{message||'No course offerings yet.'}</p>}
        </section>
      </div>
      <section style={{...card,marginTop:18}}><b>Next step</b><p style={{color:'#657d74',marginBottom:0}}>After creating an offering, use <Link href="/education/admin/assignments" style={{color:'#08744d',fontWeight:800}}>Enrolments & Teaching Assignments</Link> to add students or change the lecturer.</p></section>
    </section>
  </main>;
}
