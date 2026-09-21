import test from 'node:test';
import assert from 'node:assert/strict';
import {continueCampaign} from '../clients/paraiso/src/pilot/group-dispatch.mjs';
const campaign={id:'campaign',title:'Actividad',body:'Mensaje'};
test('group resume skips all recorded outcomes and uses original recipient IDs',async()=>{
 const rows=['accepted','partial','failed','no_devices','sending',null].map((status,i)=>({status,request_id:'request'+i,user_id:'user'+i}));
 const sent=[];
 await continueCampaign(campaign,{read:async()=>rows,send:async p=>sent.push(p),onProgress:()=>{}});
 assert.deepEqual(sent,[{requestId:'request5',recipientId:'user5',kind:'activity',title:'Actividad',body:'Mensaje'}]);
});
test('uncertain delivery is not retried when recorded; later recipients continue',async()=>{
 const rows=[{request_id:'a',user_id:'a',status:null},{request_id:'b',user_id:'b',status:null}];const sent=[];
 const handlers={read:async()=>rows.map(r=>({...r})),send:async p=>{sent.push(p.requestId);rows.find(r=>r.request_id===p.requestId).status='sending';if(p.requestId==='a')throw Error('Connection lost');},onProgress:()=>{}};
 assert.equal((await continueCampaign(campaign,handlers)).errors,1);
 await continueCampaign(campaign,handlers);assert.deepEqual(sent,['a','b']);
});
test('failure before dispatch can resume with same request ID; unavailable history stops further sends',async()=>{
 const rows=[{request_id:'a',user_id:'a',status:null},{request_id:'b',user_id:'b',status:null}];let reads=0;const sent=[];
 await assert.rejects(continueCampaign(campaign,{read:async()=>{if(++reads>1)throw Error('Offline');return rows;},send:async p=>{sent.push(p.requestId);throw Error('Offline');},onProgress:()=>{}}),/Offline/);
 assert.deepEqual(sent,['a']);
 await continueCampaign(campaign,{read:async()=>rows,send:async p=>sent.push(p.requestId),onProgress:()=>{}});
 assert.deepEqual(sent,['a','a','b']);
});
