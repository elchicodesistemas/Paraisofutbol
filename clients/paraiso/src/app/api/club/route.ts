import {database,resources} from '@/lib/database';
import {courts,sports,defaults,registrationFields,rulesVersion,timeSlots,under18,validDate,type Settings} from '@/lib/club';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const fail=(message:string,status=400)=>json({error:message},status);
function admin(req:Request){const allowed=resources().ADMIN_EMAIL;return Boolean(allowed&&req.headers.get('oai-authenticated-user-email')?.toLowerCase()===allowed.toLowerCase())}
function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin}
async function hash(value:string|ArrayBuffer){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value))).map(v=>v.toString(16).padStart(2,'0')).join('')}
async function settings():Promise<Settings>{const row=await database().prepare('SELECT data FROM settings WHERE id = ?').bind('booking').first<{data:string}>();return row?JSON.parse(row.data):defaults}
const uuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const phone=(v:string)=>/^[+\d\s()-]{6,25}$/.test(v);
const dni=(v:string)=>/^\d{6,10}$/.test(v);
async function actor(req:Request){return hash(req.headers.get('oai-authenticated-user-id')||req.headers.get('cf-connecting-ip')||'anonymous')}
export async function GET(req:Request){
try{const u=new URL(req.url);const action=u.searchParams.get('action');
if(action==='admin'){if(!admin(req))return fail('Acceso exclusivo de administración.',403);const [bookings,registrations,config]=await Promise.all([database().prepare('SELECT * FROM bookings ORDER BY created DESC LIMIT 500').all(),database().prepare('SELECT id,sport,name,dni,data,file,status,created FROM registrations ORDER BY created DESC LIMIT 500').all(),settings()]);return json({bookings:bookings.results,registrations:registrations.results,config})}
if(action==='file'){if(!admin(req))return fail('Acceso exclusivo de administración.',403);const record=await database().prepare('SELECT file FROM registrations WHERE id = ?').bind(u.searchParams.get('id')).first<{file:string}>();if(!record?.file)return fail('Archivo no encontrado.',404);const object=await resources().FILES.get(record.file);if(!object)return fail('Archivo no encontrado.',404);return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Content-Disposition':'attachment; filename="apto-fisico.'+(record.file.split('.').pop())+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
const config=await settings();const court=u.searchParams.get('court'),date=u.searchParams.get('date');
if(!court||!date)return json({config,courts});
if(!courts.includes(court)||!validDate(date))return fail('Elegí una cancha y una fecha válidas.');
const occupied=await database().prepare("SELECT start,end FROM bookings WHERE court = ? AND date = ? AND status != 'cancelada'").bind(court,date).all<{start:number;end:number}>();
return json({config,slots:config.enabled?timeSlots(config,date).map(start=>({start,available:!occupied.results.some(b=>start<b.end&&start+config.duration>b.start)})):[]});
}catch{return fail('No pudimos cargar los datos. Volvé a intentar.',503)}}
export async function POST(req:Request){
try{
if(!sameOrigin(req))return fail('Origen no permitido.',403);
if(Number(req.headers.get('content-length')||0)>6*1024*1024)return fail('El archivo supera el límite de 5 MB.',413);
const reader=req.body?.getReader();if(!reader)return fail('Solicitud vacía.');const chunks:Uint8Array[]=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>6*1024*1024){await reader.cancel();return fail('El archivo supera el límite de 5 MB.',413)}chunks.push(value)}const body=new Uint8Array(length);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length}const form=await new Response(body,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();const action=String(form.get('action')||'');const get=(key:string)=>String(form.get(key)||'').trim();
if(action==='settings'||action==='status'){
if(!admin(req))return fail('Acceso exclusivo de administración.',403);
if(action==='settings'){const data:Settings={enabled:get('enabled')==='true',open:Number(get('open')),close:Number(get('close')),duration:Number(get('duration')),deposit:Number(get('deposit')),payment:get('payment')};if(!Number.isInteger(data.open)||!Number.isInteger(data.close)||data.open<0||data.close>24||data.close<=data.open||![30,60,90,120].includes(data.duration)||!Number.isInteger(data.deposit)||data.deposit<0||data.deposit>10000000||data.payment.length>150)return fail('Revisá los horarios, la duración y la seña.');await database().prepare('INSERT INTO settings (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind('booking',JSON.stringify(data)).run();return json({ok:true})}
const table=get('kind')==='bookings'?'bookings':get('kind')==='registrations'?'registrations':null;const allowed=table==='bookings'?['pendiente','confirmada','cancelada']:['pendiente','aceptada','rechazada'];
if(!table||!uuid(get('id'))||!allowed.includes(get('status')))return fail('Cambio inválido.');
if(table==='bookings'){const row=await database().prepare('SELECT status FROM bookings WHERE id = ?').bind(get('id')).first<{status:string}>();if(row?.status==='cancelada'&&get('status')!=='cancelada')return fail('Una reserva cancelada no se reactiva. Creá una nueva para comprobar disponibilidad.');}
await database().prepare('UPDATE '+table+' SET status = ? WHERE id = ?'+(table==='bookings'?" AND status != 'cancelada'":'')).bind(get('status'),get('id')).run();return json({ok:true});
}
if(!['booking','registration'].includes(action))return fail('Solicitud inválida.');
if(!uuid(get('id')))return fail('Identificador inválido. Recargá el formulario.');
if(get('website'))return fail('Solicitud inválida.');
const owner=await actor(req),table=action==='booking'?'bookings':'registrations',created=new Date().toISOString();
const count=await database().prepare('SELECT COUNT(*) AS n FROM '+table+' WHERE actor = ? AND created > ?').bind(owner,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();if((count?.n||0)>=20)return fail('Demasiadas solicitudes. Intentá nuevamente más tarde.',429);
if(action==='booking'){
const config=await settings(),court=get('court'),date=get('date'),start=Number(get('start'));
if(!config.enabled)return fail('Las reservas están pausadas.',409);
if(!courts.includes(court)||!timeSlots(config,date).includes(start))return fail('El horario ya pasó o no corresponde a la agenda actual.',409);
if(get('name').length<3||get('name').length>120||!dni(get('dni'))||!phone(get('phone')))return fail('Revisá nombre, DNI y teléfono.');
const fingerprint=await hash(JSON.stringify([court,date,start,get('name'),get('dni'),get('phone')]));
const previous=await database().prepare('SELECT fingerprint,actor FROM bookings WHERE id = ?').bind(get('id')).first<{fingerprint:string;actor:string}>();if(previous)return previous.fingerprint===fingerprint&&previous.actor===owner?json({id:get('id'),status:'pendiente'}):fail('Identificador ya utilizado.',409);
const result=await database().prepare("INSERT INTO bookings (id,court,date,start,end,name,dni,phone,status,deposit,payment,fingerprint,actor,created) SELECT ?,?,?,?,?,?,?,?,'pendiente',?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE court = ? AND date = ? AND status != 'cancelada' AND start < ? AND end > ?)").bind(get('id'),court,date,start,start+config.duration,get('name'),get('dni'),get('phone'),config.deposit,config.payment,fingerprint,owner,created,court,date,start+config.duration,start).run();
if(!result.meta.changes)return fail('Ese turno acaba de ser reservado. Elegí otro horario.',409);return json({id:get('id'),status:'pendiente'},201);
}
const data:Record<string,string>={};for(const [key,,type,required] of registrationFields){data[key]=get(key);if((required&&!data[key])||data[key].length>500)return fail('Completá los campos obligatorios y revisá la longitud de los datos.')}
data.sex=get('sex');data.sport=get('sport');data.agreement=rulesVersion;data.acceptedAt=created;
if(!sports.includes(data.sport)||!['Masculino','Femenino'].includes(data.sex)||!validDate(data.birth)||Date.parse(data.birth)>Date.now()||Number(data.birth.slice(0,4))<1900||!dni(data.dni)||!phone(data.phone)||!phone(data.emergency)||!/^\S+@\S+\.\S+$/.test(data.email)||get('agree')!=='true')return fail('Revisá fecha, documento, teléfonos, correo y aceptación de acuerdos.');
if((under18(data.birth)&&(!data.guardian||!dni(data.guardianDni)))||(data.sport==='Futbol Masculino +18'&&under18(data.birth)))return fail('Revisá la edad y los datos del padre, madre o tutor.');
const upload=form.get('medical');let bytes:ArrayBuffer|undefined;let ext='';
if(upload instanceof File&&upload.size){if(upload.size>5*1024*1024)return fail('El apto físico debe pesar hasta 5 MB.');bytes=await upload.arrayBuffer();const b=new Uint8Array(bytes);if(b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70&&b[4]===45)ext='pdf';else if(b[0]===255&&b[1]===216&&b[2]===255)ext='jpg';else if(b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)ext='png';else return fail('Adjuntá un PDF, JPG o PNG válido.');}
const fingerprint=await hash(JSON.stringify({...data,acceptedAt:''})+(bytes?await hash(bytes):''));
const previous=await database().prepare('SELECT fingerprint,actor FROM registrations WHERE id = ?').bind(get('id')).first<{fingerprint:string;actor:string}>();if(previous)return previous.fingerprint===fingerprint&&previous.actor===owner?json({id:get('id'),status:'pendiente'}):fail('Identificador ya utilizado.',409);
const key=bytes?'medical/'+get('id')+'-'+crypto.randomUUID()+'.'+ext:null;
if(key&&bytes)await resources().FILES.put(key,bytes,{httpMetadata:{contentType:ext==='pdf'?'application/pdf':ext==='jpg'?'image/jpeg':'image/png'}});
try{await database().prepare("INSERT INTO registrations (id,sport,name,dni,data,file,status,fingerprint,actor,created) VALUES (?,?,?,?,?,?,'pendiente',?,?,?)").bind(get('id'),data.sport,data.name,data.dni,JSON.stringify(data),key,fingerprint,owner,created).run()}catch(e){if(key)await resources().FILES.delete(key);throw e}
return json({id:get('id'),status:'pendiente'},201);
}catch{return fail('No pudimos completar la solicitud. Tus datos siguen en el formulario; intentá nuevamente.',503)}}
