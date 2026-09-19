import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const root = new URL('../',import.meta.url);
let count=0;
async function walk(url) {
  for (const item of await readdir(url,{withFileTypes:true})) {
    const child = new URL(item.name+(item.isDirectory() ? '/' : ''),url);
    if (item.isDirectory()) await walk(child);
    else if (/\.(js|mjs)$/.test(item.name)) {
      const result = spawnSync(process.execPath,['--check',child.pathname.replace(/^\/([A-Za-z]:)/,'$1')],{encoding:'utf8'});
      if (result.status !== 0) throw new Error(result.stderr);
      const text=await readFile(child,'utf8');
      for (const match of text.matchAll(/(?:from\s+|import\s*)['"]([.][^'"]+)['"]/g)) await readFile(new URL(match[1],child));
      count++;
    }
  }
}
await walk(new URL('public/',root));
console.log(`${count} JavaScript files checked; local imports resolved.`);
