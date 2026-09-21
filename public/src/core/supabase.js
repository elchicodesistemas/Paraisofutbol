// Small REST adapter. Supabase RLS remains the authority for every request.
export function createSupabase(config, sessionStorage = globalThis.sessionStorage) {
  const { url, publishableKey } = config.supabase;
  if (!url.startsWith('https://') || !publishableKey) throw new Error('Completá la configuración pública de Supabase.');
  const sessionKey = `nexo:session:${url}`;
  let session;
  try { session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch { session = null; }
  function save(value) { session = value; value ? sessionStorage.setItem(sessionKey, JSON.stringify(value)) : sessionStorage.removeItem(sessionKey); }
  async function request(path, {method = 'GET', body, auth = true, upsert = false} = {}) {
    if (auth && session?.expires_at <= Date.now() / 1000 + 30) {
      const refreshed = await request('/auth/v1/token?grant_type=refresh_token', {method: 'POST', body: {refresh_token: session.refresh_token}, auth: false});
      save({...refreshed, expires_at: Date.now() / 1000 + refreshed.expires_in});
    }
    const headers = {apikey: publishableKey};
    if (auth && session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    if (!(body instanceof Blob)) headers['Content-Type'] = 'application/json';
    if (path.startsWith('/rest/')) headers.Prefer = `return=representation${upsert ? ',resolution=merge-duplicates' : ''}`;
    let response;
    try { response = await fetch(`${url.replace(/\/$/, '')}${path}`, { method, headers, body: body == null ? undefined : body instanceof Blob ? body : JSON.stringify(body) }); }
    catch { throw new Error('No pudimos conectar con la base de datos. Revisá tu conexión a Internet y volvé a cargar la página.'); }
    const raw = await response.text();
    let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || `Supabase: ${response.status}`);
    return data;
  }
  return {
    request,
    async localRequest(path,body){
      if(path!=='/api/push/send')throw new Error('Ruta local no autorizada.');
      if(!session?.access_token)throw new Error('Ingresá a tu cuenta.');
      await request('/auth/v1/user'); // Refresh if necessary and validate the session.
      let response;
      try { response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)}); }
      catch { throw new Error('Se perdió la conexión con el servidor de avisos. El enlace temporal puede haber vencido o el equipo estar desconectado. Abrí el enlace vigente y actualizá el historial antes de reenviar: el aviso podría haberse procesado.'); }
      let result;
      try { result=await response.json(); }
      catch { throw new Error('El servidor de avisos no respondió correctamente. Verificá el enlace vigente y actualizá el historial antes de reenviar.'); }
      if(!response.ok)throw new Error(result.error||'No se pudo enviar el aviso.');
      return result;
    },
    get user() { return session?.user || null; },
    async login(email, password) {
      const data = await request('/auth/v1/token?grant_type=password', {method:'POST', body:{email,password}, auth:false});
      save({...data, expires_at: Date.now() / 1000 + data.expires_in}); return data.user;
    },
    signup: (email,password) => request('/auth/v1/signup', {method:'POST', body:{email,password}, auth:false}),
    async logout() { try { await request('/auth/v1/logout?scope=local', {method:'POST'}); } finally { save(null); } },
  };
}
