import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
const root = fileURLToPath(new URL('../public/',import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
export const server = createServer(async (request,response) => {
  try {
    if (!['GET','HEAD'].includes(request.method)) {response.writeHead(405).end();return;}
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const path = resolve(root,'.'+(pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root+sep)) {response.writeHead(403).end();return;}
    const body = await readFile(path);
    response.writeHead(200,{'Content-Type':mime[extname(path)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {response.writeHead(404).end('Not found');}
});
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 4173),'127.0.0.1',() => console.log('Nexo: http://localhost:4173'));
