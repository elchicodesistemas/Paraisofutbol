import {el,button,field,safe,notice} from '../../core/ui.js';
export default {id:'documents',label:'Documentos',icon:'▤',async render(ctx) {
  const list = el('div',{class:'records'});
  async function refresh() {
    const rows = await ctx.store.list('documents');
    list.replaceChildren(...rows.map(row => el('article',{class:'record'},el('strong',{},row.data.title),
      ctx.backend ? button('Abrir', () => safe(async () => {
        const result = await ctx.backend.request(`/storage/v1/object/sign/documents/${row.data.path}`,{method:'POST',body:{expiresIn:60}});
        const link = el('a',{href:`${ctx.config.supabase.url}/storage/v1${result.signedURL}`,target:'_blank',rel:'noopener'},'Abrir archivo (enlace válido por 60 segundos)');
        list.prepend(link);
      }),'quiet') : el('span',{class:'muted'},'Solo metadatos en demo'))));
    if (!rows.length) list.append(el('p',{class:'empty'},'Tu biblioteca está lista para el primer documento.'));
  }
  const form = el('form',{class:'entry-form'},field('Archivo (máx. 10 MB)','file','file',{accept:'.pdf,.png,.jpg,.jpeg,.txt'}),el('button',{type:'submit'},'Guardar documento'));
  form.addEventListener('submit', event => {event.preventDefault();safe(async () => {
    const file = new FormData(form).get('file');
    if (!file?.size || file.size > 10*1024*1024) throw new Error('Elegí un archivo de hasta 10 MB.');
    if (!['application/pdf','image/png','image/jpeg','text/plain'].includes(file.type)) throw new Error('Formato permitido: PDF, PNG, JPG o TXT.');
    const path = `${ctx.config.tenantId}/${crypto.randomUUID()}`;
    if (ctx.backend) await ctx.backend.request(`/storage/v1/object/documents/${path}`,{method:'POST',body:file});
    try { await ctx.store.add('documents',{title:file.name,path,size:file.size}); }
    catch (error) { if (ctx.backend) await ctx.backend.request('/storage/v1/object/documents',{method:'DELETE',body:{prefixes:[path]}}); throw error; }
    form.reset(); await refresh(); notice(ctx.backend ? 'Documento guardado en almacenamiento privado.' : 'Metadatos guardados. El archivo no se sube en modo demo.');
  });});
  await refresh(); return el('section',{class:'panel'},el('h2',{},'Biblioteca de documentos'),el('p',{class:'muted'},'Archivos privados de la empresa. En modo demo se guardan únicamente el nombre y tamaño.'),form,list);
}};
