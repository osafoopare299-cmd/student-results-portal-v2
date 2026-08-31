'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Bot, CheckCircle2, FileText, Search, Send, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './ai-tutor.module.css';

const approvedSources = [
  { course: 'Emergency Medicine', title: 'Shock & Resuscitation', type: 'PDF', status: 'Approved' },
  { course: 'Paediatrics', title: 'Paediatric Emergencies', type: 'PDF', status: 'Approved' },
  { course: 'Clinical Pharmacology', title: 'Emergency Drug Notes', type: 'Notes', status: 'Approved' },
];

const prompts = [
  'Explain the initial approach to shock.',
  'Summarise the emergency assessment of a sick child.',
  'What are the key drug safety checks before administration?',
];

export default function AITutor() {
  const [course, setCourse] = useState('All approved courses');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);

  const visibleSources = useMemo(() => course === 'All approved courses' ? approvedSources : approvedSources.filter(item => item.course === course), [course]);

  function ask(text) {
    const clean = (text || question).trim();
    if (!clean) return;
    setMessages(prev => [...prev, {
      q: clean,
      a: 'The grounded answer service is not connected yet. When enabled, this tutor will answer only from approved learning materials and will cite the exact source used. If the approved material does not contain the answer, it will say so explicitly.',
    }]);
    setQuestion('');
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <Link href="/education/student" className={styles.back}><ArrowLeft size={18}/> Student portal</Link>
        <span className={styles.eyebrow}>APPROVED-MATERIAL AI</span>
        <h1><Sparkles size={28}/> AI Tutor</h1>
        <p>Ask questions against lecturer-approved course materials only.</p>
      </div>
      <div className={styles.guard}><ShieldCheck size={20}/><span>Grounded answers only</span></div>
    </header>

    <section className={styles.grid}>
      <aside className={styles.sources}>
        <div className={styles.sectionTitle}><BookOpen size={19}/><div><b>Approved sources</b><small>{visibleSources.length} available</small></div></div>
        <label>Course scope
          <select value={course} onChange={e=>setCourse(e.target.value)}>
            <option>All approved courses</option>
            <option>Emergency Medicine</option>
            <option>Paediatrics</option>
            <option>Clinical Pharmacology</option>
          </select>
        </label>
        <div className={styles.sourceList}>{visibleSources.map(item => <article key={item.title}>
          <span className={styles.fileIcon}><FileText size={18}/></span>
          <div><strong>{item.title}</strong><small>{item.course} · {item.type}</small></div>
          <CheckCircle2 size={17}/>
        </article>)}</div>
        <div className={styles.rule}><ShieldCheck size={18}/><p><b>No unsupported answers.</b> The tutor must cite approved sources and decline when the course materials do not support a response.</p></div>
      </aside>

      <section className={styles.chat}>
        <div className={styles.chatHead}><Bot size={22}/><div><b>Dropare AI Tutor</b><small>Student learning assistant</small></div></div>
        <div className={styles.chatBody}>
          {messages.length === 0 ? <div className={styles.empty}>
            <span><Bot size={30}/></span><h2>Ask from your approved materials</h2><p>Select a course scope, then ask a question. Source citations will appear with every supported answer once the grounded AI service is connected.</p>
            <div className={styles.prompts}>{prompts.map(item => <button key={item} onClick={()=>ask(item)}><Search size={15}/>{item}</button>)}</div>
          </div> : messages.map((item,index)=><div className={styles.exchange} key={`${item.q}-${index}`}>
            <div className={styles.userBubble}><b>You</b><p>{item.q}</p></div>
            <div className={styles.aiBubble}><b><Bot size={16}/> AI Tutor</b><p>{item.a}</p><small><ShieldCheck size={14}/> No clinical or academic content was generated without a verified source.</small></div>
          </div>)}
        </div>
        <div className={styles.composer}>
          <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask a question from approved course materials…" rows={2}/>
          <button onClick={()=>ask()} aria-label="Ask AI Tutor"><Send size={19}/></button>
        </div>
      </section>
    </section>
  </main>;
}
