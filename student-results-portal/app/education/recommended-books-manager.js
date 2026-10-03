'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { ArrowLeft, BookMarked, Download, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react';
import styles from './recommended-books.module.css';

const emptyForm = { offeringId: '', title: '', author: '', edition: '', isbn: '', description: '', publish: true };
const titleFromFilename = value => String(value || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Recommended book';
const fileSize = value => Number(value || 0) >= 1048576 ? `${(Number(value) / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(Number(value || 0) / 1024))} KB`;

export default function RecommendedBooksManager({ role }) {
  const admin = role === 'admin';
  const endpoint = `/api/education/${role}/recommended-books`;
  const [data, setData] = useState({ offerings: [], books: [], fileStorageConfigured: false });
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Loading recommended books…');
  const selectedBytes = useMemo(() => files.reduce((total, file) => total + Number(file.size || 0), 0), [files]);

  async function load() {
    try {
      const response = await fetch(endpoint, { cache: 'no-store', credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load recommended books.');
      setData(payload);
      setMessage('');
    } catch (error) { setMessage(error.message || 'Unable to load recommended books.'); }
  }

  useEffect(() => { load(); }, [endpoint]);

  function reset() {
    setForm(emptyForm);
    setFiles([]);
    setEditing(null);
    setProgress(0);
  }

  function startEdit(book) {
    setEditing(book.id);
    setFiles([]);
    setForm({
      offeringId: String(book.offering_id),
      title: book.title || '',
      author: book.book_author || '',
      edition: book.book_edition || '',
      isbn: book.book_isbn || '',
      description: book.description || '',
      publish: Boolean(book.published_at),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseFiles(fileList) {
    const next = Array.from(fileList || []);
    setFiles(next);
    setProgress(0);
    if (next.length === 1 && !form.title.trim()) setForm(current => ({ ...current, title: titleFromFilename(next[0].name) }));
  }

  async function uploadBook(file, index, total) {
    const result = await upload(`education/${form.offeringId}/books/${file.name}`, file, {
      access: 'private',
      handleUploadUrl: `${endpoint}/upload`,
      clientPayload: JSON.stringify({ offeringId: form.offeringId }),
      contentType: file.type || 'application/octet-stream',
      multipart: file.size > 10 * 1024 * 1024,
      onUploadProgress: event => {
        const current = Number(event.percentage || 0);
        setProgress(Math.round(((index + current / 100) / total) * 100));
      },
    });
    return {
      blobPathname: result.pathname,
      originalFilename: file.name,
      fileContentType: result.contentType || file.type || 'application/octet-stream',
      fileSizeBytes: file.size,
    };
  }

  async function save(event) {
    event.preventDefault();
    if (!form.offeringId) return setMessage('Choose the course offering first.');
    if (editing) {
      setBusy(true);
      try {
        const response = await fetch(`${endpoint}/${editing}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to update the book.');
        reset();
        await load();
        setMessage('Recommended book updated.');
      } catch (error) { setMessage(error.message || 'Unable to update the book.'); }
      finally { setBusy(false); }
      return;
    }
    if (!files.length) return setMessage('Choose at least one PDF or e-book file.');
    setBusy(true);
    setProgress(0);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setMessage(`Uploading ${index + 1} of ${files.length}: ${file.name}…`);
        const uploaded = await uploadBook(file, index, files.length);
        const title = files.length === 1 && form.title.trim() ? form.title.trim() : titleFromFilename(file.name);
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ ...form, ...uploaded, title }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to save the recommended book.');
      }
      const count = files.length;
      reset();
      await load();
      setMessage(`${count} recommended book${count === 1 ? '' : 's'} uploaded${form.publish ? ' and published to students' : ' as draft'}.`);
    } catch (error) { setMessage(error.message || 'Unable to upload recommended books.'); }
    finally { setBusy(false); setProgress(0); }
  }

  async function togglePublish(book) {
    setBusy(true);
    try {
      const response = await fetch(`${endpoint}/${book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ publish: !book.published_at }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to change publication status.');
      await load();
      setMessage(book.published_at ? 'Book unpublished.' : 'Book published to enrolled students.');
    } catch (error) { setMessage(error.message || 'Unable to change publication status.'); }
    finally { setBusy(false); }
  }

  async function remove(book) {
    if (!confirm(`Delete “${book.title}” and its uploaded file?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`${endpoint}/${book.id}`, { method: 'DELETE', credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to delete the book.');
      await load();
      setMessage('Recommended book and its private file were deleted.');
    } catch (error) { setMessage(error.message || 'Unable to delete the book.'); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}><div className={styles.wrap}>
    <Link className={styles.back} href={`/education/${role}`}><ArrowLeft size={18}/> {admin ? 'Administrator' : 'Lecturer'} dashboard</Link>
    <section className={styles.hero}><div><span className={styles.eyebrow}>COURSE LIBRARY</span><h1>Recommended Books</h1><p>Upload approved PDF and e-book files for students enrolled in each course. Files remain private and require an authenticated Education account.</p></div><div className={styles.heroBadge}><BookMarked size={22}/> Secure downloads</div></section>
    {message && <p className={`${styles.notice} ${message.includes('uploaded') || message.includes('updated') || message.includes('published') ? styles.success : ''}`} role="status">{message}</p>}
    {!data.fileStorageConfigured && <p className={styles.notice}>Secure file storage is not connected. Book uploads cannot start until the existing Vercel Blob store is available.</p>}
    <section className={styles.manager}>
      <form className={`${styles.card} ${styles.form}`} onSubmit={save}>
        <h2>{editing ? 'Edit book details' : 'Add recommended books'}</h2>
        <label className={styles.field}><span>Course offering</span><select required disabled={Boolean(editing)} value={form.offeringId} onChange={event => setForm({ ...form, offeringId: event.target.value })}><option value="">Choose course</option>{data.offerings.map(offering => <option key={offering.id} value={offering.id}>{offering.code} — {offering.class_name} — {offering.academic_year}{admin && offering.lecturer_name ? ` — ${offering.lecturer_name}` : ''}</option>)}</select></label>
        <label className={styles.field}><span>Book title{!editing && files.length > 1 ? ' (ignored for batch uploads)' : ''}</span><input required={Boolean(editing || files.length <= 1)} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Book title"/></label>
        <label className={styles.field}><span>Author</span><input value={form.author} onChange={event => setForm({ ...form, author: event.target.value })} placeholder="Author or editors"/></label>
        <div className={styles.actions}><label className={styles.field} style={{ flex: 1 }}><span>Edition</span><input value={form.edition} onChange={event => setForm({ ...form, edition: event.target.value })} placeholder="e.g. 10th edition"/></label><label className={styles.field} style={{ flex: 1 }}><span>ISBN</span><input value={form.isbn} onChange={event => setForm({ ...form, isbn: event.target.value })} placeholder="Optional"/></label></div>
        <label className={styles.field}><span>Recommendation note</span><textarea rows="4" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Why students should use this book"/></label>
        {!editing && <section className={styles.upload}><b><UploadCloud size={16}/> Choose one or many books</b><input aria-label="Recommended book files" required type="file" multiple accept=".pdf,.epub,.mobi,.azw,.azw3,application/pdf,application/epub+zip" disabled={!data.fileStorageConfigured || busy} onChange={event => chooseFiles(event.target.files)}/><small>{files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected · ${fileSize(selectedBytes)} total` : 'PDF, EPUB, MOBI, AZW or AZW3 · maximum 250 MB per book'}</small>{files.map(file => <small key={`${file.name}-${file.size}`}>✓ {file.name} · {fileSize(file.size)}</small>)}{busy && files.length > 0 && <><div className={styles.progress}><span style={{ width: `${progress}%` }}/></div><small>{progress}% overall upload progress</small></>}</section>}
        <label className={styles.checks}><span><input type="checkbox" checked={form.publish} onChange={event => setForm({ ...form, publish: event.target.checked })}/> Publish to enrolled students</span></label>
        <div className={styles.actions}><button className={styles.button} disabled={busy || (!editing && !data.fileStorageConfigured)}><Plus size={17}/> {busy ? 'Saving…' : editing ? 'Update book' : 'Upload books'}</button>{editing && <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={reset}>Cancel</button>}</div>
      </form>
      <section className={styles.card}><div className={styles.listHead}><div><span className={styles.eyebrow}>CATALOGUE</span><h2>Uploaded books</h2></div><span className={styles.tag}>{data.books.length} total</span></div>
        <div className={styles.bookList}>{data.books.length ? data.books.map(book => <article className={styles.bookRow} key={book.id}><div className={styles.bookTop}><div><span className={styles.eyebrow}>{book.code} · {book.published_at ? 'PUBLISHED' : 'DRAFT'}</span><h3>{book.title}</h3><p>{book.book_author || 'Author not specified'}{book.book_edition ? ` · ${book.book_edition}` : ''}</p></div><div className={styles.actions}><a className={`${styles.button} ${styles.secondary}`} href={book.download_url}><Download size={15}/> Download</a>{book.can_manage && <button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => startEdit(book)} aria-label={`Edit ${book.title}`}><Pencil size={15}/></button>}</div></div><div className={styles.meta}><span className={styles.tag}>{book.class_name}</span><span>{book.original_filename}</span><span>{fileSize(book.file_size_bytes)}</span>{book.added_by && <span>Added by {book.added_by}</span>}</div>{book.can_manage ? <div className={styles.actions} style={{ marginTop: 10 }}><button type="button" className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => togglePublish(book)}>{book.published_at ? 'Unpublish' : 'Publish'}</button><button type="button" className={`${styles.button} ${styles.danger}`} disabled={busy} onClick={() => remove(book)}><Trash2 size={15}/> Delete</button></div> : <p className={styles.ownerNote}>This book was added by an administrator or another authorised lecturer. You can download it but cannot alter it.</p>}</article>) : <p className={styles.empty}>No recommended books have been uploaded yet.</p>}</div>
      </section>
    </section>
  </div></main>;
}
