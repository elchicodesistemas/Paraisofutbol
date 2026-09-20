import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import {createPushHandler,validSubscription} from '../clients/paraiso/server/push.mjs';
const id='11111111-1111-4111-8111-111111111111';
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
const payload={requestId:id,recipientId:id,kind:'activity',title:'Actividad',body:'Prueba'};
test('Web Push library encrypts payload and signs VAPID credentials',()=>{
  const ecdh=createECDH('prime256v1');ecdh.generateKeys();
  const keys=webpush.generateVAPIDKeys();
  const request=webpush.generateRequestDetails({...subscription,keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}},'Prueba cifrada',{vapidDetails:{...keys,subject:'mailto:test@example.com'},TTL:3600});
  assert.ok(Buffer.isBuffer(request.body));assert.equal(request.body.includes('Prueba cifrada'),false);
  assert.match(request.headers.Authorization,/^vapid /);assert.equal(request.headers['Content-Encoding'],'aes128gcm');
});
test('push destinations reject local networks, credentials and lookalike hosts',()=>{
  assert.equal(validSubscription(subscription),true);
  for(const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.example/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x'])assert.equal(validSubscription({...subscription,endpoint}),false);
  assert.equal(validSubscription({...subscription,keys:{}}),false);
});
async function server(t,{authStatus=200,rpcStatus=200,deliveries=[{id,subscription}],reused=false,send=async()=>{}}={}){
  const calls=[],sends=[];
  const handler=createPushHandler({tenantId:id,supabase:{url:'https://db.example',publishableKey:'public'},vapid:{publicKey:'public-vapid',privateKey:'secret-vapid',subject:'mailto:test@example.com'},
    sendNotification:async(...args)=>{sends.push(args);return send(...args);},
    fetchImpl:async(url,options)=>{
      calls.push({url,options});
      if(url.endsWith('/auth/v1/user'))return Response.json({}, {status:authStatus});
      if(url.endsWith('/club_push_prepare'))return rpcStatus===200?Response.json({notification:{id,title:'Actividad',body:'Prueba',status:'accepted',accepted:1,failed:0},deliveries,reused}):Response.json({message:'Acceso exclusivo de administración.'},{status:rpcStatus});
      return new Response(null,{status:204});
    }});
  const http=createServer(async(req,res)=>{if(!await handler(req,res))res.writeHead(404).end();});
  http.listen(0,'127.0.0.1');await once(http,'listening');
  t.after(()=>new Promise(resolve=>{http.closeAllConnections();http.close(resolve);}));
  const url=`http://127.0.0.1:${http.address().port}`;
  const post=(body=payload,headers={Authorization:'Bearer test.jwt','Content-Type':'application/json'})=>fetch(url+'/api/push/send',{method:'POST',headers,body:JSON.stringify(body)});
  return {url,post,calls,sends};
}
test('push rejects unauthenticated callers and denied database roles before transport',async t=>{
  const s=await server(t,{rpcStatus:403});
  assert.equal((await s.post(payload,{'Content-Type':'application/json'})).status,401);assert.equal(s.calls.length,0);
  assert.equal((await s.post()).status,403);assert.equal(s.sends.length,0);
  const invalid=await server(t,{authStatus:401});assert.equal((await invalid.post()).status,401);assert.equal(invalid.calls.length,1);
});
test('public config excludes private key and duplicate requests never resend',async t=>{
  const s=await server(t,{reused:true});
  const config=await (await fetch(s.url+'/api/push/config')).json();assert.deepEqual(config,{publicKey:'public-vapid'});
  const response=await (await s.post()).json();assert.equal(response.reused,true);assert.equal(s.sends.length,0);
});
test('push reports provider acceptance, expires invalid subscriptions and records failure separately',async t=>{
  const s=await server(t,{deliveries:[{id:'one',subscription},{id:'two',subscription},{id:'three',subscription:{...subscription,endpoint:'https://localhost/private'}}],send:async()=>{if(s.sends.length===2)throw {statusCode:410};}});
  const response=await (await s.post()).json();
  assert.deepEqual({status:response.status,accepted:response.accepted,failed:response.failed},{status:'partial',accepted:1,failed:2});
  assert.equal(s.sends.length,2);
  assert.equal(JSON.parse(s.sends[0][1]).url,'/mi-cuenta#avisos');assert.equal(s.sends[0][2].TTL,3600);
  assert.deepEqual(s.calls.filter(c=>c.url.endsWith('/club_push_result')).map(c=>JSON.parse(c.options.body).p_status),['accepted','expired','failed']);
});
test('push without devices persists inbox and does not call transport; validates size',async t=>{
  const s=await server(t,{deliveries:[]});
  assert.equal((await (await s.post()).json()).status,'no_devices');assert.equal(s.sends.length,0);
  assert.equal((await s.post({...payload,body:'x'.repeat(241)})).status,400);
});
test('service worker shows push and opens only the app inbox',async()=>{
  const handlers={},shown=[],opened=[];
  const self={location:{origin:'https://club.example'},addEventListener:(type,fn)=>handlers[type]=fn,registration:{showNotification:async(...args)=>shown.push(args)},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
  vm.runInNewContext(await readFile(new URL('../clients/paraiso/public/sw.js',import.meta.url),'utf8'),{self,URL});
  let work;handlers.push({data:{json:()=>({title:'Pago',body:'Recordatorio',url:'https://evil.example'})},waitUntil:p=>work=p});await work;
  assert.equal(shown[0][0],'Pago');assert.equal(shown[0][1].data.url,'/mi-cuenta#avisos');
  handlers.notificationclick({notification:{close(){}},waitUntil:p=>work=p});await work;
  assert.deepEqual(opened,['https://club.example/mi-cuenta#avisos']);
  handlers.push({data:{json:()=>{throw Error('bad')}},waitUntil:p=>work=p});await work;
  assert.equal(shown[1][0],'El Paraíso Deportes');
});
