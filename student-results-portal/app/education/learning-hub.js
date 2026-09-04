'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeft, Bell, BookOpen, CheckCircle2, ChevronRight, Clock3,
  Download, FileText, GraduationCap, Search, Sparkles, Video
} from 'lucide-react';
import styles from './learning.module.css';

const courses = [
  {code:'EMD301',title:'Emergency Medicine',lecturer:'Clinical Faculty',progress:68,materials:14,offline:5,tag:'Rotation'},
  {code:'PAE301',title:'Paediatrics',lecturer:'Paediatrics Unit',progress:54,materials:18,offline:3,tag:'Core'},
  {code:'MED305',title:'Internal Medicine',lecturer:'Medical Unit',progress:42,materials:21,offline:2,tag:'Core'},
  {code:'PHM303',title:'Clinical Pharmacology',lecturer:'Pharmacology Unit',progress:76,materials:12,offline:4,tag:'Core'},
  {code:'SUR302',title:'Surgery',lecturer:'Surgical Unit',progress:31,materials:16,offline:1,tag:'Rotation'},
  {code:'OBS304',title:'Obstetrics & Gynaecology',lecturer:'O&G Unit',progress:47,materials:15,offline:2,tag:'Rotation'},
];

const recentMaterials = [
  {type:'PDF',title:'Shock and initial resuscitation',course:'Emergency Medicine',meta:'18 pages · Updated today',Icon:FileText},
  {type:'VIDEO',title:'Approach to the acutely ill child',course:'Paediatrics',meta:'24 min · Approved video',Icon:Video},
  {type:'NOTE',title:'Antibiotic selection principles',course:'Clinical Pharmacology',meta:'Study note · 8 min read',Icon:BookOpen},
];

export default function LearningHub({ mode='student' }) {
  const [query,setQuery]=useState('');
  const [offlineOnly,setOfflineOnly]=useState(false);
  const filtered=useMemo(()=>courses.filter(c=>{
    const hit=`${c.code} ${c.title}`.toLowerCase().includes(query.trim().toLowerCase());
    return hit && (!offlineOnly || c.offline>0);
  }),[query,offlineOnly]);

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link className={styles.back} href={mode==='lecturer'?'/education/lecturer':'/education/student'}><ArrowLeft size={19}/> Dashboard</Link>
      <div className={styles.brand}><GraduationCap size={19}/><b>Dropare Learning Hub</b></div>
      <span className={styles.preview}>Preview</span>
    </header>

    <div className={styles.inner}>
      <section className={styles.hero}>
        <div><span className={styles.eyebrow}>{mode==='lecturer'?'LECTURER LEARNING MANAGEMENT':'YOUR LEARNING'}</span><h1>{mode==='lecturer'?'Course Materials':'Learning Hub'}</h1><p>{mode==='lecturer'?'Prepare and manage approved learning resources for assigned courses.':'Access your notes, PDFs, approved videos, assignments and offline study resources.'}</p></div>
        <div className={styles.heroStat}><Sparkles size={22}/><span>Approved resources</span><strong>96</strong></div>
      </section>

      <section className={styles.toolbar}>
        <label className={styles.search}><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search courses or course codes"/></label>
        <button className={offlineOnly?styles.filterOn:styles.filter} onClick={()=>setOfflineOnly(v=>!v)}><Download size={17}/> Offline available</button>
      </section>

      <section className={styles.heading}><div><span className={styles.eyebrow}>COURSES</span><h2>{mode==='lecturer'?'Assigned courses':'My courses'}</h2></div><span>{filtered.length} courses</span></section>
      <section className={styles.courseGrid}>
        {filtered.map(course=><article className={styles.courseCard} key={course.code}>
          <div className={styles.courseTop}><span className={styles.courseCode}>{course.code}</span><span className={styles.tag}>{course.tag}</span></div>
          <h3>{course.title}</h3><p>{course.lecturer}</p>
          <div className={styles.progress}><span><i style={{width:`${course.progress}%`}}/></span><small>{course.progress}% study progress</small></div>
          <div className={styles.courseMeta}><span><FileText size={15}/>{course.materials} resources</span><span><Download size={15}/>{course.offline} offline</span></div>
          <button>{mode==='lecturer'?'Manage materials':'Open course'}<ChevronRight size={17}/></button>
        </article>)}
      </section>

      <section className={styles.split}>
        <article className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>RECENT</span><h2>{mode==='lecturer'?'Recently published':'Continue learning'}</h2></div><BookOpen size={20}/></div>
          <div className={styles.materialList}>{recentMaterials.map(({type,title,course,meta,Icon})=><button key={title}><span className={styles.materialIcon}><Icon size={19}/></span><span><b>{title}</b><small>{course} · {meta}</small></span><em>{type}</em></button>)}</div>
        </article>
        <article className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>{mode==='lecturer'?'COURSE ACTIVITY':'UP NEXT'}</span><h2>{mode==='lecturer'?'Publishing status':'Assignments & notices'}</h2></div><Bell size={20}/></div>
          <div className={styles.noticeList}>
            <div><span><Clock3 size={17}/></span><p><b>Emergency Medicine Quiz</b><small>{mode==='lecturer'?'Draft assessment linked to course':'Due Tuesday · 20 MCQs'}</small></p></div>
            <div><span><FileText size={17}/></span><p><b>Paediatrics case write-up</b><small>{mode==='lecturer'?'Submission window configured':'Due Friday · Upload PDF'}</small></p></div>
            <div><span><CheckCircle2 size={17}/></span><p><b>New rotation announcement</b><small>{mode==='lecturer'?'Published to enrolled students':'Emergency rotation group updated'}</small></p></div>
          </div>
        </article>
      </section>

      <section className={styles.note}><CheckCircle2 size={19}/><div><b>Database-ready learning model</b><p>These preview records will be replaced by authorized course offerings and learning materials once the safe Neon development migration is available. The route and interaction model are ready now.</p></div></section>
    </div>
  </main>;
}
