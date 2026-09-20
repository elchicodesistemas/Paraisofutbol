const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validSubscription(subscription){
  try{
    const url=new URL(subscription.endpoint);
    const hostAllowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(url.hostname)||/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname);
    return hostAllowed&&url.protocol==='https:'&&!url.port&&!url.username&&!url.password
      &&typeof subscription.keys?.p256dh==='string'&&/^[A-Za-z0-9_-]{87}=?$/.test(subscription.keys.p256dh)
      &&typeof subscription.keys?.auth==='string'&&/^[A-Za-z0-9_-]{22}(==)?$/.test(subscription.keys.auth);
  }catch{return false;}
}
async function readBody(req){
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>4096)throw Object.assign(Error('Mensaje demasiado largo.'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw Object.assign(Error('Formato inválido.'),{status:400});}
}
function respond(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(data));}
// Uses the caller's JWT and database authorization, never a service-role key.
export function createPushHandler({supabase,tenantId,vapid,sendNotification,fetchImpl=fetch}){
  return async function handle(req,res){
    const path=new URL(req.url,'http://localhost').pathname;
    if(!path.startsWith('/api/push/'))return false;
    try{
      if(path==='/api/push/config'&&req.method==='GET'){respond(res,200,{publicKey:vapid.publicKey});return true;}
      if(path!=='/api/push/send'){respond(res,404,{error:'Ruta inexistente.'});return true;}
      if(req.method!=='POST'){respond(res,405,{error:'Método no permitido.'});return true;}
      if(!/^Bearer [A-Za-z0-9_.-]+$/.test(req.headers.authorization||'')){respond(res,401,{error:'Ingresá a tu cuenta.'});return true;}
      if(!req.headers['content-type']?.startsWith('application/json')){respond(res,415,{error:'Se requiere JSON.'});return true;}
      const headers={apikey:supabase.publishableKey,Authorization:req.headers.authorization,'Content-Type':'application/json'};
      const auth=await fetchImpl(`${supabase.url}/auth/v1/user`,{headers,signal:AbortSignal.timeout(10000)});
      if(!auth.ok){respond(res,401,{error:'Tu sesión venció. Volvé a ingresar.'});return true;}
      const data=await readBody(req);
      if(!data||!UUID.test(data.requestId)||!UUID.test(data.recipientId)||!['payment','activity','test'].includes(data.kind)
        ||typeof data.title!=='string'||data.title.trim().length<1||data.title.length>80
        ||typeof data.body!=='string'||data.body.trim().length<1||data.body.length>240){respond(res,400,{error:'Revisá destinatario, título y mensaje.'});return true;}
      const rpc=async(name,params)=>{
        const r=await fetchImpl(`${supabase.url}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify({p_tenant:tenantId,...params}),signal:AbortSignal.timeout(15000)});
        const raw=await r.text();
        const result=raw?JSON.parse(raw):null;
        if(!r.ok)throw Object.assign(Error(result?.message||'No se pudo guardar el aviso.'),{status:r.status===401||r.status===403?403:400});
        return result;
      };
      const prepared=await rpc('club_push_prepare',{p_recipient:data.recipientId,p_request:data.requestId,p_kind:data.kind,p_title:data.title,p_body:data.body});
      const n=prepared.notification;
      if(prepared.reused){respond(res,200,{id:n.id,status:n.status,accepted:n.accepted,failed:n.failed,reused:true});return true;}
      let accepted=0,failed=0;
      for(const delivery of prepared.deliveries){
        let status='failed';
        if(validSubscription(delivery.subscription)){
          try{
            await sendNotification(delivery.subscription,JSON.stringify({title:n.title,body:n.body,id:n.id,url:'/mi-cuenta#avisos'}),{vapidDetails:vapid,TTL:3600,urgency:'high',timeout:10000});
            status='accepted';accepted++;
          }catch(error){status=[404,410].includes(error.statusCode)?'expired':'failed';failed++;}
        }else{failed++;}
        // Do not retry a delivery after an uncertain result. A reused request never resends.
        await rpc('club_push_result',{p_delivery:delivery.id,p_status:status});
      }
      const status=prepared.deliveries.length===0?'no_devices':accepted===prepared.deliveries.length?'accepted':accepted>0?'partial':'failed';
      respond(res,200,{id:n.id,status,accepted,failed,reused:false});
    }catch(error){respond(res,error.status||503,{error:error.status?error.message:'No pudimos completar el envío. Actualizá el historial antes de intentar otro aviso.'});}
    return true;
  };
}
