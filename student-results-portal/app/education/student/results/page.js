'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Award, BarChart3, BookOpenCheck, ChevronRight, CircleAlert, GraduationCap, LoaderCircle, LockKeyhole, Mail, MessageCircleWarning, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import styles from './results.module.css';

function Metric({ label, value, max, accent=false }) {
  const pct=max?Math.max(0,Math.min(100,(Number(value||0)/Number(max))*100)):0;
  return <div className={`${styles.metric} ${accent?styles.accent:''}`}><div className={styles.metricTop}><span>{label}</span><strong>{Number(value||0).toFixed(1)}<small>/{max}</small></strong></div><div className={styles.track}><span style={{width:`${pct}%`}}/></div></div>;
}

function ResultCard({ result }) {
  const percent=Number(result.overallPercent||0);
  const displayStatus=result.status||(Number(result.finalAssessment)>=50?'PASS':'REVIEW');
  return <article className={styles.resultCard}>
    <div className={styles.resultHead}><div><span className={styles.eyebrow}>PUBLISHED RESULT</span><h2>{result.examName}</h2></div><span className={`${styles.status} ${displayStatus==='PASS'?styles.pass:styles.review}`}>{displayStatus}</span></div>
    <div className={styles.heroScore}><div className={styles.scoreRing} style={{'--score':`${Math.min(percent,100)*3.6}deg`}}><div><strong>{percent.toFixed(1)}%</strong><span>Overall</span></div></div><div className={styles.scoreCopy}><span>Overall score</span><strong>{Number(result.overall||0).toFixed(1)} <small>/ {Number(result.overallMax||0).toFixed(1)}</small></strong>{result.grade&&<p>Grade <b>{result.grade}</b></p>}</div></div>
    <section className={styles.section}><div className={styles.sectionTitle}><BookOpenCheck size={18}/><span>Core Assessment</span></div><Metric label="Written Examination" value={result.written} max={result.writtenMax}/>{result.vivaEnabled&&<Metric label="Viva" value={result.viva} max={30}/>}<Metric label="Percentage" value={result.finalAssessment} max={100} accent/></section>
    {result.additionalEnabled&&<section className={`${styles.section} ${styles.compact}`}><div className={styles.sectionTitle}><Sparkles size={18}/><span>Additional Marks</span><b>{Number(result.additional||0).toFixed(1)}/5</b></div><div className={styles.miniGrid}><div><span>Dressing</span><b>{Number(result.dressing||0).toFixed(1)}/1</b></div><div><span>Delivery</span><b>{Number(result.delivery||0).toFixed(1)}/2</b></div><div><span>Composure</span><b>{Number(result.composure||0).toFixed(1)}/2</b></div></div></section>}
    <button className={styles.complaint} onClick={()=>window.location.href=`mailto:?subject=Result%20Complaint%20-%20${encodeURIComponent(result.examName)}&body=Please%20review%20my%20result%20for%20${encodeURIComponent(result.examName)}.`}><MessageCircleWarning size={18}/><span>Report a result concern</span><ChevronRight size={18}/></button>
  </article>;
}

export default function EducationResults(){
  const [email,setEmail]=useState('');const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [results,setResults]=useState(null);
  const student=useMemo(()=>results?.[0]||null,[results]);
  async function submit(e){e.preventDefault();setError('');setLoading(true);try{const res=await fetch('/api/results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Unable to retrieve result.');setResults(data.results);}catch(err){setError(err.message);}finally{setLoading(false);}}
  return <main className={styles.page}>
    <header className={styles.top}><Link href="/education/student" className={styles.back}><ArrowLeft size={19}/> Dashboard</Link><div className={styles.brand}><GraduationCap size={21}/><b>Dropare Education</b></div><span className={styles.secure}><ShieldCheck size={18}/> Secure</span></header>
    {!results?<section className={styles.lookup}><div className={styles.lookupIcon}><BarChart3 size={30}/></div><span className={styles.eyebrow}>STUDENT RESULTS</span><h1>Published academic results</h1><p>Until education authentication is connected, enter the same registered examination email used in the existing Results Portal.</p><form onSubmit={submit}><label htmlFor="edu-result-email">Registered email</label><div className={styles.inputWrap}><Mail size={19}/><input id="edu-result-email" type="email" inputMode="email" autoComplete="email" placeholder="student@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/></div>{error&&<div className={styles.error}><CircleAlert size={17}/><span>{error}</span></div>}<button className={styles.primary} disabled={loading}>{loading?<><LoaderCircle className={styles.spin} size={19}/>Checking results…</>:<>View published results <ChevronRight size={19}/></>}</button></form><div className={styles.trust}><LockKeyhole size={17}/><p>This route reuses the existing published-results API. It does not expose unpublished or other students' results.</p></div></section>:
    <section className={styles.resultsArea}><div className={styles.studentHero}><div className={styles.avatar}><UserRoundCheck size={27}/></div><div><span>Student</span><h1>{student?.fullName}</h1><p>{email}</p></div><button onClick={()=>{setResults(null);setEmail('')}}>Change email</button></div><div className={styles.summary}><article><span>Published assessments</span><strong>{results.length}</strong></article><article><span>Latest grade</span><strong>{student?.grade||'—'}</strong></article><article><span>Latest percentage</span><strong>{Number(student?.overallPercent||0).toFixed(1)}%</strong></article></div><div className={styles.resultsList}>{results.map((result,i)=><ResultCard key={`${result.examName}-${i}`} result={result}/>)}</div><div className={styles.notice}><Award size={18}/><span>Results remain controlled by the existing publication workflow and automatic email system.</span></div></section>}
  </main>;
}
