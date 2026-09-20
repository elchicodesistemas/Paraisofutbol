import {backend,tenantId,rpc} from './backend.ts';
import {currentUser} from './auth.ts';
import {courts} from '../lib/club.ts';
const reply=(data:unknown,status=200)=>Response.json(data,{status});
const booking=(row:any)=>({...row,start:row.start_min,end:row.end_min,ownerId:row.owner_id});
async function settings(){
  const [row]=await backend.request(`/rest/v1/club_settings?tenant_id=eq.${tenantId}&select=*`);
  if(!row)throw Error('La agenda no está habilitada para esta cuenta.');
  return {enabled:row.enabled,open:row.open_hour,close:row.close_hour,duration:row.duration,deposit:Number(row.deposit),payment:row.payment};
}
export async function clubRequest(path:string,options:any={}):Promise<Response>{
  try{
    const user=currentUser();
    if(!user)return reply({error:'Ingresá a tu cuenta para continuar.'},401);
    const url=new URL(path,'https://pilot.local');
    if(options.method!=='POST'){
      const action=url.searchParams.get('action');
      if(action==='admin'||action==='workspace'){
        if(action==='admin'&&user.role!=='admin')return reply({error:'Acceso exclusivo de administración.'},403);
        const rows=await backend.request(`/rest/v1/club_bookings?tenant_id=eq.${tenantId}&select=*&order=date.desc,start_min.asc`);
        return reply({bookings:rows.map(booking),registrations:[],students:[],...(action==='admin'?{config:await settings()}:{})});
      }
      const config=await settings();
      const court=url.searchParams.get('court'),date=url.searchParams.get('date');
      if(!court||!date)return reply({config,courts});
      return reply({config,slots:await rpc('club_slots',{p_court:court,p_date:date})});
    }
    const form=options.body as FormData;
    const get=(key:string)=>String(form.get(key)||'').trim();
    switch(get('action')){
      case 'booking':{
        const row=await rpc('club_book',{p_request:get('id'),p_court:get('court'),p_date:get('date'),p_start:Number(get('start')),p_name:get('name'),p_dni:get('dni'),p_phone:get('phone')});
        return reply({id:row.id,status:row.status},201);
      }
      case 'status':
        if(get('kind')!=='bookings')throw Error('Las inscripciones todavía no están habilitadas.');
        await rpc('club_set_status',{p_id:get('id'),p_status:get('status')});return reply({ok:true});
      case 'settings':
        await rpc('club_configure',{p_enabled:get('enabled')==='true',p_open:Number(get('open')),p_close:Number(get('close')),p_duration:Number(get('duration')),p_deposit:Number(get('deposit')),p_payment:get('payment')});return reply({ok:true});
      default:throw Error('Las inscripciones y asistencias todavía no están habilitadas en este entorno.');
    }
  }catch(error){return reply({error:error instanceof Error?error.message:'No se pudo completar la operación.'},400);}
}
