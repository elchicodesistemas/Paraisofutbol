import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {backend,rpc,tenantId} from '../backend';
import config from '../../../../../public/config.js';
import {randomId} from '../../../../../public/src/core/id.js';
export type Ctx={data:Record<string,any[]>;admin:boolean;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;refresh:()=>Promise<void>;go:(section:string)=>void;notice:(text:string)=>void};
export const SchoolContext=createContext<Ctx>(null!);
export const useSchool=()=>useContext(SchoolContext);
export async function list(table:string){let result:any[]=[];for(let offset=0;;offset+=500){const rows=await backend.request(`/rest/v1/${table}?tenant_id=eq.${tenantId}&select=*&limit=500&offset=${offset}&order=${table==='school_medical'?'student_id':table==='school_staff_pay'?'staff_id':table==='school_assignments'?'staff_id,category_id':table==='school_attendance'?'session_id,student_id':table==='school_callups'?'match_id,student_id':table==='club_members'?'user_id':'id'}`);result.push(...rows);if(rows.length<500)return result;}}
export const save=(kind:string,data:any)=>rpc('school_save',{p_kind:kind,p_data:data});
export const options=(rows:any[])=>rows.map(r=>({value:r.id,label:r.name}));
export function Empty({children}:{children:ReactNode}){return <div className="sc-empty">{children}</div>}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={'sc-badge '+tone}>{children}</span>}
export function Card({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){return <section className="sc-card"><div className="sc-card-head"><h2>{title}</h2>{action}</div>{children}</section>}
export type Field={name:string;label:string;type?:string;required?:boolean;options?:{value:string;label:string}[];min?:number|string;max?:number|string;step?:string;maxLength?:number;hint?:string};
export function Editor({title,fields,initial={},onSave,onClose,children}:{title:string;fields:Field[];initial?:any;onSave:(data:any)=>Promise<void>;onClose:()=>void;children?:ReactNode}){
 const c=useSchool();const [id]=useState(initial.id||randomId());
 return <section className="sc-editor"><div className="sc-card-head"><h2>{title}</h2><button type="button" className="sc-quiet" onClick={onClose} disabled={c.busy}>Cerrar</button></div><form onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const data:any={...initial,id};for(const f of fields)data[f.name]=f.type==='checkbox'?fd.has(f.name):f.type==='multi'?fd.getAll(f.name):fd.get(f.name);void c.run(async()=>{await onSave(data);await c.refresh();onClose();c.notice('Cambios guardados.');});}}><fieldset disabled={c.busy} className="sc-form-grid">{fields.map(f=>f.type==='multi'?<fieldset className="sc-wide sc-choices" key={f.name}><legend>{f.label}</legend>{f.options?.map(o=><label key={o.value}><input type="checkbox" name={f.name} value={o.value} defaultChecked={(initial[f.name]||[]).includes(o.value)}/>{o.label}</label>)}</fieldset>:f.type==='checkbox'?<label className="sc-check" key={f.name}><input type="checkbox" name={f.name} defaultChecked={initial[f.name]??true}/>{f.label}</label>:<label key={f.name} className={f.type==='textarea'?'sc-field sc-wide':'sc-field'}>{f.label}{f.type==='select'?<select name={f.name} required={f.required} defaultValue={initial[f.name]??''}><option value="">Seleccionar…</option>{f.options?.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:f.type==='textarea'?<textarea name={f.name} rows={4} maxLength={f.maxLength||5000} defaultValue={initial[f.name]||''}/>:<input name={f.name} type={f.type||'text'} required={f.required} min={f.min} max={f.max} step={f.step} maxLength={f.maxLength||200} defaultValue={initial[f.name]??''}/>} {f.hint&&<small>{f.hint}</small>}</label>)}{children}</fieldset><div className="sc-form-actions"><button className="sc-primary" disabled={c.busy}>{c.busy?'Guardando…':'Guardar'}</button><button type="button" className="sc-quiet" onClick={onClose} disabled={c.busy}>Cancelar</button></div></form></section>;
}
export const selectField=(name:string,label:string,rows:any[],required=true):Field=>({name,label,type:'select',options:options(rows),required});
export const choiceField=(name:string,label:string,values:string[],required=true):Field=>({name,label,type:'select',options:values.map(v=>({value:v,label:v})),required});
export async function signedFile(path:string){const r=await backend.request('/storage/v1/object/sign/school-private/'+path,{method:'POST',body:{expiresIn:60}});const url=r.signedURL||r.signedUrl;if(!url)throw Error('No se pudo abrir el archivo.');return config.supabase.url+'/storage/v1'+url;}
export function StudentPhoto({student}:{student:string}){
 const c=useSchool(),[src,setSrc]=useState('');const file=[...c.data.school_files].filter(f=>f.student_id===student&&f.kind==='Foto').sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
 useEffect(()=>{let alive=true;setSrc('');if(file)void signedFile(file.path).then(url=>{if(alive)setSrc(url);}).catch(()=>{});return()=>{alive=false;};},[file?.path]);
 return src?<img className="sc-student-photo" src={src} alt="Foto del alumno"/>:<span className="sc-photo-placeholder">Sin foto disponible</span>;
}
export function Documents({student,staff}:{student?:string;staff?:string}){
 const c=useSchool(),[link,setLink]=useState('');const files=c.data.school_files.filter(f=>student?f.student_id===student:f.staff_id===staff);
 async function upload(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const data=new FormData(form),file=data.get('file') as File,kind=String(data.get('kind'));await c.run(async()=>{
 if(!file?.size||file.size>10*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(file.type))throw Error('Elegí un PDF, JPG o PNG de hasta 10 MB.');
 if(kind==='Foto'&&!file.type.startsWith('image/'))throw Error('La foto debe ser JPG o PNG.');
 const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());const valid=file.type==='application/pdf'?String.fromCharCode(...bytes.slice(0,5))==='%PDF-':file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 if(!valid)throw Error('El contenido no coincide con el tipo de archivo.');
 const id=randomId(),ext=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg',path=`${tenantId}/${id}/archivo.${ext}`;
 await backend.request('/storage/v1/object/school-private/'+path,{method:'POST',body:file});
 try{await rpc('school_register_file',{p_id:id,p_student:student||null,p_staff:staff||null,p_kind:kind,p_name:file.name.slice(0,200),p_path:path});}catch(error){await backend.request('/storage/v1/object/school-private',{method:'DELETE',body:{prefixes:[path]}}).catch(()=>{});throw error;}
 form.reset();await c.refresh();c.notice('Archivo privado guardado.');
 });}
 return <div className="sc-documents"><h3>Archivos privados</h3><p>PDF, JPG o PNG · hasta 10 MB. Los aptos médicos y certificaciones solo son visibles para administración.</p>{c.admin&&<form onSubmit={upload} className="sc-inline"><label>Tipo<select name="kind">{(student?['Foto','Apto médico']:['Certificación']).map(v=><option key={v}>{v}</option>)}</select></label><label>Archivo<input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required/></label><button disabled={c.busy} className="sc-primary">Subir archivo</button></form>}{files.map(f=><div className="sc-list-row" key={f.id}><span>{f.kind} · {f.name}</span><button className="sc-quiet" onClick={()=>void c.run(async()=>{setLink(await signedFile(f.path));})}>Preparar apertura</button></div>)}{link&&<a className="sc-link" href={link} target="_blank" rel="noreferrer">Abrir archivo (enlace válido por 1 minuto) ↗</a>}{!files.length&&<Empty>Todavía no hay archivos.</Empty>}</div>;
}
