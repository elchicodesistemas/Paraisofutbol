import {el,button,safe,notice} from '../../core/ui.js';
function decodeKey(value) { const text = atob(value.replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(text, c => c.charCodeAt(0)); }
export default {id:'push',label:'Notificaciones',icon:'♧',async render(ctx) {
  return el('section',{class:'panel'},el('h2',{},'Notificaciones push'),el('p',{},'Activá notificaciones en este dispositivo. El envío remoto requiere configurar VAPID y un servicio de envío en el servidor.'),
    button('Activar notificaciones', () => safe(async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Este navegador no admite push.');
      if (!ctx.config.vapidPublicKey) throw new Error('Falta configurar la clave pública VAPID.');
      const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('No se otorgó permiso para notificaciones.');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(ctx.config.vapidPublicKey)});
      if (ctx.backend) await ctx.backend.request('/rest/v1/push_subscriptions?on_conflict=tenant_id,user_id,endpoint',{method:'POST',upsert:true,body:{tenant_id:ctx.config.tenantId,user_id:ctx.backend.user.id,endpoint:subscription.endpoint,subscription:subscription.toJSON()}});
      notice(ctx.backend ? 'Suscripción guardada.' : 'Suscripción creada en el dispositivo demo. No hay servicio de envío conectado.');
    })), button('Probar aviso local', () => safe(async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('Notificaciones no disponibles.');
      if (await Notification.requestPermission() !== 'granted') throw new Error('Permiso no otorgado.');
      (await navigator.serviceWorker.ready).showNotification('Nexo',{body:'Tu plataforma está lista para avisarte.',icon:'./icon.svg'});
    }),'quiet'));
}};
