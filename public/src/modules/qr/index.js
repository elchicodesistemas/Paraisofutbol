import {el,button,field,safe,notice} from '../../core/ui.js';
export default {id:'qr',label:'QR',icon:'▣',async render(ctx) {
  const form = el('form',{class:'entry-form'},field('Contenido del QR','title','text',{maxlength:160}),el('button',{type:'submit'},'Registrar lectura'));
  const rows = el('div',{class:'records'});
  async function refresh() {rows.replaceChildren(...(await ctx.store.list('qr')).map(row => el('article',{class:'record'},row.data.title)));}
  form.addEventListener('submit', event => {event.preventDefault(); safe(async () => {const title = String(new FormData(form).get('title')).trim(); if (!title) return; await ctx.store.add('qr',{title});form.reset();await refresh();notice('Lectura registrada; no valida identidad ni habilita acceso.');});});
  const scan = el('input',{type:'file',accept:'image/*',capture:'environment','aria-label':'Escanear imagen QR'});
  scan.addEventListener('change', () => safe(async () => {
    if (!('BarcodeDetector' in window)) throw new Error('Este navegador no admite el lector nativo. Ingresá el contenido manualmente.');
    if (!scan.files[0]) return;
    const bitmap = await createImageBitmap(scan.files[0]);
    try { const codes = await new BarcodeDetector({formats:['qr_code']}).detect(bitmap); if (!codes.length) throw new Error('No se encontró un QR.'); form.elements.title.value = codes[0].rawValue.slice(0,160); }
    finally {bitmap.close();}
  }));
  await refresh();return el('section',{class:'panel'},el('h2',{},'Lecturas QR'),el('p',{class:'muted'},'Lector de imágenes en navegadores compatibles, con ingreso manual alternativo. Generación de QR y validación de check-in pendientes.'),scan,form,rows);
}};
