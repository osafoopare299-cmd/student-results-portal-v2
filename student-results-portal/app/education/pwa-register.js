'use client';
import { useEffect, useState } from 'react';

export default function PWARegister(){
  const [installEvent,setInstallEvent]=useState(null);
  const [visible,setVisible]=useState(false);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    if('serviceWorker' in navigator){
      const register=()=>navigator.serviceWorker.register('/education-sw.js',{scope:'/education/'}).catch(()=>{});
      if(document.readyState==='complete')register(); else window.addEventListener('load',register,{once:true});
    }

    const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true;
    if(standalone){setInstalled(true);return;}

    const dismissed=localStorage.getItem('dropare-education-install-dismissed-v1')==='1';
    const beforeInstall=event=>{
      event.preventDefault();
      setInstallEvent(event);
      if(!dismissed)setVisible(true);
    };
    const appInstalled=()=>{setInstalled(true);setVisible(false);setInstallEvent(null);};
    window.addEventListener('beforeinstallprompt',beforeInstall);
    window.addEventListener('appinstalled',appInstalled);
    return ()=>{
      window.removeEventListener('beforeinstallprompt',beforeInstall);
      window.removeEventListener('appinstalled',appInstalled);
    };
  },[]);

  async function install(){
    if(!installEvent)return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(()=>null);
    setInstallEvent(null);
    setVisible(false);
  }

  function dismiss(){
    localStorage.setItem('dropare-education-install-dismissed-v1','1');
    setVisible(false);
  }

  if(!visible||installed||!installEvent)return null;
  return <div role="dialog" aria-label="Install Dropare Education" style={{position:'fixed',left:'50%',bottom:18,transform:'translateX(-50%)',zIndex:9999,width:'min(92vw,520px)',background:'#fff',border:'1px solid #cfe1d8',borderRadius:18,padding:16,boxShadow:'0 18px 50px rgba(19,61,43,.22)',color:'#17352b'}}>
    <div style={{display:'flex',gap:12,alignItems:'center'}}>
      <img src="/education-icon.svg" alt="" width="46" height="46" style={{borderRadius:12}}/>
      <div style={{flex:1}}><b style={{display:'block',fontSize:15}}>Install Dropare Education</b><small style={{display:'block',marginTop:3,color:'#60786e',lineHeight:1.4}}>Add the Education Portal to this device for faster access and supported offline features.</small></div>
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
      <button onClick={dismiss} style={{border:'1px solid #d6e4dd',background:'#fff',color:'#45665a',padding:'9px 12px',borderRadius:10,fontWeight:800}}>Not now</button>
      <button onClick={install} style={{border:0,background:'#0d7548',color:'#fff',padding:'9px 14px',borderRadius:10,fontWeight:800}}>Install app</button>
    </div>
  </div>;
}
