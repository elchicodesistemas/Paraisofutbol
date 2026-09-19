import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
// Use a local installation, or an explicitly supplied dependency directory.
const root=fileURLToPath(new URL('./',import.meta.url));
const dependencies=process.env.PARAISO_NODE_MODULES||join(root,'node_modules');
const require=createRequire(join(dependencies,'../package.json'));
const {build}=require('esbuild');
await build({entryPoints:[join(root,'src/pilot/main.tsx')],outfile:join(root,'public/app.js'),bundle:true,format:'esm',platform:'browser',jsx:'automatic',minify:true,nodePaths:[dependencies],alias:{'@':join(root,'src'),'next/link':join(root,'src/pilot/link.tsx')},define:{'process.env.NODE_ENV':'"production"'},logLevel:'info'});
