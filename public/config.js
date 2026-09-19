// Public values only. Change mode explicitly after running the SQL migration.
export default {
  mode: 'demo',
  tenantId: 'demo-studio',
  brand: { name: 'Nexo', subtitle: 'Business Suite', accent: '#c9fa75' },
  locale: 'es-AR', currency: 'ARS',
  // Development project. Demo stays active until schema and real memberships are ready.
  supabase: { url: 'https://frbbsyvanjmmizvbvvja.supabase.co', publishableKey: 'sb_publishable_PYKd9RAYE5WzHsfaUJeccw_tUUWkT6o' },
  vapidPublicKey: '',
  enabledModules: ['auth', 'push', 'calendar', 'payments', 'documents', 'chat', 'agenda', 'qr', 'loyalty', 'admin'],
};
