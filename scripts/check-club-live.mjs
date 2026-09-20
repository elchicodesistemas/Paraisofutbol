// Integration test against the explicitly designated development project.
// Passwords stay in ignored .runtime/test-accounts.json. No service-role key.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import config from '../public/config.js';
import {createSupabase} from '../public/src/core/supabase.js';
const tenant='11ee1db5-485d-498f-a915-dd36dd7b2e70';
assert.equal(config.supabase.url,'https://frbbsyvanjmmizvbvvja.supabase.co','Development only');
const accounts=JSON.parse(await readFile(new URL('../.runtime/test-accounts.json',import.meta.url),'utf8'));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
async function client(name){const account=accounts.find(a=>a.name===name);assert.ok(account);const c=createSupabase(config,memory());await c.login(account.email,account.password);return c;}
const [admin,family,other,student,teacher,outsider]=await Promise.all(['admin','familia','familia2','alumno','profe','sin-acceso'].map(client));
const rpc=(c,name,args={})=>c.request(`/rest/v1/rpc/${name}`,{method:'POST',body:{p_tenant:tenant,...args}});
const list=(c,suffix='')=>c.request(`/rest/v1/club_bookings?tenant_id=eq.${tenant}&select=*${suffix}`);
let passed=0;
const pass=message=>{passed++;console.log(`PASS ${message}`);};
const created=[];
try{
  for(const [c,role] of [[admin,'admin'],[family,'family'],[other,'family'],[student,'student'],[teacher,'teacher']]){
    const rows=await c.request(`/rest/v1/club_members?tenant_id=eq.${tenant}&select=*`);
    assert.equal(rows.length,1);assert.equal(rows[0].role,role);assert.equal(rows[0].user_id,c.user.id);
  }
  pass('real Auth login and own membership only for five club accounts');
  assert.deepEqual(await outsider.request('/rest/v1/club_members?select=*'),[]);
  assert.deepEqual(await list(outsider),[]);
  pass('authenticated account without club membership sees no club data');

  const [settings]=await admin.request(`/rest/v1/club_settings?tenant_id=eq.${tenant}&select=*`);
  const configure={p_enabled:settings.enabled,p_open:settings.open_hour,p_close:settings.close_hour,p_duration:settings.duration,p_deposit:settings.deposit,p_payment:settings.payment};
  await assert.rejects(rpc(family,'club_configure',configure));
  await assert.rejects(rpc(admin,'club_configure',{...configure,p_duration:17}));
  await rpc(admin,'club_configure',configure);
  const [saved]=await admin.request(`/rest/v1/club_settings?tenant_id=eq.${tenant}&select=*`);
  assert.deepEqual(saved,settings);
  pass('configuration is admin-only and invalid duration cannot be saved');

  const date=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
  const slots=await rpc(family,'club_slots',{p_court:'Cancha1',p_date:date});
  assert.ok(slots.length);assert.ok(slots.every(s=>Object.keys(s).sort().join(',')==='available,start'));
  const free=slots.filter(s=>s.available);assert.ok(free.length>=3);
  const args={p_request:randomUUID(),p_court:'Cancha1',p_date:date,p_start:free[0].start,p_name:'Prueba automatizada',p_dni:'00000000',p_phone:'0000000000'};
  const booking=await rpc(family,'club_book',args);created.push(booking.id);
  assert.equal(booking.owner_id,family.user.id);assert.equal(booking.status,'pendiente');
  assert.equal((await rpc(family,'club_book',args)).id,booking.id);
  pass('family creates pending booking; identical retry returns the same reservation');
  assert.equal((await list(other,`&id=eq.${booking.id}`)).length,0);
  assert.equal((await list(student,`&id=eq.${booking.id}`)).length,0);
  assert.equal((await list(teacher,`&id=eq.${booking.id}`)).length,0);
  assert.equal((await list(admin,`&id=eq.${booking.id}`)).length,1);
  pass('server RLS hides family booking from other family, student and teacher');
  await assert.rejects(rpc(family,'club_set_status',{p_id:booking.id,p_status:'confirmada'}));
  await assert.rejects(family.request(`/rest/v1/club_bookings?id=eq.${booking.id}`,{method:'PATCH',body:{status:'confirmada',owner_id:other.user.id}}));
  await assert.rejects(family.request('/rest/v1/club_members',{method:'POST',body:{tenant_id:tenant,user_id:family.user.id,role:'admin',display_name:'No permitido'}}));
  await assert.rejects(family.request(`/rest/v1/club_members?user_id=eq.${family.user.id}`,{method:'PATCH',body:{role:'admin'}}));
  await assert.rejects(family.request('/rest/v1/club_bookings',{method:'POST',body:{...booking,id:randomUUID(),request_id:randomUUID(),owner_id:other.user.id}}));
  pass('direct writes, ownership spoofing and self-promotion denied');
  await rpc(admin,'club_set_status',{p_id:booking.id,p_status:'confirmada'});
  const secondSession=await client('familia');
  assert.equal((await list(secondSession,`&id=eq.${booking.id}`))[0].status,'confirmada');
  await secondSession.logout();
  pass('independent login reads admin confirmation from Supabase');

  for(const c of [student,teacher,outsider])await assert.rejects(rpc(c,'club_book',{...args,p_request:randomUUID(),p_start:free[1].start}));
  await assert.rejects(rpc(family,'club_book',{...args,p_tenant:randomUUID(),p_request:randomUUID()}));
  await assert.rejects(rpc(family,'club_book',{...args,p_request:randomUUID(),p_start:free[1].start+1}));
  await assert.rejects(rpc(family,'club_book',{...args,p_request:randomUUID(),p_date:'2000-01-01'}));
  await assert.rejects(rpc(family,'club_book',{...args,p_request:randomUUID(),p_start:free[1].start,p_dni:'bad'}));
  pass('unauthorized roles, foreign tenant, off-grid slot, past date and invalid data rejected');

  const race=await Promise.allSettled([family,other].map(c=>rpc(c,'club_book',{...args,p_request:randomUUID(),p_start:free[1].start})));
  const accepted=race.filter(r=>r.status==='fulfilled');
  for(const result of accepted)created.push(result.value.id);
  assert.equal(accepted.length,1);assert.match(race.find(r=>r.status==='rejected').reason.message,/ocupado/);
  pass('two concurrent independent families: exactly one booking accepted');
  const occupied=await rpc(other,'club_slots',{p_court:'Cancha1',p_date:date});
  assert.equal(occupied.find(s=>s.start===free[1].start).available,false);
  assert.ok(occupied.every(s=>Object.keys(s).length===2));
  pass('availability shared across accounts without exposing personal data');
  await rpc(admin,'club_set_status',{p_id:booking.id,p_status:'cancelada'});
  await assert.rejects(rpc(admin,'club_set_status',{p_id:booking.id,p_status:'confirmada'}));
  const replacement=await rpc(other,'club_book',{...args,p_request:randomUUID()});created.push(replacement.id);
  pass('cancellation releases slot and cannot reactivate a cancelled reservation');
}finally{
  // Preserve audit history; cancel only reservations created by this execution.
  for(const id of created){const rows=await list(admin,`&id=eq.${id}`);if(rows[0]?.status!=='cancelada')await rpc(admin,'club_set_status',{p_id:id,p_status:'cancelada'});}
  await Promise.all([admin,family,other,student,teacher,outsider].map(c=>c.logout()));
}
console.log(`${passed} live scenarios passed. Test reservations cancelled; history retained.`);
