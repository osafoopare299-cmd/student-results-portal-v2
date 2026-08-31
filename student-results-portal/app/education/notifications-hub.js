'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bell, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, MailCheck, Megaphone, Search, Send, ShieldCheck } from 'lucide-react';
import styles from './notifications.module.css';

const studentItems=[
  {type:'Result',title:'Emergency Medicine result published',copy:'Your published assessment result is ready to view.',time:'Today · 18:40',icon:CheckCircle2,href:'/education/student/results'},
  {type:'Assignment',title:'Paediatrics case write-up due soon',copy:'Submission closes Tuesday at 17:00.',time:'Today · 14:15',icon:ClipboardCheck,href:'/education/student/assess'},
  {type:'Announcement',title:'Clinical rotation venue updated',copy:'Tomorrow’s ward rotation starts at the Children’s Emergency Unit.',time:'Yesterday · 20:10',icon:Megaphone,href:'/education/student/timetable'},
  {type:'Learning',title:'New shock resuscitation notes added',copy:'A new approved PDF is available in Emergency Medicine.',time:'Yesterday · 16:30',icon:BookOpen,href:'/education/student/learn'},
];

const lecturerItems=[
  {type:'Assessment',title:'Emergency Medicine Quiz',copy:'24 submissions received; marking can begin.',time:'Today · 17:45',icon:ClipboardCheck},
  {type:'Attendance',title:'Paediatrics attendance session saved',copy:'42 students were recorded for today’s rotation.',time:'Today · 12:20',icon:CheckCircle2},
  {type:'System',title:'Publication email delivery complete',copy:'Result notification batch completed successfully.',time:'Yesterday · 19:05',icon:MailCheck},
];

export default function NotificationsHub({role='student'}){
  const [query,setQuery]=useState('');
  const [draft,setDraft]=useState({title:'',message:'',audience:'Assigned class'});
  const items=role==='lecturer'?lecturerItems:studentItems;
  const filtered=useMemo(()=>items.filter(x=>`${x.type} ${x.title} ${x.copy}`.toLowerCase().includes(query.toLowerCase())),[items,query]);
  const dashboard=`/education/${role}`;
  return <main className={styles.page}>
    <header className={styles.top}><Link href={dashboard}><ArrowLeft size={19}/> Dashboard</Link><div><GraduationCap size={21}/><b>Dropare Education</b></div><span><ShieldCheck size={18}/> Preview</span></header>
    <section className={styles.hero}><div><span>{role==='lecturer'?'LECTURER COMMUNICATION':'STUDENT NOTIFICATIONS'}</span><h1>{role==='lecturer'?'Announcements & notifications':'Your updates in one place'}</h1><p>{role==='lecturer'?'Create class announcements and review delivery activity.':'Published results, assignments, timetable changes and learning updates appear here.'}</p></div><Bell size={34}/></section>
    <div className={styles.layout}>
      <section className={styles.panel}><div className={styles.panelHead}><div><span>INBOX</span><h2>Recent activity</h2></div><div className={styles.search}><Search size={17}/><input placeholder="Search updates" value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className={styles.list}>{filtered.map((item,i)=>{const Icon=item.icon;const content=<><span className={styles.icon}><Icon size={19}/></span><span className={styles.copy}><small>{item.type}</small><strong>{item.title}</strong><p>{item.copy}</p><em>{item.time}</em></span></>;return item.href?<Link className={styles.item} href={item.href} key={i}>{content}</Link>:<article className={styles.item} key={i}>{content}</article>})}</div></section>
      {role==='lecturer'?<section className={`${styles.panel} ${styles.compose}`}><div className={styles.panelHead}><div><span>ANNOUNCEMENT</span><h2>Create update</h2></div><Megaphone size={20}/></div><label>Audience<select value={draft.audience} onChange={e=>setDraft({...draft,audience:e.target.value})}><option>Assigned class</option><option>All my students</option><option>Course group</option></select></label><label>Title<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Announcement title"/></label><label>Message<textarea value={draft.message} onChange={e=>setDraft({...draft,message:e.target.value})} placeholder="Write the announcement…" rows={6}/></label><button disabled><Send size={18}/> Publish after database connection</button><p className={styles.note}>The composer is intentionally disabled in preview. Server-side course/class permission checks will be enforced before announcements can be published.</p></section>:<section className={`${styles.panel} ${styles.pref}`}><div className={styles.panelHead}><div><span>DELIVERY</span><h2>Notification channels</h2></div><MailCheck size={20}/></div><div className={styles.channel}><span>Email alerts</span><b>Enabled for published results</b></div><div className={styles.channel}><span>In-app notifications</span><b>Prepared</b></div><div className={styles.channel}><span>Offline reminders</span><b>PWA phase</b></div><div className={styles.tip}><CalendarDays size={18}/><p>Timetable and deadline notifications will use the student’s enrolled courses once authentication is connected.</p></div></section>}
    </div>
  </main>;
}
