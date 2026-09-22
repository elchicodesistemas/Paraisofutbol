import test from 'node:test';
import assert from 'node:assert/strict';
import {seasonAge,eligibleCategories,chargeState,chargeBalance,attendanceSummary,localDay} from '../clients/paraiso/src/pilot/school/metrics.mjs';
test('season category uses year, even before the birthday; respects active divisions',()=>{
 assert.equal(seasonAge('2018-12-31','2026-01-01'),8);
 const cats=[{id:'a',active:true,min_age:7,max_age:8},{id:'b',active:false,min_age:7,max_age:8},{id:'c',active:true,min_age:9,max_age:10}];
 assert.deepEqual(eligibleCategories('2018-12-31',cats,'2026-01-01').map(x=>x.id),['a']);
 assert.deepEqual(eligibleCategories('',cats),[]);
 assert.equal(localDay(new Date('2026-01-01T01:00:00Z')),'2025-12-31');
});
test('payment status uses remaining cents, due date and excludes voided payments',()=>{
 const ch={id:'fee',amount:0.3,due_date:'2026-09-21'};
 const payments=[{charge_id:'fee',amount:0.1},{charge_id:'fee',amount:0.2}];
 assert.equal(chargeBalance(ch,payments),0);assert.equal(chargeState(ch,payments,'2026-09-22'),'Al día');
 payments[1].voided_at='2026-09-22';assert.equal(chargeBalance(ch,payments),0.2);
 assert.equal(chargeState(ch,payments,'2026-09-21'),'Pendiente');assert.equal(chargeState(ch,payments,'2026-09-22'),'Deudor');
});
test('attendance ignores cancelled sessions, justified records and unmarked children',()=>{
 const sessions=[{id:'a',date:'2026-09-21',cancelled:false},{id:'b',date:'2026-09-21',cancelled:true},{id:'c',date:'2026-08-21',cancelled:false}];
 const rows=[{session_id:'a',state:'Presente'},{session_id:'a',state:'Ausente'},{session_id:'a',state:'Justificado'},{session_id:'b',state:'Ausente'},{session_id:'c',state:'Ausente'}];
 assert.deepEqual(attendanceSummary(rows,sessions,'2026-09'),{present:1,absent:1,justified:1,percent:50});
 assert.equal(attendanceSummary([],sessions,'2026-09').percent,null);
});
