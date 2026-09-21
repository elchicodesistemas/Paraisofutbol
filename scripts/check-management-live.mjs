import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {createSupabase} from '../public/src/core/supabase.js';
import config from '../public/config.js';
assert.equal(config.supabase.url,'https://frbbsyvanjmmizvbvvja.supabase.co');
const tenant='11ee1db5-485d-498f-a915-dd36dd7b2e70';
const accounts=JSON.parse(await readFile(new URL('../.runtime/test-accounts.json',import.meta.url),'utf8'));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
async function login(name){const a=accounts.find(a=>a.name===name);const c=createSupabase(config,memory());await c.login(a.email,a.password);return c;}
const [admin,family,outsider]=await Promise.all(['admin','familia2','sin-acceso'].map(login));
const rpc=(c,name,p={})=>c.request(`/rest/v1/rpc/${name}`,{method:'POST',body:{p_tenant:tenant,...p}});
const rows=(c,t,q='')=>c.request(`/rest/v1/${t}?tenant_id=eq.${tenant}&select=*${q}`);
const tables=['club_people','club_tags','club_person_tags','club_dues','club_due_audit','club_campaigns','club_campaign_items'];
let person,tag;const stamp=randomUUID().slice(0,8);
try{
 for(const t of tables){assert.deepEqual(await rows(family,t),[]);const res=await fetch(`${config.supabase.url}/rest/v1/${t}?select=*&limit=1`,{headers:{apikey:config.supabase.publishableKey}});assert.ok([401,403].includes(res.status));}
 console.log('PASS private directory, dues and campaigns blocked to non-admin and anonymous');
 await assert.rejects(rpc(family,'club_save_tag',{p_name:'Forbidden'}));
 tag=await rpc(admin,'club_save_tag',{p_name:`Prueba QA ${stamp}`});
 await assert.rejects(rpc(admin,'club_save_tag',{p_name:` prueba qa ${stamp} `}));
 const params={p_id:null,p_name:`Persona QA ${stamp}`,p_email:'',p_phone:'',p_active:true,p_tags:[tag]};
 await assert.rejects(rpc(family,'club_save_person',params));
 await assert.rejects(rpc(admin,'club_save_person',{...params,p_tags:[randomUUID()]}));
 person=await rpc(admin,'club_save_person',params);
 assert.equal((await rows(admin,'club_person_tags',`&person_id=eq.${person}`)).length,1);
 console.log('PASS validated tenant-scoped tags and admin-only person creation');
 const due={p_person:person,p_period:'2099-01-01',p_amount:10000,p_paid:2500,p_note:'Ensayo técnico sin cobro',p_expected:null};
 await assert.rejects(rpc(family,'club_save_due',due));
 await assert.rejects(rpc(admin,'club_save_due',{...due,p_paid:11000}));
 await rpc(admin,'club_save_due',due);
 const saved=(await rows(admin,'club_dues',`&person_id=eq.${person}`))[0];assert.equal(Number(saved.paid),2500);
 await assert.rejects(rpc(admin,'club_save_due',{...due,p_paid:5000}));
 await rpc(admin,'club_save_due',{...due,p_paid:10000,p_expected:saved.updated_at});
 assert.equal((await rows(admin,'club_due_audit',`&person_id=eq.${person}`)).length,2);
 console.log('PASS payment limits, stale-edit protection and immutable audit');
 const existing=(await rows(admin,'club_people')).find(p=>p.user_id===family.user.id);
 const oldTags=(await rows(admin,'club_person_tags',`&person_id=eq.${existing.id}`)).map(l=>l.tag_id);
 await rpc(admin,'club_save_person',{p_id:existing.id,p_name:existing.name,p_email:existing.email,p_phone:existing.phone,p_active:true,p_tags:[...oldTags,tag]});
 try{
  const campaign={p_id:randomUUID(),p_tag:tag,p_title:'Prueba QA sin envío',p_body:'Validación técnica; no se envió push.'};
  await assert.rejects(rpc(family,'club_create_campaign',campaign));
  const id=await rpc(admin,'club_create_campaign',campaign);assert.equal(await rpc(admin,'club_create_campaign',campaign),id);
  const progress=await rpc(admin,'club_campaign_progress',{p_campaign:id});assert.equal(progress.length,1);assert.equal(progress[0].user_id,family.user.id);assert.equal(progress[0].status,null);
  console.log('PASS group snapshot excludes contacts without account and duplicate campaign requests are reused');
 }finally{await rpc(admin,'club_save_person',{p_id:existing.id,p_name:existing.name,p_email:existing.email,p_phone:existing.phone,p_active:existing.active,p_tags:oldTags});}
 const self=(await rows(admin,'club_people')).find(p=>p.user_id===admin.user.id);
 await assert.rejects(rpc(admin,'club_person_access',{p_person:self.id,p_role:'family',p_enabled:false}));
 await assert.rejects(rpc(family,'club_person_access',{p_person:self.id,p_role:'admin',p_enabled:true}));
 await assert.rejects(rpc(outsider,'club_campaign_progress',{p_campaign:randomUUID()}));
 console.log('PASS own-admin protection and denied privilege escalation');
 await assert.rejects(admin.request('/rest/v1/club_dues',{method:'POST',body:{}}));
 console.log('All management scenarios passed. No push or email sent. QA records retained, person excluded from groups.');
}finally{
 if(person)await rpc(admin,'club_save_person',{p_id:person,p_name:`Persona QA ${stamp}`,p_email:'',p_phone:'',p_active:false,p_tags:[]});
 await Promise.all([admin,family,outsider].map(c=>c.logout()));
}
