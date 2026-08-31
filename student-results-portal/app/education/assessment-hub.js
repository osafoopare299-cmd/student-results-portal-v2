'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft, CheckCircle2, ChevronRight, CircleDot, ClipboardCheck,
  Clock3, FilePenLine, GraduationCap, Stethoscope, TimerReset
} from 'lucide-react';
import styles from './assessment.module.css';

const assessments = [
  {title:'Emergency Medicine Quiz',course:'EMD301',type:'MCQ',due:'Tue 4:00 PM',questions:'20 questions',status:'Open'},
  {title:'Paediatrics Case Review',course:'PAE301',type:'Written',due:'Fri 6:00 PM',questions:'Case response',status:'Open'},
  {title:'Clinical Skills Station',course:'MED305',type:'OSCE',due:'Sep 08',questions:'4 stations',status:'Scheduled'},
  {title:'Surgical Viva',course:'SUR302',type:'Viva',due:'Sep 12',questions:'3 questions',status:'Scheduled'},
  {title:'Drug Calculation Practical',course:'PHM303',type:'Practical',due:'Sep 15',questions:'Practical',status:'Scheduled'},
];

export default function AssessmentHub({mode='student'}) {
  const [filter,setFilter]=useState('All');
  const shown=filter==='All'?assessments:assessments.filter(x=>x.type===filter);
  const lecturer=mode==='lecturer';
  return <main className={styles.page}>
    <header className={styles.topbar}><Link href={lecturer?'/education/lecturer':'/education/student'}><ArrowLeft size={18}/> Dashboard</Link><div><ClipboardCheck size={19}/><b>Assessment Hub</b></div><span>Preview</span></header>
    <div className={styles.inner}>
      <section className={styles.hero}><div><small>DROPARE EDUCATION</small><h1>{lecturer?'Assessment Management':'Assessments'}</h1><p>{lecturer?'Create, schedule and review academic assessments for assigned courses.':'View your active MCQs, written tests, viva/OSCE and practical assessments.'}</p></div><div className={styles.heroCard}><GraduationCap size={22}/><span>{lecturer?'Draft assessments':'Open assessments'}</span><strong>{lecturer?'2':'2'}</strong></div></section>
      <section className={styles.filters}>{['All','MCQ','Written','OSCE','Viva','Practical'].map(item=><button key={item} className={filter===item?styles.active:''} onClick={()=>setFilter(item)}>{item}</button>)}</section>
      <section className={styles.grid}>
        {shown.map(item=><article key={item.title}>
          <div className={styles.cardTop}><span className={styles.type}>{item.type}</span><span className={item.status==='Open'?styles.open:styles.scheduled}>{item.status}</span></div>
          <h2>{item.title}</h2><p>{item.course}</p>
          <div className={styles.meta}><span><Clock3 size={15}/>{item.due}</span><span><CircleDot size={15}/>{item.questions}</span></div>
          <button>{lecturer?'Manage assessment':item.status==='Open'?'Open assessment':'View details'}<ChevronRight size={17}/></button>
        </article>)}
      </section>
      <section className={styles.summary}>
        <div><FilePenLine size={19}/><span><b>Written + MCQ</b><small>Supports configurable maximum scores and percentage normalization.</small></span></div>
        <div><Stethoscope size={19}/><span><b>Viva / OSCE / Practical</b><small>Structured sections can be optional per examination.</small></span></div>
        <div><TimerReset size={19}/><span><b>Publication workflow</b><small>Draft marks remain private until explicitly published.</small></span></div>
      </section>
      <section className={styles.note}><CheckCircle2 size={19}/><p><b>Existing result engine preserved.</b> This assessment layer is being designed around the current written/viva/additional-marks workflow while allowing future assessments to omit sections or use different score maxima.</p></section>
    </div>
  </main>;
}
