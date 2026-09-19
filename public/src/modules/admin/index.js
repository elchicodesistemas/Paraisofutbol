import {el,notice} from '../../core/ui.js';
export default {id:'admin',label:'Administración',icon:'⚙',async render(ctx) {
  return el('section',{class:'panel'},el('h2',{},'Módulos de tu empresa'),el('p',{class:'muted'},'Activá herramientas según cada cliente. Autenticación y administración permanecen disponibles.'),
    ...ctx.modules.filter(m => !['admin','auth'].includes(m.id)).map(m => {
      const input = el('input',{type:'checkbox',checked:ctx.enabled.includes(m.id),'aria-label':m.label});
      input.addEventListener('change',async () => {
        input.disabled = true;
        try {await ctx.setModule(m.id,input.checked); notice('Configuración guardada.');}
        catch(error) {input.checked = !input.checked;notice(error.message);}
        finally {input.disabled = false;}
      });
      return el('label',{class:'toggle'},el('span',{},m.label),input);
    }),el('p',{class:'muted'},`Empresa: ${ctx.config.tenantId} · Rol: ${ctx.role}`));
}};
