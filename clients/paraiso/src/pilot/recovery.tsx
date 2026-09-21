import {useState,type FormEvent} from 'react';
import ClubHeader from '../components/club-header';
import config from '../../../../public/config.js';

const fragment=new URLSearchParams(location.hash.slice(1));
export const isRecovery=fragment.get('type')==='recovery'||fragment.has('error_code');
let token=isRecovery?fragment.get('access_token'):null;
if(isRecovery)history.replaceState(null,'',location.pathname);
async function authCall(path:string,body:object,access?:string){
  let response:Response;
  try{response=await fetch(`${config.supabase.url}/auth/v1/${path}`,{method:access?'PUT':'POST',headers:{apikey:config.supabase.publishableKey,'Content-Type':'application/json',...(access?{Authorization:`Bearer ${access}`}:{})},body:JSON.stringify(body)});}
  catch{throw Error('No pudimos conectar. Revisá tu conexión e intentá nuevamente.');}
  if(!response.ok){if(response.status===429)throw Error('Hubo varios intentos. Esperá unos minutos antes de volver a probar.');throw Error(access?'El enlace venció o la contraseña no cumple los requisitos. Pedí otro enlace o elegí una contraseña más segura.':'No pudimos solicitar el correo. Intentá más tarde o contactá a la administración.');}
}
export function PasswordField({name='password',label='Contraseña',fresh=false}:{name?:string;label?:string;fresh?:boolean}){
  const [visible,setVisible]=useState(false);
  return <div className="field account-field"><label htmlFor={name}>{label}</label><div className="password-entry"><input id={name} name={name} type={visible?'text':'password'} autoComplete={fresh?'new-password':'current-password'} minLength={fresh?8:undefined} required/><button type="button" aria-controls={name} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'Ocultar':'Mostrar'} contraseña</button></div></div>;
}
export function RecoveryPage(){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[done,setDone]=useState(false);
  const changing=isRecovery;
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setError('');setMessage('');const data=new FormData(e.currentTarget);
    if(changing&&data.get('password')!==data.get('confirmation')){setError('Las contraseñas no coinciden.');return;}
    setBusy(true);
    try{
      if(changing){
        if(!token)throw Error('El enlace venció o no es válido. Solicitá uno nuevo.');
        await authCall('user',{password:String(data.get('password'))},token);token=null;setDone(true);setMessage('Contraseña actualizada. Ya podés ingresar con tu nueva contraseña.');
      }else{
        await authCall(`recover?redirect_to=${encodeURIComponent(location.origin+'/login')}`,{email:String(data.get('email')).trim().toLowerCase()});
        setMessage('Si el correo corresponde a una cuenta habilitada, recibirás un enlace para restablecer la contraseña. Revisá también la carpeta de spam.');
      }
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <><ClubHeader/><main className="servicepage"><h1>{changing?'Elegí una nueva contraseña':'Restablecer contraseña'}</h1><form className="formcard" onSubmit={submit}>{!done&&(changing?token?<><PasswordField fresh label="Nueva contraseña"/><PasswordField fresh name="confirmation" label="Repetir nueva contraseña"/><p>Usá al menos 8 caracteres.</p></>:<p>El enlace venció o no es válido. <a href="/login?recuperar=1">Solicitá uno nuevo.</a></p>:<><label className="field">Correo electrónico<input name="email" type="email" autoComplete="email" required/></label><p>Las cuentas de prueba con correos ficticios no pueden recibir este mensaje.</p></>)}{error&&<p role="alert" className="formerror">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}{!done&&(!changing||token)&&<button className="primary" disabled={busy}>{busy?'Procesando…':changing?'Guardar contraseña':'Enviar enlace de recuperación'}</button>}<p><a href="/login">Volver al login</a></p></form></main></>;
}
