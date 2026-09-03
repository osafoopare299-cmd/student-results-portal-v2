'use client';
import { useEffect } from 'react';

export default function PWARegister(){
  useEffect(()=>{
    if(!('serviceWorker' in navigator))return;
    const register=()=>navigator.serviceWorker.register('/education-sw.js',{scope:'/education/'}).catch(()=>{});
    if(document.readyState==='complete')register(); else window.addEventListener('load',register,{once:true});
  },[]);
  return null;
}
