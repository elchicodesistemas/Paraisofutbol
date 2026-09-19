// Public values only. Change mode explicitly after running the SQL migration.
export default {
  mode: 'demo',
  tenantId: 'demo-studio',
  brand: { name: 'Nexo', subtitle: 'Business Suite', accent: '#c9fa75' },
  locale: 'es-AR', currency: 'ARS',
  supabase: { url: '', publishableKey: '' },
  vapidPublicKey: '',
  enabledModules: ['auth', 'push', 'calendar', 'payments', 'documents', 'chat', 'agenda', 'qr', 'loyalty', 'admin'],
};
