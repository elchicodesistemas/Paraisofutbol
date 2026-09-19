import config from '../public/config.js';
const headers={apikey:config.supabase.publishableKey};
if(!config.supabase.url||!headers.apikey)throw new Error('Supabase public configuration is missing.');
const auth=await fetch(`${config.supabase.url}/auth/v1/settings`,{headers,signal:AbortSignal.timeout(15000)});
if(!auth.ok)throw new Error(`Supabase Auth rejected connection: HTTP ${auth.status}`);
console.log('Supabase Auth: connection and public key verified.');
const schema=await fetch(`${config.supabase.url}/rest/v1/tenants?select=id&limit=0`,{headers,signal:AbortSignal.timeout(15000)});
if(schema.status===404){console.log('Platform schema is not available yet. Apply migrations with administrative access.');process.exitCode=2;}
else if(schema.ok){console.log('Schema endpoint available. This check does not verify authenticated role isolation.');}
else if([401,403].includes(schema.status)){console.log('Anonymous table access denied; verify schema and RLS with an authenticated test account.');}
else throw new Error(`Schema check: HTTP ${schema.status}`);
