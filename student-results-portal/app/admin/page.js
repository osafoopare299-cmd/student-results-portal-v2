'use client';

import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, CheckCircle2, Eye, EyeOff, GraduationCap, KeyRound, LoaderCircle, LogOut, Plus, Save, ShieldCheck, Users } from 'lucide-react';

const emptyResult = { email:'', fullName:'', examId:'', rawScore:'', maxScore:'', q1:'', q2:'', q3:'', dressing:'', delivery:'', composure:'' };

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [exam, setExam] = useState({examName:'',subject:'',examDate:''});
  const [result, setResult] = useState(emptyResult);
  const [notice, setNotice] = useState('');

  async function load() {
    const res = await fetch('/api/admin/data', {cache:'no-store'});
    if (res.status === 401) { setAuthed(false); return; }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Unable to load dashboard');
    setData(json); setAuthed(true);
  }

  useEffect(() => { load().catch(()=>{}); }, []);

  async function login(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const json=await res.json(); if(!res.ok) throw new Error(json.error); await load(); setPassword('');
    } catch(e){setError(e.message)} finally{setLoading(false)}
  }

  async function save(payload) {
    setLoading(true); setError(''); setNotice('');
    try {
      const res=await fetch('/api/admin/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const json=await res.json(); if(!res.ok) throw new Error(json.error); setNotice('Saved successfully.'); await load(); return true;
    } catch(e){setError(e.message);return false} finally{setLoading(false)}
  }

  async function logout(){await fetch('/api/admin/logout',{method:'POST'});setAuthed(false);setData(null)}

  if (!authed) return <main className="adminLogin"><section className="adminLoginCard"><div className="seal"><ShieldCheck size={29}/></div><span className="eyebrow">ADMINISTRATION</span><h1>Results Control Centre</h1><p>Secure access for DR. OPARE.</p><form onSubmit={login}><label>Administrator password</label><div className="inputWrap"><KeyRound size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<div className="error">{error}</div>}<button className="primary" disabled={loading}>{loading?<><LoaderCircle className="spin" size={18}/> Signing in…</>:<>Sign in</>}</button></form><a className="studentLink" href="/">← Student portal</a></section></main>;

  return <main className="adminShell">
    <header className="adminTop"><div className="adminBrand"><span><GraduationCap size={20}/></span><div><b>Academic Results</b><small>Administrator: DR. OPARE</small></div></div><button className="ghostBtn" onClick={logout}><LogOut size={17}/> Logout</button></header>
    <section className="adminHero"><div><span className="eyebrow">CONTROL CENTRE</span><h1>Results administration</h1><p>Manage assessments, enter marks and control publication.</p></div></section>
    {error&&<div className="banner bad">{error}</div>}{notice&&<div className="banner good">{notice}</div>}
    <section className="statGrid">
      <div><Users/><span>Students</span><b>{data?.stats?.students ?? 0}</b></div><div><BookOpen/><span>Exams</span><b>{data?.stats?.exams ?? 0}</b></div><div><CheckCircle2/><span>Complete</span><b>{data?.stats?.complete ?? 0}</b></div><div><BarChart3/><span>Published</span><b>{data?.stats?.published ?? 0}</b></div>
    </section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">STEP 1</span><h2>Create examination</h2></div><Plus size={20}/></div><div className="formGrid"><label>Exam name<input value={exam.examName} onChange={e=>setExam({...exam,examName:e.target.value})}/></label><label>Subject<input value={exam.subject} onChange={e=>setExam({...exam,subject:e.target.value})}/></label><label>Exam date<input type="date" value={exam.examDate} onChange={e=>setExam({...exam,examDate:e.target.value})}/></label></div><button className="adminAction" onClick={async()=>{if(await save({action:'create_exam',...exam})){setExam({examName:'',subject:'',examDate:''})}}}><Plus size={17}/> Create exam</button></section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">STEP 2</span><h2>Enter student result</h2></div><Save size={20}/></div><div className="formGrid resultEntry"><label>Student email<input type="email" value={result.email} onChange={e=>setResult({...result,email:e.target.value})}/></label><label>Full name<input value={result.fullName} onChange={e=>setResult({...result,fullName:e.target.value})}/></label><label>Examination<select value={result.examId} onChange={e=>setResult({...result,examId:e.target.value})}><option value="">Select exam</option>{data?.exams?.map(x=><option key={x.id} value={x.id}>{x.exam_name}</option>)}</select></label><label>Written raw score<input type="number" step="0.01" value={result.rawScore} onChange={e=>setResult({...result,rawScore:e.target.value})}/></label><label>Written max score<input type="number" step="0.01" value={result.maxScore} onChange={e=>setResult({...result,maxScore:e.target.value})}/></label><label>Viva Q1 /10<input type="number" max="10" step="0.01" value={result.q1} onChange={e=>setResult({...result,q1:e.target.value})}/></label><label>Viva Q2 /10<input type="number" max="10" step="0.01" value={result.q2} onChange={e=>setResult({...result,q2:e.target.value})}/></label><label>Viva Q3 /10<input type="number" max="10" step="0.01" value={result.q3} onChange={e=>setResult({...result,q3:e.target.value})}/></label><label>Dressing /1<input type="number" max="1" step="0.01" value={result.dressing} onChange={e=>setResult({...result,dressing:e.target.value})}/></label><label>Delivery /2<input type="number" max="2" step="0.01" value={result.delivery} onChange={e=>setResult({...result,delivery:e.target.value})}/></label><label>Composure /2<input type="number" max="2" step="0.01" value={result.composure} onChange={e=>setResult({...result,composure:e.target.value})}/></label></div><button className="adminAction" onClick={async()=>{if(await save({action:'save_result',...result})){setResult(emptyResult)}}}><Save size={17}/> Save complete result</button></section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">STEP 3</span><h2>Publish examinations</h2></div><Eye size={20}/></div><div className="examList">{data?.exams?.length?data.exams.map(x=><div className="examRow" key={x.id}><div><b>{x.exam_name}</b><span>{x.subject||'No subject'} · {x.written_count} written · {x.viva_count} viva · {x.additional_count} additional</span></div><button className={x.published?'publish on':'publish'} onClick={()=>save({action:'publish_exam',examId:x.id,published:!x.published})}>{x.published?<><Eye size={16}/> Published</>:<><EyeOff size={16}/> Unpublished</>}</button></div>):<p className="muted">Create an exam first.</p>}</div></section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">REVIEW</span><h2>Recent results</h2></div></div><div className="tableWrap"><table><thead><tr><th>Student</th><th>Exam</th><th>Written</th><th>Viva</th><th>Additional</th><th>Overall</th><th>Status</th></tr></thead><tbody>{data?.recent?.map((r,i)=><tr key={i}><td><b>{r.full_name}</b><small>{r.email}</small></td><td>{r.exam_name}</td><td>{Number(r.written_weighted||0).toFixed(1)}/70</td><td>{r.viva_total==null?'—':`${Number(r.viva_total).toFixed(1)}/30`}</td><td>{r.additional_total==null?'—':`${Number(r.additional_total).toFixed(1)}/5`}</td><td>{r.overall_score_105==null?'—':`${Number(r.overall_score_105).toFixed(1)}/105`}</td><td><span className={`pill ${r.completion_status==='COMPLETE'?'ok':'wait'}`}>{r.completion_status}</span></td></tr>)}</tbody></table></div></section>
  </main>;
}
