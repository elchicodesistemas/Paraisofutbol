import {createStore} from '../../../../public/src/core/store.js';
import {currentUser,allowed,canSubmit} from './demo-auth.ts';
import {courts,defaults,timeSlots,validDate,sports,registrationFields,rulesVersion,under18} from '../lib/club.ts';
// Deliberately local: never submit pilot data to the original club API.
const tenantId='paraiso-pilot';
let pendingBooking:Promise<unknown>=Promise.resolve();
const store=createStore({tenantId},null);
const settingsKey=`nexo:settings:${tenantId}`;
const settings=()=>JSON.parse(localStorage.getItem(settingsKey)||JSON.stringify(defaults));
const records=async(kind:string)=>(await store.list(kind==='bookings'?'agenda':'documents')).map((r:any)=>({...r.data,id:r.id}));
const statusRows=()=>store.list('pilot-status');
async function resolved(kind:string){const changes=await statusRows();return (await records(kind)).map((r:any)=>({...r,status:changes.find((s:any)=>s.data.recordId===r.id&&s.data.kind===kind)?.data.status||r.status}));}
const reply=(body:any,status=200)=>Response.json(body,{status});
const students=[{id:'student-demo',name:'Alex · demo',familyId:'family-demo',teacherId:'teacher-demo'},{id:'student-2-demo',name:'Luz · demo',familyId:'other-family-demo',teacherId:'teacher-demo'}];
export async function clubRequest(path:string,options:any={}):Promise<Response>{
  try {
    const url=new URL(path,'http://pilot.local');
    const config=settings();
    const user=currentUser();
    if(options.method!=='POST'){
      if(url.searchParams.get('action')==='admin'){
        if(!allowed(user,['admin']))return reply({error:'Acceso exclusivo de administración.'},403);
        return reply({bookings:await resolved('bookings'),registrations:await resolved('registrations'),config});
      }
      if(url.searchParams.get('action')==='workspace'){
        if(!user)return reply({error:'Ingresá a tu cuenta.'},401);
        const attendance=await store.list('pilot-attendance');
        const visibleStudents=students.filter(s=>user.role==='admin'||(user.role==='teacher'&&s.teacherId===user.id)||(user.role==='family'&&s.familyId===user.id)||(user.role==='student'&&s.id===user.id)).map(s=>({id:s.id,name:s.name,present:attendance.find((r:any)=>r.data.studentId===s.id)?.data.present??null}));
        const own=(rows:any[])=>rows.filter(row=>user.role==='admin'||(user.role==='family'&&row.ownerId===user.id)).map(({data,dni,phone,...row})=>row);
        return reply({students:visibleStudents,bookings:own(await resolved('bookings')),registrations:own(await resolved('registrations'))});
      }
      const court=url.searchParams.get('court'),date=url.searchParams.get('date');
      if(!court||!date)return reply({config,courts});
      if(!courts.includes(court)||!validDate(date))throw Error('Elegí cancha y fecha válidas.');
      const occupied=(await resolved('bookings')).filter((r:any)=>r.court===court&&r.date===date&&r.status!=='cancelada');
      return reply({config,slots:config.enabled?timeSlots(config,date).map(start=>({start,available:!occupied.some((r:any)=>start<r.end&&start+config.duration>r.start)})):[]});
    }
    const form=options.body as FormData;
    const get=(key:string)=>String(form.get(key)||'').trim();
    const action=get('action');
    if(!user)return reply({error:'Ingresá a tu cuenta para continuar.'},401);
    if(['settings','status'].includes(action)&&!allowed(user,['admin']))return reply({error:'Tu perfil no puede administrar solicitudes ni configurar la agenda.'},403);
    if(['booking','registration'].includes(action)&&!canSubmit(user))return reply({error:'Las solicitudes corresponden a familias o administración.'},403);
    if(action==='attendance'){
      if(!allowed(user,['admin','teacher']))return reply({error:'Tu perfil solo puede consultar asistencia.'},403);
      const student=students.find(s=>s.id===get('studentId')&&(user.role==='admin'||s.teacherId===user.id));
      if(!student||!['true','false'].includes(get('present')))return reply({error:'Alumno o asistencia inválidos.'},400);
      await store.add('pilot-attendance',{title:`Asistencia · ${student.name}`,studentId:student.id,present:get('present')==='true',actorId:user.id});
      return reply({ok:true});
    }
    if(action==='settings'){
      const next={enabled:get('enabled')==='true',open:Number(get('open')),close:Number(get('close')),duration:Number(get('duration')),deposit:Number(get('deposit')),payment:get('payment')};
      if(!Number.isInteger(next.open)||!Number.isInteger(next.close)||next.open<0||next.close>24||next.close<=next.open||![30,60,90,120].includes(next.duration)||!Number.isFinite(next.deposit)||next.deposit<0)throw Error('Configuración inválida.');
      localStorage.setItem(settingsKey,JSON.stringify(next));return reply({ok:true});
    }
    if(action==='status'){
      const kind=get('kind');const row=(await resolved(kind)).find((r:any)=>r.id===get('id'));
      const allowed=kind==='bookings'?['confirmada','cancelada']:kind==='registrations'?['aceptada','rechazada']:[];
      if(!row||!allowed.includes(get('status'))||row.status==='cancelada')throw Error('Cambio de estado inválido.');
      await store.add('pilot-status',{title:'Cambio de estado',recordId:row.id,kind,status:get('status')});return reply({ok:true});
    }
    if(action==='booking'){
      const book=async()=>{
        const rows=await resolved('bookings');
        const previous=rows.find((r:any)=>r.requestId===get('id')&&r.ownerId===user.id);
        if(previous)return reply({id:previous.id});
        const court=get('court'),date=get('date'),start=Number(get('start'));
        if(!config.enabled||!validDate(date)||!courts.includes(court)||!timeSlots(config,date).includes(start))throw Error('El turno no corresponde a la agenda.');
        if(rows.some((r:any)=>r.court===court&&r.date===date&&r.status!=='cancelada'&&start<r.end&&start+config.duration>r.start))throw Error('Ese turno ya está ocupado. Actualizá la disponibilidad.');
        if(get('name').length<3||!/^\d{6,10}$/.test(get('dni'))||! /^[+\d ()-]{6,25}$/.test(get('phone')))throw Error('Revisá los datos de prueba.');
        const row=await store.add('agenda',{title:`${court} · ${get('name')}`,ownerId:user.id,requestId:get('id'),court,date,start,end:start+config.duration,name:get('name'),dni:get('dni'),phone:get('phone'),status:'pendiente',deposit:config.deposit,payment:config.payment});
        return reply({id:row.id,status:'pendiente'},201);
      };
      // Serializes same-origin tabs; not a substitute for a database constraint.
      if(navigator.locks)return await navigator.locks.request(`${tenantId}:booking`,book);
      // HTTP LAN demo only: serialize this page, without a cross-tab guarantee.
      const result=pendingBooking.then(book,book);
      pendingBooking=result.catch(()=>{});
      return await result;
    }
    if(action==='registration'){
      const file=form.get('medical');if(file instanceof File&&file.size)throw Error('El piloto no guarda certificados. Usá datos ficticios y dejá el archivo vacío.');
      const data:any={};for(const [key,,,required] of registrationFields){data[key]=get(key);if(required&&!data[key])throw Error('Completá los campos obligatorios.');}
      if(!sports.includes(get('sport'))||!validDate(data.birth)||Date.parse(data.birth)>Date.now()||get('agree')!=='true')throw Error('Revisá actividad, fecha y acuerdos.');
      if(under18(data.birth)&&(!data.guardian||!data.guardianDni))throw Error('Completá los datos ficticios del tutor.');
      const previous=(await records('registrations')).find((r:any)=>r.requestId===get('id')&&r.ownerId===user.id);if(previous)return reply({id:previous.id});
      Object.assign(data,{sex:get('sex'),agreement:rulesVersion,acceptedAt:new Date().toISOString()});
      const row=await store.add('documents',{title:`Inscripción · ${data.name}`,ownerId:user.id,requestId:get('id'),sport:get('sport'),name:data.name,dni:data.dni,status:'pendiente',file:null,data:JSON.stringify(data),created:new Date().toISOString()});
      return reply({id:row.id},201);
    }
    throw Error('Acción no disponible en el piloto.');
  }catch(error){return reply({error:error instanceof Error?error.message:'No se pudo completar la operación.'},400);}
}
