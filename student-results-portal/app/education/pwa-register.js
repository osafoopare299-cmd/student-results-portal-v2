'use client';
import { useEffect, useState } from 'react';

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

  return <div aria-label="Education app status" style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,padding:'8px 12px',minHeight:44,boxSizing:'border-box',borderBottom:'1px solid #dce9e3',background:'#f8fcfa',fontFamily:'Arial,sans-serif'}}>
    <div role="status" style={{display:'flex',alignItems:'center',gap:7,border:`1px solid ${online?'#b9d9cc':'#e8c98e'}`,background:online?'#edf8f3':'#fff5df',color:online?'#176a4c':'#8a5700',padding:'9px 12px',borderRadius:999,boxShadow:'0 8px 24px rgba(19,61,43,.12)',fontSize:11,fontWeight:850,letterSpacing:'.08em',whiteSpace:'nowrap'}}>
      <span aria-hidden="true" style={{width:7,height:7,borderRadius:'50%',background:online?'#1b9b68':'#d38316'}}/>{online?'ONLINE':'OFFLINE'}
    </div>
    {!installed&&<button type="button" onClick={install} style={{border:0,background:'#0d6848',color:'#fff',padding:'10px 14px',borderRadius:999,boxShadow:'0 8px 24px rgba(19,61,43,.18)',fontSize:12,fontWeight:850,cursor:'pointer',whiteSpace:'nowrap'}}>Install app</button>}
  </div>;
}
