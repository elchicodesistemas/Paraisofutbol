import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../public/src/core/store.js';
import {validateRecord} from '../public/src/core/validation.js';
import {createSupabase} from '../public/src/core/supabase.js';
const memory = () => { const data = new Map();return {getItem:key => data.get(key) || null,setItem:(key,value) => data.set(key,value),removeItem:key => data.delete(key)}; };
test('demo records persist and remain isolated by tenant and module',async () => {
  const storage = memory();
  const a = createStore({tenantId:'A'},null,storage);
  const b = createStore({tenantId:'B'},null,storage);
  const record = await a.add('calendar',{title:'Clase'});
  assert.equal((await createStore({tenantId:'A'},null,storage).list('calendar')).length,1);
  assert.deepEqual(await b.list('calendar'),[]);
  await a.remove('chat',record.id);
  assert.equal((await a.list('calendar')).length,1);
  await a.remove('calendar',record.id);
  assert.deepEqual(await a.list('calendar'),[]);
});
test('reject invalid amounts, fractional points and dates',() => {
  for (const amount of [0,-1,NaN,Infinity,'oops']) assert.throws(() => validateRecord('payments',{title:'Cuota',amount}));
  assert.throws(() => validateRecord('loyalty',{title:'Premio',amount:1.2}));
  assert.throws(() => validateRecord('agenda',{title:'Cita',date:'bad'}));
  assert.throws(() => validateRecord('chat',{title:' '}));
  assert.deepEqual(validateRecord('payments',{title:' Cuota ',amount:'12.50',status:'paid'}),{title:'Cuota',amount:12.5,status:'pending'});
});
test('backend requests include explicit tenant and module filters',async () => {
  const calls=[];const backend={user:{id:'user'},request:async (...args) => {calls.push(args);return []}};
  const store=createStore({tenantId:'tenant-A'},backend,memory());
  await store.list('calendar');await store.remove('chat','record');
  assert.match(calls[0][0],/tenant_id=eq.tenant-A&module_id=eq.calendar/);
  assert.match(calls[1][0],/module_id=eq.chat&id=eq.record/);
});
test('public key is not sent as bearer token; login enables user bearer and logout clears it',async t => {
  const calls=[];
  t.mock.method(globalThis,'fetch',async (url,options) => {
    calls.push({url,options});
    return new Response(JSON.stringify(url.includes('token?') ? {access_token:'user-jwt',refresh_token:'refresh',expires_in:3600,user:{id:'user'}} : {}));
  });
  const client=createSupabase({supabase:{url:'https://example.supabase.co',publishableKey:'sb_publishable_demo'}},memory());
  await client.login('a@example.com','password');
  assert.equal(calls[0].options.headers.Authorization,undefined);
  await client.request('/rest/v1/module_records');
  assert.equal(calls[1].options.headers.Authorization,'Bearer user-jwt');
  await client.logout();assert.equal(client.user,null);
  assert.match(calls[2].url,/\/auth\/v1\/logout\?scope=local$/);
});
test('expired sessions refresh before data access',async t => {
  const storage=memory();storage.setItem('nexo:session:https://example.supabase.co',JSON.stringify({access_token:'old',refresh_token:'refresh',expires_at:1}));
  const calls=[];
  t.mock.method(globalThis,'fetch',async (url,options) => {calls.push({url,options});return new Response(JSON.stringify(url.includes('refresh_token') ? {access_token:'new',expires_in:3600,refresh_token:'next',user:{id:'u'}} : []));});
  const client=createSupabase({supabase:{url:'https://example.supabase.co',publishableKey:'public'}},storage);
  await client.request('/rest/v1/module_records');
  assert.match(calls[0].url,/grant_type=refresh_token/);assert.equal(calls[1].options.headers.Authorization,'Bearer new');
});
