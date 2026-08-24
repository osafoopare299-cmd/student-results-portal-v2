'use client';

import { useEffect, useState } from 'react';
import { Archive, BarChart3, BookOpen, CheckCircle2, Download, Eye, EyeOff, FileSpreadsheet, FileText, GraduationCap, KeyRound, LoaderCircle, LogOut, Save, ShieldCheck, Upload, Users } from 'lucide-react';

const emptyResult = { studentId:'', email:'', fullName:'', examId:'', rawScore:'', maxScore:'', q1:'', q2:'', q3:'', dressing:'', delivery:'', composure:'' };

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [result, setResult] = useState(emptyResult);
  const [notice, setNotice] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('existing');
  const [newExamName, setNewExamName] = useState('');
  const [writtenMax, setWrittenMax] = useState('70');
  const [vivaEnabled, setVivaEnabled] = useState(true);
  const [additionalEnabled, setAdditionalEnabled] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState('');
  const activeExam = data?.exams?.find(x=>String(x.id)===String(selectedExamId)) || data?.exams?.[0] || null;

  async function load() {
    const res = await fetch('/api/admin/data', {cache:'no-store'});
    if (res.status === 401) { setAuthed(false); return; }
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Unable to load dashboard');
    setData(json); setAuthed(true);
  }

  useEffect(() => { load().catch(()=>{}); }, []);
  useEffect(() => {
    if (!selectedExamId && data?.exams?.[0]) setSelectedExamId(String(data.exams[0].id));
    if (selectedExamId && data?.exams && !data.exams.some(x=>String(x.id)===String(selectedExamId))) setSelectedExamId(data.exams[0] ? String(data.exams[0].id) : '');
  }, [data, selectedExamId]);
  useEffect(() => {
    if (!activeExam) return;
    setWrittenMax(String(activeExam.written_max || 70));
    setVivaEnabled(Boolean(activeExam.viva_enabled));
    setAdditionalEnabled(Boolean(activeExam.additional_enabled));
  }, [activeExam?.id]);

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
      const json=await res.json(); if(!res.ok) throw new Error(json.error); setNotice(json.emailsSent != null ? `Email alerts sent: ${json.emailsSent}. Failed: ${json.emailsFailed || 0}.` : 'Saved successfully.'); await load(); return true;
    } catch(e){setError(e.message);return false} finally{setLoading(false)}
  }

  async function logout(){await fetch('/api/admin/logout',{method:'POST'});setAuthed(false);setData(null)}

  async function importExcel() {
    if (!importFile) { setError('Choose an Excel file.'); return; }
    if (importMode === 'existing' && !activeExam?.id) { setError('Choose an active examination.'); return; }
    if (importMode === 'new' && !newExamName.trim()) { setError('Enter a name for the new examination.'); return; }
    setLoading(true); setError(''); setNotice('');
    try {
      const form = new FormData();
      form.append('examId', importMode === 'existing' ? activeExam.id : '');
      form.append('createNewExam', String(importMode === 'new'));
      form.append('newExamName', newExamName.trim());
      form.append('writtenMax', writtenMax);
      form.append('vivaEnabled', String(vivaEnabled));
      form.append('additionalEnabled', String(additionalEnabled));
      form.append('file', importFile);
      const res = await fetch('/api/admin/import', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to import the Excel file.');
      setNotice(json.message); setImportFile(null); setNewExamName(''); if (json.examId) setSelectedExamId(String(json.examId)); await load();
      const input = document.getElementById('excel-import'); if (input) input.value = '';
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  function selectStudent(value) {
    const [studentId, examId] = value.split(':');
    const student = data?.students?.find((item) => String(item.id) === studentId && String(item.exam_id) === examId);
    if (!student) { setResult(emptyResult); return; }
    setResult({
      ...emptyResult,
      studentId: String(student.id),
      email: student.email,
      fullName: student.full_name,
      examId: String(student.exam_id),
      rawScore: String(student.raw_score),
      maxScore: String(student.max_score),
    });
  }

  if (!authed) return <main className="adminLogin"><section className="adminLoginCard"><div className="seal"><ShieldCheck size={29}/></div><span className="eyebrow">ADMINISTRATION</span><h1>Results Control Centre</h1><p>Secure access for DR. OPARE.</p><form onSubmit={login}><label>Administrator password</label><div className="inputWrap"><KeyRound size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error&&<div className="error">{error}</div>}<button className="primary" disabled={loading}>{loading?<><LoaderCircle className="spin" size={18}/> Signing in…</>:<>Sign in</>}</button></form><a className="studentLink" href="/">← Student portal</a></section></main>;

  return <main className="adminShell">
    <header className="adminTop"><div className="adminBrand"><span><GraduationCap size={20}/></span><div><b>Academic Results</b><small>Administrator: DR. OPARE</small></div></div><button className="ghostBtn" onClick={logout}><LogOut size={17}/> Logout</button></header>
    <section className="adminHero"><div><span className="eyebrow">CONTROL CENTRE</span><h1>Results administration</h1><p>Manage assessments, enter marks and control publication.</p></div></section>
    {error&&<div className="banner bad">{error}</div>}{notice&&<div className="banner good">{notice}</div>}
    <section className="statGrid">
      <div><Users/><span>Students</span><b>{data?.stats?.students ?? 0}</b></div><div><BookOpen/><span>Exams</span><b>{data?.stats?.exams ?? 0}</b></div><div><CheckCircle2/><span>Complete</span><b>{data?.stats?.complete ?? 0}</b></div><div><BarChart3/><span>Published</span><b>{data?.stats?.published ?? 0}</b></div>
    </section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">WORKSPACE</span><h2>Working examination</h2></div><BookOpen size={20}/></div><div className="formGrid"><label>Select examination<select value={activeExam?.id || ''} onChange={e=>{setSelectedExamId(e.target.value);setResult(emptyResult)}}><option value="">Select exam</option>{data?.exams?.map(x=><option key={x.id} value={x.id}>{x.exam_name}{x.published?' — Published':' — Unpublished'}</option>)}</select></label></div></section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">STEP 1</span><h2>Import Microsoft Forms results</h2></div><FileSpreadsheet size={20}/></div><p className="muted">Set the written maximum and select only the components used. The final result will be converted to a percentage.</p><div className="formGrid"><label>Import destination<select value={importMode} onChange={e=>setImportMode(e.target.value)}><option value="existing">Update selected examination</option><option value="new">Import as a new examination</option></select></label>{importMode==='new'&&<label>New examination name<input value={newExamName} onChange={e=>setNewExamName(e.target.value)} placeholder="e.g. Second Rotation Examination"/></label>}<label>Written examination maximum<input type="number" min="1" step="0.01" value={writtenMax} onChange={e=>setWrittenMax(e.target.value)}/></label><label className="checkLabel"><input type="checkbox" checked={vivaEnabled} onChange={e=>setVivaEnabled(e.target.checked)}/> Include viva marks (/30)</label><label className="checkLabel"><input type="checkbox" checked={additionalEnabled} onChange={e=>setAdditionalEnabled(e.target.checked)}/> Include additional marks (/5)</label><label>Microsoft Forms Excel file<input id="excel-import" type="file" accept=".xlsx,.xls" onChange={e=>setImportFile(e.target.files?.[0]||null)}/></label></div><div className="examActions"><button className="adminAction" disabled={loading||!activeExam?.id||!writtenMax} onClick={()=>save({action:'update_exam_settings',examId:activeExam.id,writtenMax,vivaEnabled,additionalEnabled})}><Save size={17}/> Save examination settings</button><button className="adminAction" disabled={loading||!importFile||!writtenMax||(importMode==='existing'&&!activeExam?.id)||(importMode==='new'&&!newExamName.trim())} onClick={importExcel}>{loading?<><LoaderCircle className="spin" size={17}/> Importing…</>:<><Upload size={17}/> Import into Neon</>}</button></div></section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">STEP 2</span><h2>{activeExam?.viva_enabled||activeExam?.additional_enabled?'Add required assessment marks':'Written examination only'}</h2></div><Save size={20}/></div><div className="formGrid resultEntry"><label>Choose student<select value={result.studentId&&result.examId?`${result.studentId}:${result.examId}`:''} onChange={e=>selectStudent(e.target.value)}><option value="">Select an imported student</option>{data?.students?.filter(x=>String(x.exam_id)===String(activeExam?.id)).map(x=><option key={`${x.id}-${x.exam_id}`} value={`${x.id}:${x.exam_id}`}>{x.full_name}</option>)}</select></label><label>Student email<input type="email" value={result.email} readOnly/></label><label>Full name<input value={result.fullName} readOnly/></label><label>Examination<input value={data?.exams?.find(x=>String(x.id)===String(result.examId))?.exam_name||''} readOnly/></label><label>Written score /{result.maxScore||activeExam?.written_max}<input type="number" value={result.rawScore} readOnly/></label>{activeExam?.viva_enabled&&<><label>Viva Q1 /10<input type="number" min="0" max="10" step="0.01" value={result.q1} onChange={e=>setResult({...result,q1:e.target.value})}/></label><label>Viva Q2 /10<input type="number" min="0" max="10" step="0.01" value={result.q2} onChange={e=>setResult({...result,q2:e.target.value})}/></label><label>Viva Q3 /10<input type="number" min="0" max="10" step="0.01" value={result.q3} onChange={e=>setResult({...result,q3:e.target.value})}/></label></>}{activeExam?.additional_enabled&&<><label>Dressing /1<input type="number" min="0" max="1" step="0.01" value={result.dressing} onChange={e=>setResult({...result,dressing:e.target.value})}/></label><label>Delivery /2<input type="number" min="0" max="2" step="0.01" value={result.delivery} onChange={e=>setResult({...result,delivery:e.target.value})}/></label><label>Composure /2<input type="number" min="0" max="2" step="0.01" value={result.composure} onChange={e=>setResult({...result,composure:e.target.value})}/></label></>}</div><button className="adminAction" disabled={loading||!result.studentId} onClick={async()=>{if(await save({action:'save_result',...result})){setResult(emptyResult)}}}>{loading?<><LoaderCircle className="spin" size={17}/> Saving…</>:<><Save size={17}/> Save result</>}</button></section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">STEP 3</span><h2>Publish, export or archive examination</h2></div><Eye size={20}/></div><div className="examList">{activeExam?<div className="examRow"><div><b>{activeExam.exam_name}</b><span>{activeExam.subject||'No subject'} · {activeExam.written_count} written · {activeExam.viva_count} viva · {activeExam.additional_count} additional</span></div><div className="examActions"><button className={activeExam.published?'publish on':'publish'} onClick={()=>save({action:'publish_exam',examId:activeExam.id,published:!activeExam.published})}>{activeExam.published?<><Eye size={16}/> Published</>:<><EyeOff size={16}/> Unpublished</>}</button>{activeExam.published&&<><button className="publish on" disabled={loading} onClick={()=>save({action:'send_result_alerts',examId:activeExam.id,alertId:crypto.randomUUID()})}><Upload size={16}/> Send email alerts</button><button className="publish on" onClick={()=>window.location.href=`/api/admin/export?examId=${activeExam.id}`}><Download size={16}/> Download Excel</button><button className="publish on" onClick={()=>window.location.href=`/api/admin/export-pdf?examId=${activeExam.id}`}><FileText size={16}/> Download PDF</button></>}<button className="publish" onClick={async()=>{if(window.confirm(`Archive ${activeExam.exam_name}? Students will no longer see it, but its data will be preserved.`)) await save({action:'archive_exam',examId:activeExam.id})}}><Archive size={16}/> Archive</button></div></div>:<p className="muted">No active examination is available.</p>}</div></section>

    <section className="adminCard"><div className="adminCardHead"><div><span className="eyebrow">REVIEW</span><h2>{activeExam?.exam_name || 'Selected examination'} results</h2></div></div><div className="tableWrap"><table><thead><tr><th>Student</th><th>Exam</th><th>Written</th><th>Viva</th><th>Additional</th><th>Total</th><th>Percentage</th><th>Status</th></tr></thead><tbody>{data?.recent?.filter(r=>String(r.exam_id)===String(activeExam?.id)).map((r,i)=><tr key={i}><td><b>{r.full_name}</b><small>{r.email}</small></td><td>{r.exam_name}</td><td>{Number(r.written_raw||0).toFixed(1)}/{Number(r.written_max)}</td><td>{!r.viva_enabled?'N/A':r.viva_total==null?'—':`${Number(r.viva_total).toFixed(1)}/30`}</td><td>{!r.additional_enabled?'N/A':r.additional_total==null?'—':`${Number(r.additional_total).toFixed(1)}/5`}</td><td>{r.total_score==null?'—':`${Number(r.total_score).toFixed(1)}/${Number(r.total_max).toFixed(1)}`}</td><td>{r.overall_percentage==null?'—':`${Number(r.overall_percentage).toFixed(1)}%`}</td><td><span className={`pill ${r.completion_status==='COMPLETE'?'ok':'wait'}`}>{r.completion_status}</span></td></tr>)}</tbody></table></div></section>
    <style jsx global>{`.checkLabel{display:flex!important;align-items:center;gap:10px;min-height:46px;padding:0 12px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#081725}.checkLabel input{width:18px!important;height:18px!important;margin:0}.examActions{display:flex;gap:10px;flex-wrap:wrap}`}</style>
  </main>;
}
