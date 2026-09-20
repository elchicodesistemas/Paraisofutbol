// Development-only database checks. Never delivers to phones or external endpoints.
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createECDH} from 'node:crypto';
import assert from 'node:assert/strict';
import {createSupabase} from '../public/src/core/supabase.js';
import config from '../public/config.js';
assert.equal(config.supabase.url,'https://frbbsyvanjmmizvbvvja.supabase.co');
const tenant='11ee1db5-485d-498f-a915-dd36dd7b2e70';
const accounts=JSON.parse(await readFile(new URL('../.runtime/test-accounts.json',import.meta.url),'utf8'));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
async function login(name){const a=accounts.find(a=>a.name===name);const c=createSupabase(config,memory());await c.login(a.email,a.password);return c;}
const [admin,family,other,outsider]=await Promise.all(['admin','familia2','familia','sin-acceso'].map(login));
const rpc=(c,name,params={})=>c.request(`/rest/v1/rpc/${name}`,{method:'POST',body:{p_tenant:tenant,...params}});
const endpoint=`https://fcm.googleapis.com/fcm/send/technical-test-${randomUUID()}`;
const ecdh=createECDH('prime256v1');ecdh.generateKeys();
const subscription={endpoint,keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
let passed=0;const pass=text=>{passed++;console.log('PASS '+text);};
try{
  for(const table of ['club_push_devices','club_notifications','club_push_deliveries']){
    const r=await fetch(`${config.supabase.url}/rest/v1/${table}?select=*&limit=1`,{headers:{apikey:config.supabase.publishableKey}});assert.ok([401,403].includes(r.status));
  }
  pass('anonymous requests cannot read push tables');
  await assert.rejects(rpc(outsider,'club_push_subscribe',{p_subscription:subscription,p_origin:'https://demo.example.com'}));
  await assert.rejects(rpc(family,'club_push_subscribe',{p_subscription:{...subscription,endpoint:'https://127.0.0.1/private'},p_origin:'https://demo.example.com'}));
  await rpc(family,'club_push_subscribe',{p_subscription:subscription,p_origin:'https://demo.example.com'});
  await assert.rejects(rpc(other,'club_push_subscribe',{p_subscription:subscription,p_origin:'https://demo.example.com'}));
  const visible=await other.request(`/rest/v1/club_push_devices?endpoint=eq.${encodeURIComponent(endpoint)}&select=*`);assert.deepEqual(visible,[]);
  pass('membership and endpoint validation enforced; another family cannot steal or read a device');
  await assert.rejects(rpc(family,'club_push_targets'));
  const targets=await rpc(admin,'club_push_targets');assert.ok(targets.find(t=>t.user_id===family.user.id).devices>=1);
  pass('only club admin can list reminder recipients and device counts');
  const params={p_recipient:family.user.id,p_request:randomUUID(),p_kind:'payment',p_title:'Prueba técnica sin envío',p_body:'Ensayo de permisos. Este aviso no fue enviado a ningún celular.'};
  await assert.rejects(rpc(other,'club_push_prepare',params));
  await assert.rejects(rpc(family,'club_push_prepare',params));
  await assert.rejects(rpc(outsider,'club_push_prepare',{...params,p_kind:'test',p_recipient:outsider.user.id}));
  const prepared=await rpc(admin,'club_push_prepare',params);
  const again=await rpc(admin,'club_push_prepare',params);
  assert.equal(again.reused,true);assert.equal(again.notification.id,prepared.notification.id);assert.deepEqual(again.deliveries,[]);
  pass('admin-only reminders and database idempotency prevent duplicate dispatch');
  assert.deepEqual(await other.request(`/rest/v1/club_notifications?id=eq.${prepared.notification.id}&select=*`),[]);
  assert.equal((await family.request(`/rest/v1/club_notifications?id=eq.${prepared.notification.id}&select=*`)).length,1);
  await assert.rejects(family.request('/rest/v1/club_push_deliveries?select=*'));
  await assert.rejects(family.request('/rest/v1/club_notifications',{method:'POST',body:{title:'No autorizado'}}));
  pass('inbox isolation and protected delivery details enforced');
  for(const d of prepared.deliveries){
    await assert.rejects(rpc(other,'club_push_result',{p_delivery:d.id,p_status:'accepted'}));
    await rpc(admin,'club_push_result',{p_delivery:d.id,p_status:d.subscription.endpoint===endpoint?'expired':'failed'});
  }
  const expired=await family.request(`/rest/v1/club_push_devices?endpoint=eq.${encodeURIComponent(endpoint)}&select=id`);assert.deepEqual(expired,[]);
  assert.equal((await family.request(`/rest/v1/club_notifications?id=eq.${prepared.notification.id}&select=status`))[0].status,'failed');
  pass('provider failures are recorded; expired technical device is removed');
}finally{
  await rpc(family,'club_push_unsubscribe',{p_endpoint:endpoint});
  await Promise.all([admin,family,other,outsider].map(c=>c.logout()));
}
console.log(`${passed} database scenarios passed. No push sent; technical inbox record retained.`);
