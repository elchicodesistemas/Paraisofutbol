import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../scripts/serve.mjs';
test('serve public shell and modules without exposing project configuration or sources',async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/','/sw.js','/src/modules/admin/index.js','/manifest.webmanifest']) assert.equal((await fetch(base+path)).status,200);
    for (const path of ['/.env','/package.json','/supabase/provision.example.sql','/..%2fpackage.json']) assert.notEqual((await fetch(base+path)).status,200);
    assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  } finally {await new Promise(resolve => server.close(resolve));}
});
