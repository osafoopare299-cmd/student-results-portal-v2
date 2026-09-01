'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Activity, BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2,
  ClipboardCheck, FileText, GraduationCap, LayoutDashboard, Menu,
  MessageSquareText, ShieldCheck, Sparkles, Stethoscope, UserCog,
  Wifi, X
} from 'lucide-react';
import styles from './page.module.css';

const workspaces = {
  student: {
    label: 'Student',
    welcome: 'Your learning, assessments and progress in one place.',
    stats: [['Courses','—'],['Upcoming','—'],['Announcements','—'],['Profile','—']],
    actions: [
      ['Learning Hub','Notes, PDFs, videos and saved offline resources',BookOpen,'/education/student/learn'],
      ['Assessments','MCQs, written tests, viva/OSCE and practicals',ClipboardCheck,'/education/student/assess'],
      ['Results','Published grades, percentages and assessment breakdowns',BarChart3,'/education/student/results'],
      ['Timetable','Classes, rotations, assessments and deadlines',CalendarDays,'/education/student/timetable'],
      ['AI Tutor','Ask questions from approved course materials only',Sparkles,'/education/student/ai-tutor'],
      ['Notifications','Results, assignments, timetable and learning updates',Bell,'/education/student/notifications'],
      ['Attendance','Class and rotation attendance summaries',CheckCircle2,'/education/student/attendance'],
    ],
  },
  lecturer: {
    label: 'Lecturer',
    welcome: 'Teach, assess and support your assigned classes.',
    stats: [['Courses','—'],['Students','—'],['Upcoming','—'],['Profile','—']],
    actions: [
      ['Course Materials','Upload notes, PDFs, videos and learning resources',FileText,'/education/lecturer/learning'],
      ['Create Assessment','Build MCQ, written, viva/OSCE and practical assessments',ClipboardCheck,'/education/lecturer/assessments'],
      ['Marks & Results','Mark submissions, finalize scores and release results',BarChart3,'/education/lecturer/assessments'],
      ['Attendance','Create sessions and record attendance',CheckCircle2,'/education/lecturer/attendance'],
      ['Announcements','Create class updates and review notification activity',MessageSquareText,'/education/lecturer/notifications'],
      ['Class Analytics','Weak topics, progress and assessment performance',Activity,null],
    ],
  },
  admin: {
    label: 'Administrator',
    welcome: 'Control the academic structure, permissions and platform health.',
    stats: [['Students','—'],['Lecturers','—'],['Courses','—'],['Academic year','—']],
    actions: [
      ['People & Permissions','Students, lecturers, roles and access scopes',UserCog,'/education/admin/people'],
      ['Courses & Classes','Courses, classes and core academic catalog',GraduationCap,'/education/admin/catalog'],
      ['Academic Years','Create academic periods and choose the active year',CalendarDays,'/education/admin/academic-years'],
      ['Course Offerings','Connect courses to classes, years, terms and lecturers',BookOpen,'/education/admin/offerings'],
      ['Enrolments & Assignments','Enrol students and assign lecturers',ClipboardCheck,'/education/admin/assignments'],
      ['Grading Scheme','Configure grade boundaries and PASS/REVIEW outcomes',CheckCircle2,'/education/admin/grading'],
      ['Result Publication','Review finalized Education marks and release them to students',BarChart3,'/education/admin/results'],
      ['Database Setup','Verify isolation and initialize education tables',ShieldCheck,'/education/admin/setup'],
      ['Platform Analytics','Performance, attendance and activity summaries',BarChart3,'/education/admin/analytics'],
    ],
  },
};

function ToolCard({ item }) {
  const [title,copy,Icon,href]=item;
  const content=<><span className={styles.featureIcon}><Icon size={21}/></span><span><strong>{title}</strong><small>{copy}</small></span></>;
  if (href) return <Link className={styles.featureCard} href={href}>{content}</Link>;
  return <button className={styles.featureCard} type="button">{content}</button>;
}

export default function Workspace({ role, user=null, dashboard=null }) {
  const [menuOpen,setMenuOpen]=useState(false);
  const data=workspaces[role] || workspaces.student;
  const stats=dashboard?.stats || data.stats;
  const academicYear=dashboard?.academicYear || 'Not assigned';
  const learnHref=role==='lecturer'?'/education/lecturer/learning':role==='student'?'/education/student/learn':null;
  const assessHref=role==='lecturer'?'/education/lecturer/assessments':role==='student'?'/education/student/assess':null;
  const timetableHref=role==='lecturer'?'/education/lecturer/timetable':role==='student'?'/education/student/timetable':null;
  const resultsHref=role==='student'?'/education/student/results':role==='lecturer'?'/education/lecturer/assessments':role==='admin'?'/education/admin/results':null;
  const notificationsHref=role==='lecturer'?'/education/lecturer/notifications':role==='student'?'/education/student/notifications':null;
  return <main className={styles.shell}>
    <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}><span><Stethoscope size={22}/></span><div><b>Dropare Education</b><small>{data.label} workspace</small></div></div>
      <button className={styles.closeMenu} onClick={()=>setMenuOpen(false)} aria-label="Close navigation"><X size={20}/></button>
      <nav>
        <Link className={styles.active} href={`/education/${role}`}><LayoutDashboard size={18}/> Dashboard</Link>
        {learnHref ? <Link href={learnHref}><BookOpen size={18}/> Learning</Link> : <a><BookOpen size={18}/> Learning</a>}
        {assessHref ? <Link href={assessHref}><ClipboardCheck size={18}/> Assessments</Link> : <a><ClipboardCheck size={18}/> Assessments</a>}
        {resultsHref ? <Link href={resultsHref}><BarChart3 size={18}/> Results</Link> : <a><BarChart3 size={18}/> Results</a>}
        {timetableHref ? <Link href={timetableHref}><CalendarDays size={18}/> Timetable</Link> : <a><CalendarDays size={18}/> Timetable</a>}
        {notificationsHref ? <Link href={notificationsHref}><Bell size={18}/> Notifications</Link> : <a><Bell size={18}/> Notifications</a>}
      </nav>
      <div className={styles.sidebarFoot}><ShieldCheck size={18}/><span>Authenticated role access enforced</span></div>
    </aside>
    <section className={styles.content}>
      <header className={styles.topbar}>
        <button className={styles.menuBtn} onClick={()=>setMenuOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className={styles.roleTabs}><Link href="/education/student">Student</Link><Link href="/education/lecturer">Lecturer</Link><Link href="/education/admin">Administrator</Link></div>
        <span className={styles.online}><Wifi size={17}/><span>{dashboard ? 'Connected' : 'Preview'}</span></span>
      </header>
      <div className={styles.inner}>
        <section className={styles.hero}><div><span className={styles.eyebrow}>DROPARE STUDENT EDUCATION SYSTEM</span><h1>{user?.full_name ? `Welcome, ${user.full_name}` : `${data.label} Portal`}</h1><p>{data.welcome}</p></div><div className={styles.heroBadge}><GraduationCap size={28}/><span>Academic Year</span><b>{academicYear}</b></div></section>
        <section className={styles.stats}>{stats.map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
        <section className={styles.sectionHead}><div><span className={styles.eyebrow}>WORKSPACE</span><h2>{data.label} tools</h2></div><span className={styles.status}><CheckCircle2 size={16}/> {dashboard ? 'Live data' : 'Route ready'}</span></section>
        <section className={styles.featureGrid}>{data.actions.map(item=><ToolCard key={item[0]} item={item}/>)}</section>
        <section className={styles.foundation}><ShieldCheck size={20}/><div><b>{dashboard ? 'Database-backed workspace' : 'Secure education foundation'}</b><p>{dashboard ? 'Dashboard totals are now loaded from education records. Existing student results publication remains separate and unchanged.' : 'Role access is protected. Live academic data will appear once the education database and authentication environment are activated.'}</p></div></section>
      </div>
      {role==='student' && <nav className={styles.mobileNav}><Link className={styles.active} href="/education/student"><LayoutDashboard/><span>Home</span></Link><Link href="/education/student/learn"><BookOpen/><span>Learn</span></Link><Link href="/education/student/assess"><ClipboardCheck/><span>Assess</span></Link><Link href="/education/student/results"><BarChart3/><span>Results</span></Link><Link href="/education/student/notifications"><Bell/><span>More</span></Link></nav>}
    </section>
  </main>;
}
