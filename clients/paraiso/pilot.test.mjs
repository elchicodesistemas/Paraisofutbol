import test from 'node:test';
import assert from 'node:assert/strict';
test('pilot reservations, role restrictions and ownership',async(t)=>{
  const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const session=new Map();globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
  const {login,logout,currentUser}=await import('./src/pilot/demo-auth.ts');
  assert.throws(()=>login('admin','incorrecta'));
  assert.equal(currentUser(),null);
  login('admin','Paraiso123!');
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async(_key,fn)=>fn()}});
  const {clubRequest}=await import('./src/pilot/demo-service.ts');
  const post=async values=>{const body=new FormData();for(const [key,value] of Object.entries(values))body.set(key,String(value));return clubRequest('/api/club',{method:'POST',body});};
  const date=new Date(Date.now()+86400000*2).toISOString().slice(0,10);
  const booking={action:'booking',id:'request-1',court:'Cancha1',date,start:600,name:'Prueba Piloto',dni:'00000000',phone:'0000000000'};
  const first=await post(booking);assert.equal(first.status,201);const {id}=await first.json();
  assert.equal((await (await post(booking)).json()).id,id);
  assert.equal((await post({...booking,id:'request-2'})).status,400);
  assert.ok(memory.has('nexo:records:paraiso-pilot'));
  const status=await post({action:'status',kind:'bookings',id,status:'cancelada'});assert.equal(status.status,200);
  assert.equal((await post({...booking,id:'request-3'})).status,201);
  const admin=await (await clubRequest('/api/club?action=admin')).json();assert.equal(admin.bookings.length,2);
  assert.equal(admin.bookings.find(r=>r.id===id).status,'cancelada');
  assert.equal((await post({action:'settings',open:23,close:9,duration:60,deposit:0})).status,400);
  await t.test('guests cannot access records or submit',async()=>{
    logout();assert.equal(currentUser(),null);
    assert.equal((await clubRequest('/api/club?action=admin')).status,403);
    assert.equal((await clubRequest('/api/club?action=workspace')).status,401);
    assert.equal((await post(booking)).status,401);
  });
  await t.test('family sees only own records and child; cannot administer',async()=>{
    login('familia','Paraiso123!');
    const before=await (await clubRequest('/api/club?action=workspace')).json();
    assert.equal(before.bookings.length,0);assert.equal(before.students.length,1);
    const submitted=await post({...booking,id:'family-request',court:'Cancha 2'});assert.equal(submitted.status,201);
    const own=await (await clubRequest('/api/club?action=workspace')).json();assert.equal(own.bookings.length,1);
    assert.equal(own.bookings[0].dni,undefined);
    assert.equal((await clubRequest('/api/club?action=admin')).status,403);
    assert.equal((await post({action:'status',kind:'bookings',id,status:'confirmada'})).status,403);
    assert.equal((await post({action:'settings',open:9,close:23,duration:60,deposit:0})).status,403);
    assert.equal((await post({action:'attendance',studentId:'student-demo',present:true})).status,403);
  });
  await t.test('teacher records own group attendance without access to private forms',async()=>{
    login('profe','Paraiso123!');
    const workspace=await (await clubRequest('/api/club?action=workspace')).json();assert.equal(workspace.students.length,2);assert.equal(workspace.bookings.length,0);assert.equal(workspace.registrations.length,0);
    assert.equal((await post({action:'attendance',studentId:'student-demo',present:true})).status,200);
    assert.equal((await post({action:'attendance',studentId:'unknown',present:true})).status,400);
    assert.equal((await post(booking)).status,403);
  });
  await t.test('student can read own attendance but cannot change it',async()=>{
    login('alumno','Paraiso123!');
    const workspace=await (await clubRequest('/api/club?action=workspace')).json();assert.equal(workspace.students.length,1);assert.equal(workspace.students[0].present,true);assert.equal(workspace.bookings.length,0);
    assert.equal((await post({action:'attendance',studentId:'student-demo',present:false})).status,403);
    assert.equal((await post({action:'registration'})).status,403);
    logout();assert.equal(currentUser(),null);
  });
  await t.test('family reservation is confirmed by admin and visible after signing back in',async()=>{
    login('familia','Paraiso123!');
    const created=await post({...booking,id:'confirmation-flow',court:'Cancha 3'});
    assert.equal(created.status,201);
    const {id:reservationId}=await created.json();
    logout();login('admin','Paraiso123!');
    assert.equal((await post({action:'status',kind:'bookings',id:reservationId,status:'confirmada'})).status,200);
    logout();login('familia','Paraiso123!');
    const workspace=await (await clubRequest('/api/club?action=workspace')).json();
    assert.equal(workspace.bookings.find(row=>row.id===reservationId).status,'confirmada');
    logout();
  });
  await t.test('simultaneous reservations in the same page accept only one without Web Locks',async()=>{
    Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
    login('familia','Paraiso123!');
    const responses=await Promise.all([
      post({...booking,id:'race-a',court:'Cancha 4'}),
      post({...booking,id:'race-b',court:'Cancha 4'})
    ]);
    assert.deepEqual(responses.map(response=>response.status).sort(),[201,400]);
    logout();
  });
});
