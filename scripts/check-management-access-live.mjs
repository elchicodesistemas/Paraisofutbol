import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSupabase} from '../public/src/core/supabase.js';
import config from '../public/config.js';
assert.equal(config.supabase.url,'https://frbbsyvanjmmizvbvvja.supabase.co');
const store=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const accounts=JSON.parse(await readFile(new URL('../.runtime/test-accounts.json',import.meta.url),'utf8'));
const admin=createSupabase(config,store()),other=createSupabase(config,store());
const a=accounts.find(a=>a.name==='admin'),b=accounts.find(a=>a.name==='sin-acceso');
await admin.login(a.email,a.password);await other.login(b.email,b.password);
const tenant='11ee1db5-485d-498f-a915-dd36dd7b2e70';const rpc=(c,n,p)=>c.request('/rest/v1/rpc/'+n,{method:'POST',body:{p_tenant:tenant,...p}});
const person=await rpc(admin,'club_save_person',{p_id:null,p_name:'Acceso QA sin envío',p_email:b.email,p_phone:'',p_active:false,p_tags:[]});
try{
 await rpc(admin,'club_person_access',{p_person:person,p_role:'family',p_enabled:true});
 assert.equal(await rpc(other,'club_role',{}),'family');
 await rpc(admin,'club_person_access',{p_person:person,p_role:'teacher',p_enabled:true});
 assert.equal(await rpc(other,'club_role',{}),'teacher');
 await assert.rejects(rpc(admin,'club_person_access',{p_tenant:'00000000-0000-4000-8000-000000000000',p_person:person,p_role:'admin',p_enabled:true}));
 console.log('PASS link existing Auth account, change club role and reject cross-tenant mutation');
}finally{
 await rpc(admin,'club_person_access',{p_person:person,p_role:'family',p_enabled:false});
 assert.equal(await rpc(other,'club_role',{}),null);
 await Promise.all([admin.logout(),other.logout()]);
 console.log('PASS disabled account loses club authorization; no messages sent');
}
