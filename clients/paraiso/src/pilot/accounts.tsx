import {useEffect,useState,type FormEvent} from 'react';
import ClubHeader from '../components/club-header';
import {currentUser,demoPassword,demoUsers,login,logout,roleNames,type Role} from './auth';
import {clubRequest} from './service';

export function AccessGate({roles,children}:{roles:Role[];children:React.ReactNode}){
  const user=currentUser();
  if(user&&roles.includes(user.role))return <>{children}</>;
  return <><ClubHeader/><main className="servicepage"><p className="eyebrow green">ACCESO A LA PLATAFORMA</p><h1>{user?'Este acceso no corresponde a tu perfil.':'Ingresá para continuar.'}</h1><p className="lead">Disponible para: {roles.map(r=>roleNames[r]).join(', ')}.</p><a className="primary" href={user?'/mi-cuenta':'/login'}>{user?'Ir a mi espacio':'Login'}</a></main></>;
}

export function LoginPage(){
  const [error,setError]=useState('');const [username,setUsername]=useState('');
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setError('');const data=new FormData(event.currentTarget);try{login(username,String(data.get('password')));location.assign('/mi-cuenta');}catch(error){setError((error as Error).message);}}
  return <><ClubHeader/><main className="servicepage"><p className="eyebrow green">TU LUGAR EN EL EQUIPO</p><h1>Ingresá a El Paraíso.</h1><p className="lead">Elegí una cuenta de prueba para conocer el espacio de cada perfil.</p><div className="account-layout"><form className="formcard" onSubmit={submit}><h2>Login</h2><label className="field">Usuario<input name="username" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></label><label className="field account-field">Contraseña<input name="password" type="password" autoComplete="current-password" required/></label>{error&&<p className="formerror" role="alert">{error}</p>}<button className="primary" type="submit">Ingresar →</button><p className="fieldhint">Sesión demo por pestaña, válida durante 8 horas. No uses una contraseña personal.</p></form><section className="formcard"><h2>Cuentas de prueba</h2><p>Contraseña para todas: <strong>{demoPassword}</strong></p><div className="demo-accounts">{demoUsers.map(user=><button key={user.id} className="demo-account" onClick={()=>setUsername(user.username)} type="button"><strong>{roleNames[user.role]}</strong><code>{user.username}</code><small>{user.role==='admin'?'Gestiona todas las solicitudes y la agenda.':user.role==='family'?'Crea y consulta sus reservas e inscripciones.':user.role==='student'?'Consulta sus clases y asistencia.':'Consulta su grupo y registra asistencia.'}</small></button>)}</div><p className="fieldhint">Estos accesos simulan roles en el navegador. No son autenticación ni protección para datos reales.</p></section></div></main></>;
}

export function AccountPage(){
  const user=currentUser();const [data,setData]=useState<any>(null);const [error,setError]=useState('');
  async function load(){const response=await clubRequest('/api/club?action=workspace');const body=await response.json();if(!response.ok)throw Error(body.error);setData(body);}
  useEffect(()=>{load().catch(error=>setError(error.message));},[]);
  if(!user)return <AccessGate roles={['admin','family','student','teacher']}><></></AccessGate>;
  async function attendance(studentId:string,present:boolean){try{const form=new FormData();form.set('action','attendance');form.set('studentId',studentId);form.set('present',String(present));const r=await clubRequest('/api/club',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw Error(d.error);await load();}catch(error){setError((error as Error).message);}}
  return <><ClubHeader/><main className="servicepage"><div className="account-heading"><div><p className="eyebrow green">{roleNames[user.role]}</p><h1>Hola, {user.name}.</h1></div><button className="secondarybutton" onClick={()=>{logout();location.assign('/login');}}>Cerrar sesión</button></div><p className="notice">Espacio de prueba. Los datos son ficticios y se comparten solo entre las cuentas de este navegador y esta dirección web.</p>{error&&<p className="formerror" role="alert">{error}</p>}
  {user.role==='admin'&&<section className="formcard"><h2>Administración del club</h2><p>Revisá todas las reservas e inscripciones, cambiá sus estados y configurá horarios y señas de ejemplo.</p><a className="primary" href="/gestion">Abrir gestión →</a></section>}
  {user.role==='family'&&<section className="formcard"><h2>Organizá tu próxima visita</h2><div className="activityactions"><a href="/reservas">Reservar una cancha ↗</a><a href="/inscripciones">Inscribir a un alumno ↗</a></div><p className="fieldhint">Tus solicitudes quedan asociadas a esta cuenta de familia.</p></section>}
  {!data&&!error&&<p role="status">Cargando tu espacio…</p>}
  {data&&<>
    <section className="formcard"><h2>{user.role==='teacher'?'Mi grupo y asistencia':'Clases de ejemplo'}</h2><p>Fútbol · Infantiles A · Martes y jueves, 18:00–19:00 · Cancha 2.</p><p className="fieldhint">Horario ilustrativo. Profesor: Marcos. La asistencia corresponde a una clase de prueba.</p>{data.students.map((student:any)=><article className="student-row" key={student.id}><span><strong>{student.name}</strong><small>{student.present===null?'Sin registrar':student.present?'Presente':'Ausente'}</small></span>{['admin','teacher'].includes(user.role)&&<div className="attendance-buttons"><button className="secondarybutton" aria-pressed={student.present===true} onClick={()=>attendance(student.id,true)}>Presente · {student.name}</button><button className="secondarybutton" aria-pressed={student.present===false} onClick={()=>attendance(student.id,false)}>Ausente · {student.name}</button></div>}</article>)}</section>
    {['admin','family'].includes(user.role)&&<div className="account-layout">{(['bookings','registrations'] as const).map(kind=><section className="formcard" key={kind}><h2>{kind==='bookings'?'Reservas':'Inscripciones'} {user.role==='family'?'de mi familia':''}</h2>{!data[kind].length?<p>Todavía no hay solicitudes.</p>:data[kind].map((row:any)=><article className="student-row" key={row.id}><div><strong>{kind==='bookings'?`${row.court} · ${row.date}`:`${row.name} · ${row.sport}`}</strong><small>{row.status}</small></div></article>)}</section>)}</div>}
  </>}</main></>;
}
