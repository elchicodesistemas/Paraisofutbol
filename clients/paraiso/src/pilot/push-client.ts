import {backend,rpc,tenantId} from './backend.ts';
async function bounded<T>(work:Promise<T>,message:string){let timer:ReturnType<typeof setTimeout>;try{return await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),30000);})]);}finally{clearTimeout(timer!);}}
export const pushSupported=()=>typeof window!=='undefined'&&location.protocol==='https:'&&window.isSecureContext&&'Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
export async function pushRegistration(){
  let timer:ReturnType<typeof setTimeout>;
  try{return await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('La app todavía no está lista. Recargá y volvé a intentar.')),12000);})]);}
  finally{clearTimeout(timer!);}
}
export async function ownDevice(subscription:PushSubscription|null){
  if(!subscription)return false;
  const rows=await backend.request(`/rest/v1/club_push_devices?tenant_id=eq.${tenantId}&endpoint=eq.${encodeURIComponent(subscription.endpoint)}&select=id`);
  return rows.length>0;
}
export async function disablePush(){
  if(!pushSupported())return;
  const registration=await navigator.serviceWorker.getRegistration('/');
  const subscription=await registration?.pushManager.getSubscription();
  if(!subscription)return;
  // Stop delivery on this shared device even when removing the DB row fails.
  const endpoint=subscription.endpoint;
  await subscription.unsubscribe();
  await rpc('club_push_unsubscribe',{p_endpoint:endpoint});
}
export async function enablePush(publicKey:string){
  if(!pushSupported())throw Error('Abrí la app instalada en un navegador compatible con notificaciones.');
  // Must be called directly from the button click (required by iOS).
  const permission=await bounded(Notification.requestPermission(),'No se recibió una respuesta al permiso. Confirmá el aviso del navegador y volvé a intentar.');
  if(permission!=='granted')throw Error('El permiso no se activó. Revisá Notificaciones en los ajustes del navegador o de la app.');
  const registration=await pushRegistration();
  let subscription=await registration.pushManager.getSubscription();
  const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  if(subscription){
    const key=subscription.options.applicationServerKey;
    const sameKey=key&&new Uint8Array(key).length===bytes.length&&new Uint8Array(key).every((value,i)=>value===bytes[i]);
    if(!sameKey||!await ownDevice(subscription)){await subscription.unsubscribe();subscription=null;}
  }
  const isNew=!subscription;
  subscription ||= await bounded(registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes}),'El navegador no pudo registrar las notificaciones. Revisá la conexión y probá desde Safari instalado o Chrome.');
  try{await rpc('club_push_subscribe',{p_subscription:subscription.toJSON(),p_origin:location.origin});}
  catch(error){if(isNew)await subscription.unsubscribe();throw error;}
}
export function deliveryMessage(result:any){
  if(result.status==='no_devices')return 'Aviso guardado en la bandeja. Esta cuenta todavía no tiene celulares con notificaciones activadas.';
  if(result.status==='sending')return 'El envío quedó sin resultado confirmado. Consultá el historial antes de enviar otro aviso.';
  if(result.status==='failed')return 'Aviso guardado, pero el servicio push no aceptó el envío. La persona puede desactivar y volver a activar los avisos.';
  return `Aceptado por el servicio push para ${result.accepted} dispositivo(s).${result.failed?' Algunos dispositivos fallaron.':''} Esto no confirma que la persona lo haya recibido o leído.`;
}
