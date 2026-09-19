import {el, button, field, safe, notice} from './ui.js';
import {validateRecord} from './validation.js';
export async function recordsView(ctx, definition) {
  const {id, label, description} = definition;
  const list = el('div', {class:'records'});
  async function refresh() {
    const rows = await ctx.store.list(id);
    if (['calendar','agenda'].includes(id)) rows.sort((a,b) => Date.parse(a.data.date) - Date.parse(b.data.date));
    list.replaceChildren(...rows.map(row => el('article', {class:'record'},
      el('div', {}, el('strong', {}, row.data.title), el('p', {},
        row.data.date ? new Date(row.data.date).toLocaleString(ctx.config.locale) :
        row.data.amount ? `${id === 'payments' ? new Intl.NumberFormat(ctx.config.locale, {style:'currency',currency:ctx.config.currency}).format(row.data.amount) : row.data.amount + ' puntos'}${row.data.status ? ' · Pendiente' : ''}` : 'Registro guardado')),
      button('Eliminar', () => safe(async () => { await ctx.store.remove(id,row.id); await refresh(); }), 'quiet')
    )));
    if (!rows.length) list.append(el('p', {class:'empty'}, 'Todavía no hay registros. Agregá el primero.'));
  }
  const submit = el('button', {type:'submit'}, 'Agregar');
  const form = el('form', {class:'entry-form', onsubmit:event => {
    event.preventDefault(); safe(async () => {
      submit.disabled = true;
      try { await ctx.store.add(id, validateRecord(id,Object.fromEntries(new FormData(form)))); form.reset(); await refresh(); notice('Registro guardado.'); }
      finally { submit.disabled = false; }
    });
  }}, field(id === 'chat' ? 'Mensaje al equipo' : 'Descripción', 'title', 'text', {maxlength:160}),
  ['calendar','agenda'].includes(id) ? field('Fecha y hora','date','datetime-local') : null,
  ['payments','loyalty'].includes(id) ? field(id === 'payments' ? 'Importe' : 'Puntos','amount','number',{min:id === 'loyalty' ? 1 : 0.01,step:id === 'loyalty' ? 1 : 0.01}) : null,
  submit);
  await refresh();
  return el('section', {class:'panel'}, el('h2',{},label), el('p',{class:'muted'},description), form,
    id === 'chat' ? button('Actualizar mensajes', () => safe(refresh),'quiet') : null, list);
}
