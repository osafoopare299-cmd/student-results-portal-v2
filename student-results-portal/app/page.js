'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft, Award, BookOpenCheck, ChevronRight, CircleAlert,
  GraduationCap, LoaderCircle, LockKeyhole, Mail, MessageCircleWarning,
  ShieldCheck, Sparkles, UserRoundCheck
} from 'lucide-react';

function Metric({ label, value, max, accent = false }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <div className="metricTop"><span>{label}</span><strong>{Number(value).toFixed(1)}<small>/{max}</small></strong></div>
      <div className="track"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function ResultCard({ result, index }) {
  const percent = Number(result.overallPercent || 0);
  const displayStatus = result.status || (result.finalAssessment >= 50 ? 'PASS' : 'REVIEW');
  return (
    <article className="resultCard" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="resultHead">
        <div>
          <span className="eyebrow">ASSESSMENT RESULT</span>
          <h2>{result.examName}</h2>
        </div>
        <span className={`status ${displayStatus.toLowerCase()}`}>{displayStatus}</span>
      </div>

      <div className="heroScore">
        <div className="scoreRing" style={{ '--score': `${Math.min(percent,100) * 3.6}deg` }}>
          <div><strong>{percent.toFixed(1)}%</strong><span>Overall</span></div>
        </div>
        <div className="scoreCopy">
          <span>Overall score</span>
          <strong>{Number(result.overall).toFixed(1)} <small>/ 105</small></strong>
          {result.grade && <p>Grade <b>{result.grade}</b></p>}
        </div>
      </div>

      <section className="section">
        <div className="sectionTitle"><BookOpenCheck size={18}/><span>Core Assessment</span></div>
        <Metric label="Written Examination" value={result.written} max={70}/>
        <Metric label="Viva" value={result.viva} max={30}/>
        <Metric label="Final Assessment" value={result.finalAssessment} max={100} accent/>
      </section>

      <section className="section compact">
        <div className="sectionTitle"><Sparkles size={18}/><span>Additional Marks</span><b>{Number(result.additional).toFixed(1)}/5</b></div>
        <div className="miniGrid">
          <div><span>Dressing</span><b>{Number(result.dressing).toFixed(1)}/1</b></div>
          <div><span>Delivery</span><b>{Number(result.delivery).toFixed(1)}/2</b></div>
          <div><span>Composure</span><b>{Number(result.composure).toFixed(1)}/2</b></div>
        </div>
      </section>

      <button className="complaint" onClick={() => window.location.href = `mailto:?subject=Result%20Complaint%20-%20${encodeURIComponent(result.examName)}&body=Please%20review%20my%20result%20for%20${encodeURIComponent(result.examName)}.`}>
        <MessageCircleWarning size={18}/><span>Report a result concern</span><ChevronRight size={18}/>
      </button>
    </article>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const student = useMemo(() => results?.[0] || null, [results]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/results', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to retrieve result.');
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  if (results) {
    return (
      <main className="appShell">
        <header className="mobileHeader">
          <button className="iconBtn" onClick={() => { setResults(null); setEmail(''); }} aria-label="Back"><ArrowLeft size={20}/></button>
          <div className="brandMini"><span className="brandIcon"><GraduationCap size={20}/></span><b>Results Portal</b></div>
          <span className="secureDot" title="Secure session"><ShieldCheck size={20}/></span>
        </header>

        <section className="studentHero">
          <div className="avatar"><UserRoundCheck size={28}/></div>
          <div><span>Welcome</span><h1>{student.fullName}</h1><p>{email}</p></div>
        </section>

        <div className="resultsList">{results.map((result, i) => <ResultCard key={`${result.examName}-${i}`} result={result} index={i}/>)}</div>
        <footer>Results are confidential and intended only for the registered student.</footer>
      </main>
    );
  }

  return (
    <main className="loginPage">
      <div className="ambient one"/><div className="ambient two"/>
      <section className="loginCard">
        <div className="seal"><GraduationCap size={30}/></div>
        <div className="intro">
          <span className="eyebrow">SECURE STUDENT ACCESS</span>
          <h1>Your results.<br/><em>Private & instant.</em></h1>
          <p>Enter the email address registered for your examination to view your published results.</p>
        </div>

        <form onSubmit={submit}>
          <label htmlFor="email">Registered email</label>
          <div className="inputWrap"><Mail size={19}/><input id="email" type="email" inputMode="email" autoComplete="email" placeholder="student@example.com" value={email} onChange={e => setEmail(e.target.value)} required/></div>
          {error && <div className="error"><CircleAlert size={17}/><span>{error}</span></div>}
          <button className="primary" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={19}/> Checking result…</> : <>View my results <ChevronRight size={19}/></>}</button>
        </form>

        <div className="trust"><LockKeyhole size={17}/><p>Your email is used only to find your individual result. Other students' records are never displayed.</p></div>
        <div className="admin"><Award size={17}/><span>Academic Results System</span><b>Administrator: DR. OPARE</b></div>
      </section>
    </main>
  );
}
