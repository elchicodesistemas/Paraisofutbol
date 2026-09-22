import {useEffect,useRef,useState} from 'react';
import {LayoutDashboard,Users,CalendarDays,Wallet,Shirt,Trophy,Tags,Bell,Layers,MapPin,Menu,ChevronRight,RefreshCw,LogOut} from 'lucide-react';
import {SchoolContext,list} from './shared';
import {Students,Categories,Staff} from './people';
import {Training} from './training';
import {Finance} from './finance';
import {Matches} from './matches';
import {Overview} from './overview';
import {localDay} from './metrics.mjs';
import {currentUser,logout} from '../auth';
import {PeopleAdmin} from '../people-admin';
import {AdminNotifications} from '../notifications';
import ClubAdmin from '../../components/club-admin';
const common=['school_categories','school_students','school_staff','school_assignments','school_sessions','school_attendance','school_matches','school_callups','school_files'];
const restricted=['school_tutors','school_medical','school_staff_pay','school_charges','school_payments','school_expenses','club_people','club_members','club_bookings'];
const nav=[
 {id:'resumen',name:'Resumen',group:'GENERAL',icon:LayoutDashboard},
 {id:'alumnos',name:'Alumnos y tutores',group:'OPERACIÓN',icon:Users},
 {id:'categorias',name:'Categorías',group:'OPERACIÓN',icon:Layers},
 {id:'avisos',name:'Comunicación',group:'OPERACIÓN',icon:Bell},
 {id:'cobranzas',name:'Cuentas y cobranzas',group:'FINANZAS',icon:Wallet},
 {id:'entrenamientos',name:'Entrenamientos',group:'DEPORTIVO',icon:CalendarDays},
 {id:'profesores',name:'Profesores y staff',group:'DEPORTIVO',icon:Shirt},
 {id:'partidos',name:'Partidos',group:'DEPORTIVO',icon:Trophy},
 {id:'cuentas',name:'Cuentas y etiquetas',group:'ADMINISTRACIÓN',icon:Tags},
 {id:'reservas',name:'Canchas y reservas',group:'ADMINISTRACIÓN',icon:MapPin}
];
export default function School(){
 const user=currentUser()!,admin=user.role==='admin';
 const [data,setData]=useState<Record<string,any[]>>({}),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState(false),[section,setSection]=useState(location.hash.slice(1)|| (admin?'resumen':'entrenamientos'));
 const inFlight=useRef(false);const items=nav.filter(n=>admin||['entrenamientos','partidos'].includes(n.id)),active=items.find(n=>n.id===section)||items[0];
 async function refresh(){const names=admin?[...common,...restricted]:common;const results=await Promise.allSettled(names.map(list));const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;const next:Record<string,any[]>=Object.fromEntries([...common,...restricted].map(n=>[n,[]]));results.forEach((r,i)=>{if(r.status==='fulfilled')next[names[i]]=r.value;});setData(next);setLoaded(true);}
 async function run(work:()=>Promise<void>){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setMessage('');try{await work();}catch(e){let text=(e as Error).message||'No pudimos completar la operación.';if(text.includes('school_tutors_birth_date_check'))text='El adulto responsable debe tener al menos 18 años.';else if(text.includes('duplicate key'))text='Ese registro ya existe. Revisá nombres, cuotas del mes o matrícula de la temporada antes de volver a guardar.';else if(text.includes('foreign key'))text='Falta un registro relacionado válido. Revisá el tutor, la categoría o la cuenta vinculada.';else if(text.includes('check constraint')||text.includes('null value'))text='Revisá los campos obligatorios, importes y rangos indicados en el formulario.';setError(text);}finally{setBusy(false);inFlight.current=false;}}
 function go(id:string){location.hash=id;setSection(id);setOpen(false);setMessage('');setError('');}
 useEffect(()=>{void run(refresh);const changed=()=>{setSection(location.hash.slice(1));setOpen(false);};window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
 const views:Record<string,()=>React.ReactNode>={resumen:()=> <Overview/>,alumnos:()=> <Students/>,categorias:()=> <Categories/>,entrenamientos:()=> <Training/>,profesores:()=> <Staff/>,cobranzas:()=> <Finance/>,partidos:()=> <Matches/>,avisos:()=> <><div className="sc-section-intro"><div><span className="sc-overline">COMUNICACIÓN</span><h1>Avisos del club</h1><p>Recordatorios individuales de pago y actividad.</p></div><button className="sc-primary" onClick={()=>go('cuentas')}>Enviar a un grupo →</button></div><AdminNotifications/></>,cuentas:()=> <><h1>Cuentas y etiquetas</h1><div className="sc-notice">Accesos, grupos y cuotas anteriores por persona. Las nuevas cuotas por alumno se administran en Cuentas y cobranzas. Vinculá después esta persona con la ficha del tutor para avisarle las convocatorias.</div><PeopleAdmin/></>,reservas:()=> <><h1>Canchas y reservas</h1><ClubAdmin/></>};
 return <SchoolContext.Provider value={{data,admin,busy,run,refresh,go,notice:setMessage}}><div className="sc-shell">{open&&<button className="sc-backdrop" aria-label="Cerrar menú" onClick={()=>setOpen(false)}/>}
 <aside className={'sc-sidebar '+(open?'is-open':'')} aria-label="Menú de gestión"><button className="sc-sidebar-close" onClick={()=>setOpen(false)} aria-label="Cerrar menú lateral">×</button><a className="sc-brand" href="/"><img src="/escudo.png" alt=""/><span>EL PARAÍSO<small>GESTIÓN DEPORTIVA</small></span></a><div className="sc-club"><span className="sc-dot"/>Escuela de fútbol<small>Temporada {localDay().slice(0,4)}</small></div><nav className="sc-nav">{items.map((item,i)=>{const Icon=item.icon;return <div key={item.id}>{(i===0||items[i-1].group!==item.group)&&<p>{item.group}</p>}<button onClick={()=>go(item.id)} aria-current={active.id===item.id?'page':undefined}><Icon size={18}/><span>{item.name}</span>{active.id===item.id&&<ChevronRight size={15}/>}</button></div>;})}</nav><div className="sc-sidebar-foot"><span className="sc-avatar">{user.name.slice(0,1)}</span><div><strong>{user.name}</strong><small>{admin?'Administración':'Profesor'}</small><a href="/mi-cuenta">Mi cuenta ↗</a></div><button aria-label="Cerrar sesión" disabled={busy} onClick={()=>void run(async()=>{await logout();location.assign('/login');})}><LogOut size={18}/></button></div></aside>
 <div className="sc-workspace"><div className="sc-topbar"><div><button className="sc-menu" aria-label="Abrir o cerrar menú" aria-expanded={open} onClick={()=>setOpen(!open)}><Menu size={22}/></button><span>Mi club <ChevronRight size={14}/> <strong>{active.name}</strong></span></div><div><span className="sc-badge green">{admin?'Administrador':'Profesor'}</span><button className="sc-icon-button" title="Actualizar datos" aria-label="Actualizar datos" disabled={busy} onClick={()=>void run(refresh)}><RefreshCw size={18}/></button></div></div>
 <main className="sc-main" id="contenido-gestion">{error&&<div role="alert" className="sc-error"><strong>No se pudo completar la acción</strong><p>{error}</p><button className="sc-quiet" disabled={busy} onClick={()=>void run(refresh)}>Volver a consultar datos</button></div>}{message&&<p role="status" className="sc-notice">{message}</p>}{loaded?views[active.id]():<div role="status" className="sc-loading"><span className="sc-overline">EL PARAÍSO</span><h1>{busy?'Cargando tu club…':'Datos no disponibles'}</h1><p>{busy?'Consultando alumnos, agenda y movimientos guardados.':'Reintentá la consulta para abrir el panel.'}</p></div>}</main>
 <div className="sc-bottom-note">El Paraíso Deportes · Desarrollo · Usar datos ficticios</div></div></div></SchoolContext.Provider>;
}
