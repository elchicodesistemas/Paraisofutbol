'use client';
import {useState,useEffect} from 'react';
type InstallPrompt = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function Pwa(){
const [prompt,setPrompt]=useState<InstallPrompt|null>(null);const [offline,setOffline]=useState(false);const [help,setHelp]=useState(false);const [installed,setInstalled]=useState(false);
useEffect(()=>{setOffline(!navigator.onLine);setInstalled(matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
const online=()=>setOffline(!navigator.onLine);const before=(e:Event)=>{e.preventDefault();setPrompt(e as InstallPrompt)};const done=()=>{setInstalled(true);setPrompt(null)};
window.addEventListener('online',online);window.addEventListener('offline',online);window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',done);
if('serviceWorker' in navigator && location.hostname!=='localhost')navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',online);window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',done)}},[]);
async function install(){if(!prompt){setHelp(!help);return}try{await prompt.prompt();await prompt.userChoice;setPrompt(null)}catch{setHelp(true)}}
return <>{offline&&<div role="status" className="offlinebar">Sin conexión. Para reservar o enviar una inscripción necesitás internet. <a href="/offline.html">Ver información disponible</a></div>}{!installed&&<div className="installbar"><span>El Paraíso, a un toque en tu celular.</span><button onClick={install}>Instalar app ↗</button>{help&&<p role="status">En iPhone: abrí el sitio en Safari, tocá Compartir y “Agregar a inicio”. En Android o computadora: buscá “Instalar aplicación” o “Agregar a pantalla de inicio” en el menú del navegador. Si la opción no aparece, podés seguir usando la web.</p>}</div>}</>}
