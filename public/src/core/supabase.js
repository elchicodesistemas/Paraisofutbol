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
    const response = await fetch(`${url.replace(/\/$/, '')}${path}`, { method, headers, body: body == null ? undefined : body instanceof Blob ? body : JSON.stringify(body) });
    const raw = await response.text();
    let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || `Supabase: ${response.status}`);
    return data;
  }
  return {
    request,
    get user() { return session?.user || null; },
    async login(email, password) {
      const data = await request('/auth/v1/token?grant_type=password', {method:'POST', body:{email,password}, auth:false});
      save({...data, expires_at: Date.now() / 1000 + data.expires_in}); return data.user;
    },
    signup: (email,password) => request('/auth/v1/signup', {method:'POST', body:{email,password}, auth:false}),
    async logout() { try { await request('/auth/v1/logout', {method:'POST'}); } finally { save(null); } },
  };
}
