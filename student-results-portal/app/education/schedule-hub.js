'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, Search, Users } from 'lucide-react';
import styles from './schedule-hub.module.css';

const studentEvents = [
  { day: 'Mon', date: '31 Aug', time: '08:00–12:00', title: 'Paediatrics Ward Rotation', course: 'Paediatrics', place: 'Children’s Ward', type: 'Rotation' },
  { day: 'Mon', date: '31 Aug', time: '12:30–14:00', title: 'Clinical Pharmacology', course: 'Pharmacology', place: 'Lecture Hall 2', type: 'Lecture' },
  { day: 'Tue', date: '1 Sep', time: '10:00–11:00', title: 'Shock & Resuscitation Quiz', course: 'Emergency Medicine', place: 'Online', type: 'Assessment' },
  { day: 'Wed', date: '2 Sep', time: '09:00–11:00', title: 'OSCE Practice', course: 'Clinical Skills', place: 'Skills Lab', type: 'Practical' },
];

const attendanceRows = [
  ['Paediatrics Ward Rotation', '18 / 20', '90%', 'Good'],
  ['Emergency Medicine', '12 / 12', '100%', 'Excellent'],
  ['Clinical Pharmacology', '9 / 10', '90%', 'Good'],
  ['Clinical Skills', '7 / 8', '88%', 'Good'],
];

export default function ScheduleHub({ role = 'student', mode = 'timetable' }) {
  const [query, setQuery] = useState('');
  const isLecturer = role === 'lecturer';
  const filtered = useMemo(() => studentEvents.filter(e => `${e.title} ${e.course} ${e.type}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const back = `/education/${role}`;
  const peer = mode === 'timetable' ? `/education/${role}/attendance` : `/education/${role}/timetable`;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div>
        <Link href={back} className={styles.back}><ArrowLeft size={17}/> Back to dashboard</Link>
        <span className={styles.eyebrow}>{isLecturer ? 'LECTURER WORKSPACE' : 'STUDENT WORKSPACE'}</span>
        <h1>{mode === 'timetable' ? 'Timetable' : 'Attendance'}</h1>
        <p>{mode === 'timetable' ? 'Classes, rotations, assessments and deadlines in one academic schedule.' : isLecturer ? 'Create attendance sessions and review class or rotation participation.' : 'Track your class and rotation attendance across enrolled courses.'}</p>
      </div>
      <nav className={styles.switcher}>
        <Link className={mode === 'timetable' ? styles.active : ''} href={`/education/${role}/timetable`}><CalendarDays size={16}/> Timetable</Link>
        <Link className={mode === 'attendance' ? styles.active : ''} href={`/education/${role}/attendance`}><CheckCircle2 size={16}/> Attendance</Link>
      </nav>
    </header>

    {mode === 'timetable' ? <>
      <section className={styles.summary}>
        <article><span>This week</span><strong>8</strong><small>scheduled activities</small></article>
        <article><span>Next activity</span><strong>08:00</strong><small>Paediatrics rotation</small></article>
        <article><span>Assessments</span><strong>2</strong><small>due this week</small></article>
      </section>
      <section className={styles.toolbar}><label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search timetable"/></label>{isLecturer && <button type="button">+ Add timetable event</button>}</section>
      <section className={styles.eventList}>
        {filtered.map(event => <article key={`${event.date}-${event.time}-${event.title}`} className={styles.event}>
          <div className={styles.dateBlock}><b>{event.day}</b><span>{event.date}</span></div>
          <div className={styles.eventMain}><span className={styles.type}>{event.type}</span><h2>{event.title}</h2><p>{event.course}</p><div><span><Clock3 size={15}/>{event.time}</span><span><MapPin size={15}/>{event.place}</span></div></div>
          {isLecturer && <button type="button" className={styles.secondary}>Manage</button>}
        </article>)}
      </section>
    </> : <>
      <section className={styles.summary}>
        <article><span>Overall attendance</span><strong>92%</strong><small>{isLecturer ? 'class average' : 'across enrolled courses'}</small></article>
        <article><span>Sessions</span><strong>50</strong><small>{isLecturer ? 'recorded this term' : 'eligible sessions'}</small></article>
        <article><span>Present</span><strong>46</strong><small>{isLecturer ? 'average equivalent' : 'sessions attended'}</small></article>
      </section>
      {isLecturer && <section className={styles.callout}><Users size={22}/><div><b>Attendance session tools</b><p>Create a class or rotation session, mark students present/absent, and publish the session summary.</p></div><button type="button">Create session</button></section>}
      <section className={styles.tableCard}>
        <div className={styles.tableHead}><div><span className={styles.eyebrow}>{isLecturer ? 'COURSE SUMMARY' : 'MY ATTENDANCE'}</span><h2>{isLecturer ? 'Attendance by course' : 'Course attendance'}</h2></div><Link href={peer}>View timetable</Link></div>
        <div className={styles.rows}>{attendanceRows.map(([course,count,rate,status]) => <div className={styles.row} key={course}><span><b>{course}</b><small>{count} sessions</small></span><strong>{rate}</strong><em>{status}</em></div>)}</div>
      </section>
    </>}
  </main>;
}
