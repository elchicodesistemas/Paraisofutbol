// Explicitly fictitious demo data; does not send notifications or modify Auth accounts.
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID as uuid} from 'node:crypto';
import assert from 'node:assert/strict';
import {createSupabase} from '../public/src/core/supabase.js';
import config from '../public/config.js';
import {localDay} from '../clients/paraiso/src/pilot/school/metrics.mjs';
assert.equal(config.supabase.url,'https://frbbsyvanjmmizvbvvja.supabase.co');
const store=new Map(),c=createSupabase(config,{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)});
const a=JSON.parse(await readFile(new URL('../.runtime/test-accounts.json',import.meta.url),'utf8')).find(a=>a.name==='admin');
await c.login(a.email,a.password);const tenant='11ee1db5-485d-498f-a915-dd36dd7b2e70';
const rpc=(name,data)=>c.request('/rest/v1/rpc/'+name,{method:'POST',body:{p_tenant:tenant,...data}}),save=(kind,data)=>rpc('school_save',{p_kind:kind,p_data:data}),read=t=>c.request('/rest/v1/'+t+'?tenant_id=eq.'+tenant+'&select=*');
try{
 const cats=await read('school_categories');if(cats.some(x=>x.name==='Sub-8 · Demo')){console.log('Demo already present; existing records preserved.');process.exitCode=0;}
 else{
 const today=localDay(),year=Number(today.slice(0,4)),month=today.slice(0,7),categories=[];
 for(const [name,min_age,max_age] of [['Sub-8 · Demo',6,8],['Sub-10 · Demo',9,10],['Sub-12 · Demo',11,12]]){const row={id:uuid(),name,min_age,max_age,division:'Mixta',active:true};await save('category',row);categories.push(row);}
 const people=await read('club_people'),members=await read('club_members'),family=people.find(p=>p.email==='familia@paraiso.example.com');assert.ok(family?.user_id);
 const tutor={id:uuid(),name:'Ana de prueba · Demo',birth_date:'1990-01-01',phone:'0000000000',email:family.email,person_id:family.id};await save('tutor',tutor);
 const staffRows=await read('school_staff'),profe=members.find(m=>m.role==='teacher'),old=staffRows.find(s=>s.user_id===profe?.user_id);
 const teacher={id:old?.id||uuid(),name:'Profesor de prueba · Demo',phone:'0000000000',email:'profe@paraiso.example.com',user_id:profe?.user_id,active:true,pay_mode:'Por hora',pay_amount:1000,categories:categories.map(c=>c.id)};
 // Only an inactive QA fixture may be reused. Preserve a real active profile.
 assert.ok(!old||(!old.active&&old.name.startsWith('Profesor QA')),'Teacher already configured: create demo manually.');await save('staff',teacher);
 const students=[];
 for(const [i,name] of ['Mateo de prueba','Sofía de prueba','Lucas de prueba'].entries()){
 const s={id:uuid(),name:name+' · Demo',birth_date:(year-8)+'-12-20',tutor_id:tutor.id,relationship:'Madre',category_id:categories[0].id,position:['Delantero','Mediocampo','Arquero'][i],active:true,allergies:'Dato ficticio: sin alergias informadas',insurance:'Cobertura de prueba',notes:'Ficha ficticia para demostración',valid_until:year+'-12-31'};await save('student',s);students.push(s);
 const charge={id:uuid(),student_id:s.id,kind:'Cuota',period:month+'-01',due_date:i===2?month+'-28':month+'-01',amount:25000,concept:'Cuota de escuela · Demo'};await save('charge',charge);
 if(i<2)await save('payment',{id:uuid(),charge_id:charge.id,amount:i===0?25000:10000,method:i===0?'Transferencia':'Efectivo',date:today,reference:'Pago ficticio de demostración'});
 }
 const session={id:uuid(),date:today,start_min:1020,end_min:1080,category_id:categories[0].id,staff_id:teacher.id,court:'Cancha de entrenamiento',plan:'Demo: entrada en calor, pases en parejas y ejercicios de definición.',cancelled:false};await save('session',session);
 // Historical attendance for a completed session, not for a future time today.
 const past=new Date(today+'T12:00:00Z');past.setUTCDate(past.getUTCDate()-1);const previous={...session,id:uuid(),date:past.toISOString().slice(0,10)};await save('session',previous);await save('attendance',{session_id:previous.id,rows:students.map((s,i)=>({student_id:s.id,state:['Presente','Presente','Ausente'][i]}))});
 const next=new Date(today+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+5);const match={id:uuid(),category_id:categories[0].id,date:next.toISOString().slice(0,10),start_min:600,opponent:'Club de prueba · Demo',venue:'Predio de demostración',side:'Local',status:'Programado'};await save('match',match);for(const s of students)await save('callup',{match_id:match.id,student_id:s.id});
 await writeFile(new URL('../.runtime/school-demo.json',import.meta.url),JSON.stringify({today,categories,teacher,tutor,students,session,match},null,2));
 console.log('Created 3 demo categories, 3 students, linked tutor, teacher, sessions, monthly charges/payments and a match. No sends.');
 }
}finally{await c.logout();}
