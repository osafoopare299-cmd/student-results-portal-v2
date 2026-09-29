'use client';

import Link from 'next/link';
import { useCallback,useEffect,useState } from 'react';
import { ArrowLeft,Clock3,DoorOpen,ExternalLink,LoaderCircle,LogIn,Plus,Users,Video } from 'lucide-react';
import styles from './live-classroom.module.css';

const fmt=value=>`${new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})} GMT`;
const duration=seconds=>{const minutes=Math.round(Number(seconds||0)/60);return minutes<60?`${minutes} min`:`${Math.floor(minutes/60)}h ${minutes%60}m`;};
const providerOf=item=>item?.meeting_provider==='zoom'?'zoom':'jitsi';
const providerLabel=provider=>provider==='zoom'?'Zoom':'Jitsi Meet';
const emptyForm={offeringId:'',hostUserId:'',title:'',startsAt:'',endsAt:'',meetingProvider:'jitsi',meetingUrl:''};

export default function LiveClassroom({role}){
  const lecturer=role==='lecturer',host=role!=='student',admin=role==='admin',endpoint=`/api/education/${role}/live-classes`;
  const [data,setData]=useState({classes:[],offerings:[]});
  const [loading,setLoading]=useState(true),[message,setMessage]=useState(''),[attendance,setAttendance]=useState([]),[breakoutCount,setBreakoutCount]=useState(2);
  const [form,setForm]=useState(emptyForm);

  const load=useCallback(async()=>{
    try{
      const response=await fetch(endpoint,{cache:'no-store'}),payload=await response.json();
      if(!response.ok)throw new Error(payload.error||'Unable to load live classes.');
      setData(payload);
    }catch(error){setMessage(error.message);}
    finally{setLoading(false);}
  },[endpoint]);

  useEffect(()=>{load();const timer=setInterval(load,20000);return()=>clearInterval(timer);},[load]);

  async function post(body){
    setMessage('');
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),payload=await response.json();
    if(!response.ok)throw new Error(payload.error||'Unable to complete that action.');
    return payload;
  }

  async function create(event){
    event.preventDefault();
    try{
      await post({action:'create',...form,startsAt:new Date(`${form.startsAt}Z`).toISOString(),endsAt:new Date(`${form.endsAt}Z`).toISOString()});
      const platform=providerLabel(form.meetingProvider);
      setForm(emptyForm);
      setMessage(`${platform} class created. Students can now see it.`);
      await load();
    }catch(error){setMessage(error.message);}
  }

  async function recordPresence(action,classId){
    if(host||!classId)return;
    fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,classId}),keepalive:true}).catch(()=>{});
  }

  async function openRoom(item,breakoutId=null){
    const meetingWindow=window.open('about:blank','_blank');
    try{
      const payload=await post({action:host?'join':'join-token',classId:item.id,breakoutId});
      if(!host)recordPresence('joined',payload.classId);
      if(meetingWindow){meetingWindow.opener=null;meetingWindow.location.replace(payload.url);}
      else window.location.assign(payload.url);
      if(!host&&meetingWindow){
        const closeWatch=setInterval(()=>{if(meetingWindow.closed){clearInterval(closeWatch);recordPresence('left',payload.classId);load();}},2000);
      }
      setMessage(`${providerLabel(payload.provider)} opened in a new tab. Allow camera and microphone access there.`);
    }catch(error){if(meetingWindow)meetingWindow.close();setMessage(error.message);}
  }

  async function createBreakouts(item){
    try{await post({action:'breakouts',classId:item.id,count:breakoutCount});setMessage(`${breakoutCount} Jitsi breakout rooms created and students assigned.`);await load();}
    catch(error){setMessage(error.message);}
  }
  async function endClass(item){if(!confirm('End this live class for everyone?'))return;try{await post({action:'end',classId:item.id});await load();}catch(error){setMessage(error.message);}}
  async function viewAttendance(item){try{const payload=await post({action:'attendance',classId:item.id});setAttendance(payload.attendance||[]);}catch(error){setMessage(error.message);}}

  const available=data.classes||[];
  return <main className={styles.page}><div className={styles.wrap}>
    <header className={styles.header}><div><Link className={styles.back} href={`/education/${role}`}><ArrowLeft size={17}/> Back to dashboard</Link><span className={styles.eyebrow}>{admin?'ADMINISTRATOR WORKSPACE':lecturer?'LECTURER WORKSPACE':'STUDENT WORKSPACE'}</span><h1>Live Classroom</h1><p>{host?'Schedule and host secure course-linked video classes.':'Join live sessions for your enrolled courses.'}</p></div><span className={styles.status}><Video size={15}/> Jitsi Meet + Zoom available</span></header>
    {message&&<p className={styles.notice}>{message}</p>}
    {host&&<section className={styles.card}>{lecturer&&data.offerings?.length===0?<div className={styles.empty}><b>No courses are assigned to your lecturer account.</b><p>Ask an administrator to assign you to a course offering before scheduling a live class.</p></div>:<form className={styles.create} onSubmit={create}>
      <select required value={form.offeringId} onChange={event=>setForm({...form,offeringId:event.target.value})}><option value="">Select course</option>{(data.offerings||[]).map(offering=><option key={offering.id} value={offering.id}>{offering.code} · {offering.class_name}{admin&&offering.lecturer_name?` · ${offering.lecturer_name}`:''}</option>)}</select>
      {admin&&<select required value={form.hostUserId} onChange={event=>setForm({...form,hostUserId:event.target.value})}><option value="">Select host</option>{(data.hosts||[]).map(person=><option key={person.id} value={person.id}>{person.full_name} · {person.role}</option>)}</select>}
      <input required placeholder="Class topic" value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/>
      <label className={styles.timeField}><span>Classroom platform</span><select value={form.meetingProvider} onChange={event=>setForm({...form,meetingProvider:event.target.value,meetingUrl:event.target.value==='zoom'?form.meetingUrl:''})}><option value="jitsi">Jitsi Meet — automatic room</option><option value="zoom">Zoom — invitation link</option></select></label>
      {form.meetingProvider==='zoom'&&<label className={`${styles.timeField} ${styles.zoomField}`}><span>Zoom invitation link</span><input required type="url" inputMode="url" placeholder="https://us06web.zoom.us/j/…?pwd=…" value={form.meetingUrl} onChange={event=>setForm({...form,meetingUrl:event.target.value})}/><small>Paste the participant invitation link, including its embedded passcode when present. <a href="https://zoom.us/meeting/schedule" target="_blank" rel="noreferrer">Schedule in Zoom <ExternalLink size={12}/></a></small></label>}
      <label className={styles.timeField}><span>Starts (GMT)</span><input required type="datetime-local" value={form.startsAt} onChange={event=>setForm({...form,startsAt:event.target.value})}/></label>
      <label className={styles.timeField}><span>Ends (GMT)</span><input required type="datetime-local" value={form.endsAt} onChange={event=>setForm({...form,endsAt:event.target.value})}/></label>
      <button className={styles.button}><Plus size={17}/> Create class</button>
    </form>}</section>}
    {!host&&<section className={styles.studentHero}><span className={styles.eyebrow}>COURSE VIDEO SESSIONS</span><h1>Your classes</h1><p>Join Jitsi Meet or Zoom sessions scheduled for your enrolled courses. Camera, microphone, screen sharing and chat are handled by the selected classroom platform.</p></section>}
    {loading?<div className={styles.empty}><LoaderCircle/> Loading live classes…</div>:<section className={styles.list}>{available.length?available.map(item=>{
      const provider=providerOf(item),jitsi=provider==='jitsi';
      return <article className={styles.classCard} key={item.id}><div><span className={styles.eyebrow}>{item.code} · {providerLabel(provider)} · {String(item.status).toUpperCase()}</span><h2>{item.title}</h2><p>{item.course_title} · {item.class_name}{item.host_name?` · Host: ${item.host_name}`:''}</p><div className={styles.meta}><span><Clock3 size={14}/> {fmt(item.starts_at)} – {fmt(item.ends_at)}</span>{host&&<span><Users size={14}/> {item.attendees||0} attended</span>}</div>{jitsi&&item.breakout_name&&<small>Assigned: {item.breakout_name}</small>}</div>
        <div className={styles.actions}>{item.status!=='ended'&&<button className={styles.button} onClick={()=>openRoom(item)}><LogIn size={16}/> {host?'Start / join':'Join'} {providerLabel(provider)}</button>}{!host&&jitsi&&item.breakout_id&&item.status!=='ended'&&<button className={`${styles.button} ${styles.ghost}`} onClick={()=>openRoom(item,item.breakout_id)}><DoorOpen size={16}/> Join {item.breakout_name}</button>}{host&&item.status!=='ended'&&<>{jitsi?<span className={styles.breakout}><select value={breakoutCount} onChange={event=>setBreakoutCount(Number(event.target.value))}>{[2,3,4,5,6,7,8].map(number=><option key={number}>{number}</option>)}</select><button className={`${styles.button} ${styles.ghost}`} onClick={()=>createBreakouts(item)}><DoorOpen size={16}/> Breakouts</button></span>:<small className={styles.providerNote}>Manage breakouts inside Zoom.</small>}<button className={`${styles.button} ${styles.ghost}`} onClick={()=>viewAttendance(item)}><Users size={16}/> Attendance</button><button className={`${styles.button} ${styles.danger}`} onClick={()=>endClass(item)}>End</button></>}</div>
        {host&&jitsi&&item.breakouts?.length>0&&<div className={styles.meta} style={{gridColumn:'1/-1'}}>{item.breakouts.map(room=><button key={room.id} className={`${styles.button} ${styles.ghost}`} onClick={()=>openRoom(item,room.id)}>{room.name} · {room.assigned}</button>)}</div>}
      </article>;
    }):<div className={`${styles.card} ${styles.empty}`}>No live classes are scheduled.</div>}</section>}
    {host&&attendance.length>0&&<section className={`${styles.card} ${styles.attendance}`}><h2>Live attendance</h2>{attendance.map(entry=><div className={styles.attendanceRow} key={entry.email}><span><b>{entry.full_name}</b><br/><small>{entry.email}</small></span><span className={entry.online?styles.online:styles.offline}>{entry.online?'Online':'Left'}</span><span>{duration(entry.total_seconds)} · {entry.join_count} join{Number(entry.join_count)===1?'':'s'}</span></div>)}</section>}
  </div></main>;
}
