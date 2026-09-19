import {el, button, field, safe, notice} from '../../core/ui.js';
export default {id:'auth', label:'Autenticación', icon:'◎', async render(ctx) {
  const panel = el('section',{class:'panel'},el('h2',{},'Tu cuenta'));
  if (!ctx.backend) return el('section',{class:'panel'},el('h2',{},'Sesión de demostración'),el('p',{},'Estás probando la plataforma como administrador local. No se solicita ni almacena ninguna contraseña. Configurá Supabase para habilitar cuentas reales.'));
  if (ctx.backend.user) return el('section',{class:'panel'},el('h2',{},ctx.backend.user.email),button('Cerrar sesión', () => safe(async () => {await ctx.backend.logout(); location.reload();})));
  const form = el('form',{class:'entry-form'}, field('Email','email','email',{autocomplete:'email'}),field('Contraseña','password','password',{minlength:8,autocomplete:'current-password'}),el('button',{type:'submit'},'Ingresar'));
  form.addEventListener('submit',event => {event.preventDefault(); safe(async () => {const data = Object.fromEntries(new FormData(form)); await ctx.backend.login(data.email,data.password); location.reload();});});
  panel.append(form,button('Crear cuenta', () => safe(async () => {if (!form.reportValidity()) return; const data=Object.fromEntries(new FormData(form)); await ctx.backend.signup(data.email,data.password); notice('Solicitud recibida. Revisá tu email y pedí al administrador que te asigne a una empresa.');})));
  return panel;
}};
