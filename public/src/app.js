import config from '../config.js';
import modules from './modules/index.js';
import {createStore} from './core/store.js';
import {createSupabase} from './core/supabase.js';
import {el,button,safe,notice} from './core/ui.js';

async function start() {
  if (!['demo','supabase'].includes(config.mode)) throw new Error('Modo de configuración inválido.');
  document.documentElement.style.setProperty('--accent',config.brand.accent);
  document.title = `${config.brand.name} · ${config.brand.subtitle}`;
  const backend = config.mode === 'supabase' ? createSupabase(config) : null;
  const storageKey = `nexo:modules:${config.tenantId}`;
  let enabled = backend ? [] : JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(config.enabledModules));
  let role = backend ? null : 'admin';
  if (backend?.user) {
    const membership = await backend.request(`/rest/v1/tenant_members?tenant_id=eq.${encodeURIComponent(config.tenantId)}&user_id=eq.${encodeURIComponent(backend.user.id)}&select=role`);
    role = membership[0]?.role || null;
    const settings = await backend.request(`/rest/v1/tenant_modules?tenant_id=eq.${encodeURIComponent(config.tenantId)}&enabled=eq.true&select=module_id`);
    enabled = settings.map(row => row.module_id);
  }
  const nav = el('nav',{'aria-label':'Módulos'});
  const main = el('main',{id:'main',tabindex:'-1'});
  const ctx = {config,backend,modules,enabled,role,store:createStore(config,backend),async setModule(id,value) {
    if (backend) await backend.request(`/rest/v1/tenant_modules?tenant_id=eq.${encodeURIComponent(config.tenantId)}&module_id=eq.${id}`,{method:'PATCH',body:{enabled:value}});
    ctx.enabled = value ? [...new Set([...ctx.enabled,id])] : ctx.enabled.filter(item => item !== id);
    if (!backend) localStorage.setItem(storageKey,JSON.stringify(ctx.enabled));
    drawNav();
  }};
  function accessible(module) { return module.id === 'auth' || (role && (module.id === 'admin' ? role === 'admin' : ctx.enabled.includes(module.id))); }
  function drawNav() {
    nav.replaceChildren(button('⌂  Resumen',() => {location.hash = 'home';},'nav-item'),...modules.filter(accessible).map(module => button(`${module.icon}  ${module.label}`,() => {location.hash = module.id;},`nav-item ${location.hash === '#'+module.id ? 'active' : ''}`)));
  }
  async function dashboard() {
    const active = modules.filter(module => !['auth','admin'].includes(module.id) && accessible(module));
    return el('div',{},el('section',{class:'hero'},el('div',{},el('span',{class:'eyebrow'},'UN ESPACIO. TODAS TUS HERRAMIENTAS.'),el('h2',{},'Tu negocio, conectado.'),el('p',{},'Organizá el día a día con una plataforma que crece con vos.')),el('div',{class:'hero-mark','aria-hidden':'true'},'N')),
      el('div',{class:'stats'},...[[active.length,'Módulos activos'],[backend ? 'Cloud' : 'Local','Entorno de trabajo'],[role || 'Sin acceso','Rol de la cuenta']].map(([value,label]) => el('article',{class:'stat'},el('strong',{},value),el('span',{},label)))),
      !role ? el('p',{class:'panel'},backend?.user ? 'Tu cuenta necesita una asignación a esta empresa por un administrador.' : 'Ingresá a tu cuenta para acceder a los módulos.') : null,
      el('div',{class:'section-heading'},el('h2',{},'Tu espacio de trabajo'),el('span',{class:'muted'},'Herramientas modulares')),
      el('div',{class:'module-grid'},...active.map(module => el('a',{class:'module-card',href:`#${module.id}`},el('span',{class:'module-icon'},module.icon),el('h3',{},module.label),el('p',{},module.description || 'Configurá esta herramienta para tu empresa.'),el('span',{class:'card-link'},'Abrir módulo ↗')))));
  }
  let routeVersion = 0;
  async function render() {
    const version = ++routeVersion;
    const id = location.hash.slice(1) || 'home';
    const module = modules.find(m => m.id === id);
    drawNav();
    main.replaceChildren(el('p',{},'Cargando…'));
    try {
      const content = id === 'home' ? await dashboard() : module && accessible(module) ? await module.render(ctx) : el('section',{class:'panel'},'Este módulo no está disponible para tu cuenta.');
      if (version !== routeVersion) return;
      main.replaceChildren(el('header',{class:'page-heading'},el('div',{},el('span',{class:'eyebrow'},'TU PLATAFORMA DE GESTIÓN'),el('h1',{},module?.label || 'Resumen')),el('span',{class:'badge'},backend ? 'Supabase' : 'Demo local')),content);
    } catch(error) { if (version === routeVersion) main.replaceChildren(el('p',{class:'panel'},error.message)); }
  }
  document.querySelector('#app').replaceChildren(el('a',{class:'skip',href:'#main',onclick:event => {event.preventDefault();main.focus();}},'Saltar al contenido'),
    el('aside',{},el('div',{class:'brand'},el('span',{class:'brand-icon'},'N'),el('div',{},el('strong',{},config.brand.name),el('small',{},config.brand.subtitle))),
    el('p',{class:'nav-caption'},'WORKSPACE'),nav,el('div',{class:'sidebar-foot'},backend ? 'Datos protegidos por Supabase' : 'Modo demo · Datos en este navegador')),main);
  addEventListener('hashchange',render);
  addEventListener('offline',() => notice('Sin conexión. Los datos de Supabase requieren acceso a internet.'));
  await render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(error => notice(`PWA: ${error.message}`));
}
safe(start);
