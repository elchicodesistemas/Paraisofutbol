import {useEffect,useState,type FormEvent} from 'react';
import {backend,rpc,tenantId} from './backend';
import {currentUser,roleNames} from './auth';
import {pushSupported,pushRegistration,ownDevice,enablePush,disablePush,deliveryMessage} from './push-client';
import {randomId} from '../../../../public/src/core/id.js';

export function Notifications(){
  const [publicKey,setKey]=useState(''),[active,setActive]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[rows,setRows]=useState<any[]>([]);
  const supported=pushSupported();
  async function load(){
    const user=currentUser();if(!user)return;
    const items=await backend.request(`/rest/v1/club_notifications?tenant_id=eq.${tenantId}&recipient_id=eq.${user.id}&select=id,title,body,created_at&order=created_at.desc&limit=30`);setRows(items);
  }
  useEffect(()=>{
    let alive=true;
    fetch('/api/push/config').then(async r=>{if(!r.ok)throw Error('El servicio de avisos no está disponible.');const data=await r.json();if(alive)setKey(data.publicKey);}).catch(e=>{if(alive)setError(e.message);});
    if(supported)pushRegistration().then(async r=>{const isOwn=await ownDevice(await r.pushManager.getSubscription());if(alive)setActive(isOwn&&Notification.permission==='granted');}).catch(e=>{if(alive)setError(e.message);});
    void load().catch(e=>{if(alive)setError(e.message);});
    return()=>{alive=false;};
  },[]);
  async function activate(){setBusy(true);setError('');setMessage('');try{await enablePush(publicKey);setActive(true);setMessage('Avisos activados en este dispositivo. Probá el botón de prueba.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function deactivate(){setBusy(true);setError('');try{await disablePush();setMessage('Avisos desactivados en este dispositivo.');}catch(e){setError((e as Error).message);}finally{setActive(false);setBusy(false);}}
  async function test(){setBusy(true);setError('');try{const result=await backend.localRequest('/api/push/send',{requestId:randomId(),recipientId:currentUser()!.id,kind:'test',title:'El Paraíso · Aviso de prueba',body:'¡Listo! Este dispositivo puede recibir recordatorios del club.'});setMessage(deliveryMessage(result));await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="formcard" id="avisos"><h2>Avisos del club</h2><p>Recibí recordatorios de pagos y actividades, incluso cuando no estés mirando la app.</p><p className="fieldhint">iPhone: Safari → Compartir → Agregar a pantalla de inicio. Abrí la app desde ese ícono y activá los avisos (iOS 16.4 o posterior). Android: abrí el enlace en Chrome, instalá la app si aparece la opción y permití las notificaciones.</p><p className="notice">{!supported?'Este navegador no permite activar push. Seguí las instrucciones de instalación o abrí el enlace en Safari / Chrome.':active?'Notificaciones activadas en este dispositivo.':'Las notificaciones todavía no están activadas en este dispositivo.'}</p>
    <div className="activityactions">{active?<><button className="primary" disabled={busy} onClick={()=>void test()}>Enviar aviso de prueba</button><button className="secondarybutton" disabled={busy} onClick={()=>void deactivate()}>Desactivar en este dispositivo</button></>:<button className="primary" disabled={busy||!supported||!publicKey} onClick={()=>void activate()}>{busy?'Activando…':'Activar notificaciones'}</button>}</div>
    {error&&<p className="formerror" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}
    <h3>Mis últimos avisos</h3><button className="secondarybutton" onClick={()=>void load().catch(e=>setError(e.message))}>Actualizar avisos</button>{!rows.length?<p>Todavía no hay avisos.</p>:rows.map(row=><article className="formcard" key={row.id}><strong>{row.title}</strong><p>{row.body}</p><small>{new Date(row.created_at).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</small></article>)}
    <p className="fieldhint">Al cerrar sesión se desactivan los avisos en este dispositivo para proteger las cuentas compartidas. Para la demostración, dejá la sesión iniciada y cerrá la app.</p>
  </section>;
}
const templates={payment:{title:'El Paraíso · Recordatorio de pago',body:'Te recordamos que tenés un pago pendiente. Consultá con la administración del club.'},activity:{title:'El Paraíso · Recordatorio de actividad',body:'¡Te esperamos mañana en tu actividad! Recordá traer agua y tu equipo.'}};
const statuses:Record<string,string>={accepted:'Aceptado por el servicio push',partial:'Envío parcial',failed:'No se pudo enviar push',no_devices:'Sin dispositivos activados',sending:'Resultado de envío pendiente'};
export function AdminNotifications(){
  const [targets,setTargets]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[recipient,setRecipient]=useState(''),[kind,setKind]=useState<'payment'|'activity'>('payment'),[title,setTitle]=useState(templates.payment.title),[body,setBody]=useState(templates.payment.body),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function load(){
    const [users,history]=await Promise.all([rpc('club_push_targets'),backend.request(`/rest/v1/club_notifications?tenant_id=eq.${tenantId}&select=id,recipient_id,title,status,accepted,failed,created_at&order=created_at.desc&limit=20`)]);
    setTargets(users);setRows(history);
  }
  useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
  async function send(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await backend.localRequest('/api/push/send',{requestId:randomId(),recipientId:recipient,kind,title,body});setMessage(deliveryMessage(result));await load();}catch(e){setError((e as Error).message);void load().catch(()=>{});}finally{setBusy(false);}}
  return <section className="formcard"><h2>Enviar un recordatorio</h2><p>Envío manual a los dispositivos activados de una cuenta. El aviso también se guarda en su bandeja.</p><form className="nativeform" onSubmit={send}><div className="formfields"><label className="field">Destinatario<select required value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">Elegí una cuenta</option>{targets.map(user=><option key={user.user_id} value={user.user_id}>{user.display_name} · {roleNames[user.role as keyof typeof roleNames]} · {user.devices} dispositivo(s)</option>)}</select></label><label className="field">Tipo de aviso<select value={kind} onChange={e=>{const next=e.target.value as typeof kind;setKind(next);setTitle(templates[next].title);setBody(templates[next].body);}}><option value="payment">Pendiente de pago</option><option value="activity">Recordatorio de actividad</option></select></label><label className="field">Título<input required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="field">Mensaje<textarea required maxLength={240} rows={3} value={body} onChange={e=>setBody(e.target.value)}/></label></div><p className="fieldhint">El texto puede verse en la pantalla bloqueada. Usá datos ficticios para la demostración. Este aviso no genera una deuda ni realiza un cobro.</p><button className="primary" disabled={busy||!recipient}>{busy?'Enviando…':'Enviar recordatorio ahora'}</button></form>
    {error&&<p className="formerror" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}<h3>Últimos envíos</h3><button className="secondarybutton" disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}>Actualizar dispositivos e historial</button>{rows.map(row=><article className="student-row" key={row.id}><div><strong>{row.title}</strong><small>{targets.find(t=>t.user_id===row.recipient_id)?.display_name||'Cuenta del club'} · {statuses[row.status]}</small><small>{row.accepted} aceptado(s) · {row.failed} fallido(s) · {new Date(row.created_at).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}</small></div></article>)}<p className="fieldhint">“Aceptado” indica que el proveedor push aceptó el mensaje; no confirma recepción ni lectura. Los recordatorios no están programados automáticamente.</p>
  </section>;
}
