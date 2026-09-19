'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';
import EducationLogoutButton from './logout-button';
import styles from './pwa-register.module.css';

async function clearPrivateEducationData(){
  try{
    if('caches' in window){
      const names=await caches.keys();
      await Promise.all(names.filter(name=>name.startsWith('dropare-education-resources-v2-')).map(name=>caches.delete(name)));
    }
  }catch{}
  try{
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i);
      if(key?.startsWith('dropare-education-offline-materials-v2-')||key==='dropare-education-offline-materials-v1')localStorage.removeItem(key);
    }
  }catch{}
}

export default function PWARegister(){
  const pathname=usePathname();
  const role=pathname?.startsWith('/education/student')?'student':pathname?.startsWith('/education/lecturer')?'lecturer':pathname==='/education/admin'||pathname?.startsWith('/education/admin/')?'admin':null;
  const [installEvent,setInstallEvent]=useState(null);
  const [installed,setInstalled]=useState(false);
  const [online,setOnline]=useState(true);

  useEffect(()=>{
    if('serviceWorker' in navigator){
      const register=()=>navigator.serviceWorker.register('/education-sw.js',{scope:'/education/'}).catch(()=>{});
      if(document.readyState==='complete')register(); else window.addEventListener('load',register,{once:true});
    }

    fetch('/api/education/me',{cache:'no-store',credentials:'include'})
      .then(response=>{if(response.status===401||response.status===403)return clearPrivateEducationData();})
      .catch(()=>{});

    const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true;
    setOnline(navigator.onLine);
    if(standalone)setInstalled(true);

    const beforeInstall=event=>{
      event.preventDefault();
      setInstallEvent(event);
    };
    const appInstalled=()=>{setInstalled(true);setInstallEvent(null);};
    const connectionChanged=()=>setOnline(navigator.onLine);
    window.addEventListener('beforeinstallprompt',beforeInstall);
    window.addEventListener('appinstalled',appInstalled);
    window.addEventListener('online',connectionChanged);
    window.addEventListener('offline',connectionChanged);
    return ()=>{
      window.removeEventListener('beforeinstallprompt',beforeInstall);
      window.removeEventListener('appinstalled',appInstalled);
      window.removeEventListener('online',connectionChanged);
      window.removeEventListener('offline',connectionChanged);
    };
  },[]);

  async function install(){
    if(!installEvent){
      window.alert('To install Dropare Education, open your browser menu and choose “Install app” or “Add to Home screen”.');
      return;
    }
    await installEvent.prompt();
    await installEvent.userChoice.catch(()=>null);
    setInstallEvent(null);
  }

  return <div aria-label="Education app status" className={styles.bar}>
    <div role="status" className={`${styles.status} ${online?styles.online:styles.offline}`}>
      <span aria-hidden="true" className={styles.dot}/>{online?'Online':'Offline'}
    </div>
    {!installed&&<button type="button" onClick={install} className={styles.install}>Install app</button>}
    {role&&<details className={styles.profile}>
      <summary aria-label={role==='student'?'My Profile menu':'Account menu'}><UserRound size={16}/><span>{role==='student'?'My Profile':'Account'}</span></summary>
      <div className={styles.dropdown}>
        {role==='student'&&<Link href="/education/student/profile">My Profile</Link>}
        <EducationLogoutButton admin={role==='admin'} menu/>
      </div>
    </details>}
  </div>;
}
