import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const routes=['/','/actividades','/reservas','/inscripciones','/gestion','/login','/mi-cuenta'];
const host=process.env.PILOT_HOST||'127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}const url=new URL(req.url,'http://localhost');const path=resolve(root,'.'+(routes.includes(url.pathname)?'/index.html':decodeURIComponent(url.pathname)));if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return;}const data=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404).end('Not found');}}).listen(4174,host,()=>console.log(`Paraíso piloto: http://${host}:4174`));
