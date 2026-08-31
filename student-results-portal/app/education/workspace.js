'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Activity, BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2,
  ClipboardCheck, FileText, GraduationCap, LayoutDashboard, Menu,
  MessageSquareText, ShieldCheck, Sparkles, Stethoscope, UserCog,
  Users, Wifi, X
} from 'lucide-react';
import styles from './page.module.css';

const workspaces = {
  student: {
    label: 'Student',
    welcome: 'Your learning, assessments and progress in one place.',
    stats: [['Courses','6'],['Attendance','92%'],['Assessments due','3'],['Average','78.4%']],
    actions: [
      ['Learning Hub','Notes, PDFs, videos and saved offline resources',BookOpen],
      ['Assessments','MCQs, written tests, viva/OSCE and practicals',ClipboardCheck],
      ['Results','Grades, percentages, class position and trends',BarChart3],
      ['Timetable','Classes, rotations, assessments and deadlines',CalendarDays],
      ['AI Tutor','Answers grounded only in approved course materials',Sparkles],
      ['Attendance','Class and rotation attendance summaries',CheckCircle2],
    ],
  },
  lecturer: {
    label: 'Lecturer',
    welcome: 'Teach, assess and support your assigned classes.',
    stats: [['Courses','4'],['Students','168'],['Draft results','2'],['Pending marking','19']],
    actions: [
      ['Course Materials','Upload notes, PDFs, videos and learning resources',FileText],
      ['Create Assessment','Build MCQ, written, viva/OSCE and practical assessments',ClipboardCheck],
      ['Marks & Results','Enter marks, review calculations and publish results',BarChart3],
      ['Attendance','Create sessions and record attendance',CheckCircle2],
      ['Announcements','Send course and class updates',MessageSquareText],
      ['Class Analytics','Weak topics, progress and assessment performance',Activity],
    ],
  },
  admin: {
    label: 'Administrator',
    welcome: 'Control the academic structure, permissions and platform health.',
    stats: [['Students','540'],['Lecturers','32'],['Courses','24'],['Academic year','2026/27']],
    actions: [
      ['People & Permissions','Students, lecturers, roles and access scopes',UserCog],
      ['Courses & Classes','Courses, classes, rotations and enrolments',GraduationCap],
      ['Academic Years','Terms, years, grading rules and publication policies',CalendarDays],
      ['Assessment Control','Templates, moderation and publication workflows',ClipboardCheck],
      ['Notifications','Result, assignment and announcement delivery settings',Bell],
      ['Platform Analytics','Performance, attendance and activity summaries',BarChart3],
    ],
  },
};

export default function Workspace({ role }) {
  const [menuOpen,setMenuOpen]=useState(false);
  const data=workspaces[role] || workspaces.student;
  return <main className={styles.shell}>
    <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}><span><Stethoscope size={22}/></span><div><b>Dropare Education</b><small>{data.label} workspace</small></div></div>
      <button className={styles.closeMenu} onClick={()=>setMenuOpen(false)} aria-label="Close navigation"><X size={20}/></button>
      <nav>
        <Link className={styles.active} href={`/education/${role}`}><LayoutDashboard size={18}/> Dashboard</Link>
        <a><BookOpen size={18}/> Learning</a><a><ClipboardCheck size={18}/> Assessments</a><a><BarChart3 size={18}/> Results</a><a><CalendarDays size={18}/> Timetable</a><a><Bell size={18}/> Notifications</a>
      </nav>
      <div className={styles.sidebarFoot}><ShieldCheck size={18}/><span>Access will be enforced by authenticated role</span></div>
    </aside>
    <section className={styles.content}>
      <header className={styles.topbar}>
        <button className={styles.menuBtn} onClick={()=>setMenuOpen(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className={styles.roleTabs}><Link href="/education/student">Student</Link><Link href="/education/lecturer">Lecturer</Link><Link href="/education/admin">Administrator</Link></div>
        <span className={styles.online}><Wifi size={17}/><span>Preview</span></span>
      </header>
      <div className={styles.inner}>
        <section className={styles.hero}><div><span className={styles.eyebrow}>DROPARE STUDENT EDUCATION SYSTEM</span><h1>{data.label} Portal</h1><p>{data.welcome}</p></div><div className={styles.heroBadge}><GraduationCap size={28}/><span>Academic Year</span><b>2026 / 2027</b></div></section>
        <section className={styles.stats}>{data.stats.map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
        <section className={styles.sectionHead}><div><span className={styles.eyebrow}>WORKSPACE</span><h2>{data.label} tools</h2></div><span className={styles.status}><CheckCircle2 size={16}/> Route ready</span></section>
        <section className={styles.featureGrid}>{data.actions.map(([title,copy,Icon])=><button className={styles.featureCard} key={title} type="button"><span className={styles.featureIcon}><Icon size={21}/></span><span><strong>{title}</strong><small>{copy}</small></span></button>)}</section>
        <section className={styles.foundation}><ShieldCheck size={20}/><div><b>Authentication boundary prepared</b><p>This workspace now has its own route. The next database/auth step will replace preview data with the signed-in user's authorized courses, classes, results and permissions.</p></div></section>
      </div>
      {role==='student' && <nav className={styles.mobileNav}><Link className={styles.active} href="/education/student"><LayoutDashboard/><span>Home</span></Link><a><BookOpen/><span>Learn</span></a><a><ClipboardCheck/><span>Assess</span></a><a><BarChart3/><span>Results</span></a><a><Users/><span>More</span></a></nav>}
    </section>
  </main>;
}
