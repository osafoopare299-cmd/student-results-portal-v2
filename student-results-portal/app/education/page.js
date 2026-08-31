'use client';

import { useMemo, useState } from 'react';
import {
  Activity, BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2,
  ClipboardCheck, FileText, GraduationCap, LayoutDashboard, Menu,
  MessageSquareText, ShieldCheck, Sparkles, Stethoscope, UserCog,
  Users, Wifi, WifiOff, X
} from 'lucide-react';
import styles from './page.module.css';

const roleData = {
  student: {
    label: 'Student',
    welcome: 'Your learning, assessments and progress in one place.',
    stats: [['Courses', '6'], ['Attendance', '92%'], ['Assessments due', '3'], ['Average', '78.4%']],
    actions: [
      ['Learning Hub', 'Notes, PDFs, videos and saved offline resources', BookOpen],
      ['Assessments', 'MCQs, written tests, viva/OSCE and practicals', ClipboardCheck],
      ['Results', 'Grades, percentages, class position and trends', BarChart3],
      ['Timetable', 'Classes, rotations, assessments and deadlines', CalendarDays],
      ['AI Tutor', 'Ask questions from approved course materials only', Sparkles],
      ['Attendance', 'Class and rotation attendance summaries', CheckCircle2],
    ],
  },
  lecturer: {
    label: 'Lecturer',
    welcome: 'Teach, assess and support your assigned classes.',
    stats: [['Courses', '4'], ['Students', '168'], ['Draft results', '2'], ['Pending marking', '19']],
    actions: [
      ['Course Materials', 'Upload notes, PDFs, videos and learning resources', FileText],
      ['Create Assessment', 'Build MCQ, written, viva/OSCE and practical assessments', ClipboardCheck],
      ['Marks & Results', 'Enter marks, review calculations and publish results', BarChart3],
      ['Attendance', 'Create sessions and record class or rotation attendance', CheckCircle2],
      ['Announcements', 'Send course and class updates', MessageSquareText],
      ['Class Analytics', 'Track weak topics, progress and assessment performance', Activity],
    ],
  },
  admin: {
    label: 'Administrator',
    welcome: 'Control the academic structure, permissions and platform health.',
    stats: [['Students', '540'], ['Lecturers', '32'], ['Courses', '24'], ['Academic year', '2026/27']],
    actions: [
      ['People & Permissions', 'Students, lecturers, roles and access scopes', UserCog],
      ['Courses & Classes', 'Courses, classes, rotations and enrolments', GraduationCap],
      ['Academic Years', 'Terms, years, grading rules and publication policies', CalendarDays],
      ['Assessment Control', 'Templates, moderation and publication workflows', ClipboardCheck],
      ['Notifications', 'Result, assignment and announcement delivery settings', Bell],
      ['Platform Analytics', 'Performance, attendance and activity summaries', BarChart3],
    ],
  },
};

function FeatureCard({ item }) {
  const [title, copy, Icon] = item;
  return <button className={styles.featureCard} type="button">
    <span className={styles.featureIcon}><Icon size={21}/></span>
    <span><strong>{title}</strong><small>{copy}</small></span>
  </button>;
}

export default function EducationHome() {
  const [role, setRole] = useState('student');
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const data = useMemo(() => roleData[role], [role]);

  return <main className={styles.shell}>
    <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.brand}><span><Stethoscope size={22}/></span><div><b>Dropare Education</b><small>Student Education System</small></div></div>
      <button className={styles.closeMenu} onClick={()=>setMenuOpen(false)}><X size={20}/></button>
      <nav>
        <a className={styles.active}><LayoutDashboard size={18}/> Dashboard</a>
        <a><BookOpen size={18}/> Learning</a>
        <a><ClipboardCheck size={18}/> Assessments</a>
        <a><BarChart3 size={18}/> Results</a>
        <a><CalendarDays size={18}/> Timetable</a>
        <a><Bell size={18}/> Notifications</a>
      </nav>
      <div className={styles.sidebarFoot}><ShieldCheck size={18}/><span>Role-based secure access</span></div>
    </aside>

    <section className={styles.content}>
      <header className={styles.topbar}>
        <button className={styles.menuBtn} onClick={()=>setMenuOpen(true)}><Menu size={20}/></button>
        <div className={styles.roleTabs}>
          {Object.entries(roleData).map(([key, value]) => <button key={key} className={role===key ? styles.roleActive : ''} onClick={()=>setRole(key)}>{value.label}</button>)}
        </div>
        <button className={styles.online} onClick={()=>setOnline(v=>!v)}>{online ? <Wifi size={17}/> : <WifiOff size={17}/>}<span>{online ? 'Online' : 'Offline'}</span></button>
      </header>

      <div className={styles.inner}>
        <section className={styles.hero}>
          <div><span className={styles.eyebrow}>DROPARE STUDENT EDUCATION SYSTEM</span><h1>{data.label} Portal</h1><p>{data.welcome}</p></div>
          <div className={styles.heroBadge}><GraduationCap size={28}/><span>Academic Year</span><b>2026 / 2027</b></div>
        </section>

        <section className={styles.stats}>
          {data.stats.map(([label,value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
        </section>

        <section className={styles.sectionHead}><div><span className={styles.eyebrow}>WORKSPACE</span><h2>What would you like to do?</h2></div><span className={styles.status}><CheckCircle2 size={16}/> Foundation active</span></section>
        <section className={styles.featureGrid}>{data.actions.map(item => <FeatureCard key={item[0]} item={item}/>)}</section>

        {role==='student' && <section className={styles.twoCol}>
          <article className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>TODAY</span><h3>Upcoming</h3></div><CalendarDays size={20}/></div><div className={styles.timeline}><p><b>08:00</b><span>Paediatrics ward rotation</span></p><p><b>12:30</b><span>Clinical Pharmacology lecture</span></p><p><b>16:00</b><span>Emergency Medicine quiz</span></p></div></article>
          <article className={styles.panel}><div className={styles.panelHead}><div><span className={styles.eyebrow}>LEARNING</span><h3>Continue studying</h3></div><BookOpen size={20}/></div><div className={styles.course}><span>Emergency Medicine</span><strong>Shock & resuscitation</strong><div><i style={{width:'68%'}}/></div><small>68% completed · available offline</small></div></article>
        </section>}

        <section className={styles.foundation}><Sparkles size={20}/><div><b>Phase 1 foundation</b><p>This interface establishes the Student, Lecturer and Administrator workspaces. Database-backed authentication, enrolments and permissions plug into this shell without changing the existing results portal.</p></div></section>
      </div>

      <nav className={styles.mobileNav}><a className={styles.active}><LayoutDashboard/><span>Home</span></a><a><BookOpen/><span>Learn</span></a><a><ClipboardCheck/><span>Assess</span></a><a><BarChart3/><span>Results</span></a><a><Users/><span>More</span></a></nav>
    </section>
  </main>;
}
