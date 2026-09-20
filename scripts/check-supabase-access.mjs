// Read-only live checks. Does not create users, send emails or modify records.
import assert from 'node:assert/strict';
import config from '../public/config.js';

const base=config.supabase.url.replace(/\/$/,'');
const headers={apikey:config.supabase.publishableKey};
for(const table of ['tenants','tenant_members','tenant_modules','module_records','push_subscriptions','club_members','club_settings','club_bookings']){
  const response=await fetch(`${base}/rest/v1/${table}?select=*&limit=1`,{
    headers,signal:AbortSignal.timeout(15000)
  });
  const body=await response.json();
  assert.ok([401,403].includes(response.status),`${table}: expected denial, got ${response.status}`);
  assert.equal(body.code,'42501',`${table}: expected database permission denial`);
  console.log(`PASS anonymous SELECT denied: ${table}`);
}
const storage=await fetch(`${base}/storage/v1/object/list/documents`,{
  method:'POST',headers:{...headers,'Content-Type':'application/json'},
  body:JSON.stringify({prefix:'',limit:1}),signal:AbortSignal.timeout(15000)
});
const listing=await storage.json();
assert.ok([401,403].includes(storage.status)||(storage.ok&&Array.isArray(listing)&&listing.length===0),
  `Documents listing unexpectedly exposed data (HTTP ${storage.status})`);
console.log('PASS anonymous document listing exposes no objects (empty bucket alone does not prove RLS).');
console.log('Authenticated role isolation and cross-device reservations are NOT verified by these checks.');
