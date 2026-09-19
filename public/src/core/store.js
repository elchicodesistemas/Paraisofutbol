import {randomId} from './id.js';
export function createStore(config, backend, storage = globalThis.localStorage) {
  const key = `nexo:records:${config.tenantId}`;
  const filter = moduleId => `tenant_id=eq.${encodeURIComponent(config.tenantId)}&module_id=eq.${encodeURIComponent(moduleId)}`;
  function read() { const data = JSON.parse(storage.getItem(key) || '[]'); if (!Array.isArray(data)) throw new Error('Datos locales inválidos.'); return data; }
  return {
    async list(moduleId) {
      if (backend) return backend.request(`/rest/v1/module_records?${filter(moduleId)}&order=created_at.desc`);
      return read().filter(row => row.module_id === moduleId).sort((a,b) => b.created_at.localeCompare(a.created_at));
    },
    async add(moduleId, data) {
      const row = {tenant_id:config.tenantId, module_id:moduleId, data, created_by:backend?.user?.id || null};
      if (backend) return (await backend.request('/rest/v1/module_records', {method:'POST',body:row}))[0];
      const saved = {...row, id:randomId(), created_at:new Date().toISOString()};
      storage.setItem(key, JSON.stringify([...read(), saved])); return saved;
    },
    async remove(moduleId, id) {
      if (backend) return backend.request(`/rest/v1/module_records?${filter(moduleId)}&id=eq.${encodeURIComponent(id)}`, {method:'DELETE'});
      storage.setItem(key, JSON.stringify(read().filter(row => !(row.id === id && row.module_id === moduleId))));
    },
  };
}
