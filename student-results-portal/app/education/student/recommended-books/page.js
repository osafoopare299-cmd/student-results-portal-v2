'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookMarked, Download, Search } from 'lucide-react';
import styles from '../../recommended-books.module.css';

const fileSize = value => Number(value || 0) >= 1048576 ? `${(Number(value) / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(Number(value || 0) / 1024))} KB`;
const formatLabel = filename => String(filename || '').split('.').pop()?.toUpperCase() || 'BOOK';

export default function StudentRecommendedBooksPage() {
  const [data, setData] = useState({ offerings: [], books: [] });
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('all');
  const [message, setMessage] = useState('Loading recommended books…');

  useEffect(() => {
    let active = true;
    fetch('/api/education/student/recommended-books', { cache: 'no-store', credentials: 'include' })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load recommended books.');
        if (active) { setData(payload); setMessage(''); }
      })
      .catch(error => { if (active) setMessage(error.message || 'Unable to load recommended books.'); });
    return () => { active = false; };
  }, []);

  const books = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.books.filter(book => {
      if (course !== 'all' && String(book.offering_id) !== course) return false;
      if (!term) return true;
      return [book.title, book.book_author, book.book_edition, book.book_isbn, book.description, book.code, book.course_title].some(value => String(value || '').toLowerCase().includes(term));
    });
  }, [course, data.books, query]);

  return <main className={styles.page}><div className={styles.wrap}>
    <Link className={styles.back} href="/education/student"><ArrowLeft size={18}/> Student dashboard</Link>
    <section className={styles.hero}><div><span className={styles.eyebrow}>YOUR COURSE LIBRARY</span><h1>Recommended Books</h1><p>Download books selected by your lecturers and administrators for the courses in which you are actively enrolled.</p></div><div className={styles.heroBadge}><BookMarked size={22}/> Enrolled courses only</div></section>
    <div className={styles.downloadHint}><Download size={18}/><span>Downloads are private to your signed-in Education account. After downloading, the book is saved through your browser or device download manager.</span></div>
    <section className={styles.toolbar}><label className={styles.field}><span className={styles.srOnly}>Search books</span><div style={{ position: 'relative' }}><Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#71867d' }}/><input style={{ paddingLeft: 38 }} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, author, ISBN or course"/></div></label><label className={styles.field}><span className={styles.srOnly}>Filter by course</span><select value={course} onChange={event => setCourse(event.target.value)}><option value="all">All enrolled courses</option>{data.offerings.map(offering => <option key={offering.id} value={offering.id}>{offering.code} — {offering.title} ({offering.books_count})</option>)}</select></label></section>
    <p className={styles.summary}>{books.length} book{books.length === 1 ? '' : 's'} shown</p>
    {message && <p className={styles.notice} role="status">{message}</p>}
    <section className={styles.studentGrid}>{books.length ? books.map(book => <article className={styles.studentBook} key={book.id}><div className={styles.bookIcon}><BookMarked size={21}/></div><span className={styles.eyebrow} style={{ marginTop: 13 }}>{book.code} · {book.class_name}</span><h2>{book.title}</h2><span className={styles.author}>{book.book_author || 'Author not specified'}</span><div className={styles.meta}>{book.book_edition && <span className={styles.tag}>{book.book_edition}</span>}{book.book_isbn && <span>ISBN {book.book_isbn}</span>}<span className={styles.format}>{formatLabel(book.original_filename)}</span></div>{book.description && <p className={styles.description}>{book.description}</p>}<div className={styles.fileName}>{book.original_filename} · {fileSize(book.file_size_bytes)}</div><a className={styles.button} href={book.download_url}><Download size={17}/> Download book</a></article>) : !message && <div className={`${styles.card} ${styles.empty}`}>No recommended books match this view yet.</div>}</section>
  </div></main>;
}
