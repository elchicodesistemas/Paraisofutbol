import {useEffect,useState,type FormEvent} from 'react';
import ClubHeader from '../components/club-header';
import {currentUser,login,logout,roleNames,type Role} from './auth';
import {clubRequest} from './service';
import {clock} from '../lib/club';

export function AccessGate({roles,children}:{roles:Role[];children:React.ReactNode}){
  const user=currentUser();
  if(user&&roles.includes(user.role))return <>{children}</>;
  return <><ClubHeader/><main className="servicepage"><h1>{user?'Este acceso no corresponde a tu perfil.':'Ingresá para continuar.'}</h1><p className="lead">Disponible para: {roles.map(r=>roleNames[r]).join(', ')}.</p><a className="primary" href={user?'/mi-cuenta':'/login'}>{user?'Ir a mi espacio':'Login'}</a></main></>;
}
export function PendingRegistration(){return <><ClubHeader/><main className="servicepage"><h1>Inscripciones</h1><p className="notice">Las inscripciones y los certificados todavía no están habilitados en este entorno de pruebas.</p><a className="primary" href="/mi-cuenta">Ir a mi espacio</a></main></>;}

export function LoginPage(){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');setBusy(true);const data=new FormData(event.currentTarget);
    try{await login(String(data.get('email')),String(data.get('password')));location.assign('/mi-cuenta');}
    catch(error){setError((error as Error).message);}finally{setBusy(false);}
  }
  return <><ClubHeader/><main className="servicepage"><p className="eyebrow green">TU LUGAR EN EL EQUIPO</p><h1>Ingresá a El Paraíso.</h1><p className="lead">Usá el correo y la contraseña de tu cuenta de prueba.</p><form className="formcard" onSubmit={submit}><label className="field">Correo electrónico<input name="email" type="email" autoComplete="username" required/></label><label className="field account-field">Contraseña<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<p className="formerror" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Ingresando…':'Ingresar →'}</button><p className="fieldhint">Las cuentas y los permisos los asigna la administración. Los antiguos usuarios demo ya no sirven para ingresar.</p></form></main></>;
}

export function AccountPage(){
  const user=currentUser();const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function load(){setBusy(true);setError('');try{const r=await clubRequest('/api/club?action=workspace');const d=await r.json();if(!r.ok)throw Error(d.error);setData(d);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  useEffect(()=>{void load();},[]);
  if(!user)return <AccessGate roles={['admin','family','student','teacher']}><></></AccessGate>;
  return <><ClubHeader/><main className="servicepage"><div className="account-heading"><div><p className="eyebrow green">{roleNames[user.role]}</p><h1>Hola, {user.name}.</h1></div><button className="secondarybutton" onClick={async()=>{try{await logout();}finally{location.assign('/login');}}}>Cerrar sesión</button></div><p className="notice">Entorno de desarrollo. Las reservas se guardan en la nube y podés consultarlas desde otro dispositivo con tu cuenta. Usá datos ficticios; no transfieras dinero.</p>
  {user.role==='admin'&&<section className="formcard"><h2>Administración del club</h2><a className="primary" href="/gestion">Abrir gestión →</a></section>}
  {['admin','family'].includes(user.role)&&<section className="formcard"><a className="primary" href="/reservas">Reservar una cancha ↗</a></section>}
  <p className="fieldhint">Inscripciones, clases y asistencias: pendientes de habilitación.</p>
  {error&&<p className="formerror" role="alert">{error}</p>}<button className="secondarybutton" disabled={busy} onClick={()=>void load()}>{busy?'Cargando…':'Actualizar reservas'}</button>
  {data&&['admin','family'].includes(user.role)&&<section className="formcard"><h2>{user.role==='admin'?'Reservas del club':'Mis reservas'}</h2>{!data.bookings.length?<p>Todavía no hay reservas.</p>:data.bookings.map((row:any)=><article className="student-row" key={row.id}><div><strong>{row.court} · {row.date} · {clock(row.start)}–{clock(row.end)}</strong><small>{row.status}</small><small className="reference">{row.id}</small></div></article>)}</section>}
  </main></>;
}
