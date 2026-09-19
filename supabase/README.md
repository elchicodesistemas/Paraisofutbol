# Configurar Supabase

1. Creá un proyecto de Supabase y ejecutá `migrations/202609140001_platform.sql` en el SQL Editor, sobre un proyecto nuevo. La migración crea tablas, políticas RLS y un bucket privado `documents`. No es idempotente.
2. En `public/config.js`, elegí `mode: 'supabase'` y completá `supabase.url` y `supabase.publishableKey`. Solo claves públicas; nunca `service_role` ni `sb_secret_…`.
3. En Authentication > URL Configuration, configurá el Site URL para tu origen local o HTTPS de producción. Creá una cuenta desde Autenticación y confirmá el email. No se usa el enlace de confirmación como sesión automática: luego ingresá con email y contraseña.
4. Reemplazá el email de `provision.example.sql` y ejecutalo. Copiá el UUID generado a `tenantId` en la configuración. Recargá la aplicación.
5. Para agregar usuarios a la empresa, creá sus cuentas e insertá membresías desde el SQL Editor con rol `member` o `admin`. El navegador no puede crear empresas, asignar membresías ni elevar roles.

Las políticas permiten que todos los miembros lean registros del equipo en los módulos habilitados. Solo administradores crean registros de agenda, calendario, pagos, documentos y puntos. Miembros pueden publicar mensajes, registrar lecturas QR y eliminar sus propios mensajes/lecturas. Esta base es para equipos internos, no para exponer pagos o documentos entre clientes finales de una misma empresa: antes de ese uso agregá políticas por propietario o destinatario.

Las suscripciones push solo son accesibles a su propietario. Documentos usa paths `tenant_uuid/object_uuid`, bucket privado y enlaces firmados por 60 segundos. El servidor de push requerirá credenciales privadas y autorización independiente. Nunca coloques la clave VAPID privada en esta carpeta pública.

## Verificación antes de usar datos reales

La migración no fue ejecutada contra una instancia de Supabase durante la creación del scaffold. En una instancia de prueba, verificá:

- Usuario sin membresía no puede leer registros ni agregar membresías.
- Usuario de empresa A no puede listar, insertar o eliminar registros de B, ni abrir sus documentos.
- Miembro no puede cambiar módulos ni asignar puntos o registrar pagos.
- Un módulo deshabilitado rechaza lecturas/escrituras, incluso llamando directamente a la API.
- Administrador puede cargar un PDF y abrirlo por enlace firmado; otro tenant recibe acceso denegado.
- Cerrar sesión limpia la sesión de la pestaña; la renovación ocurre antes del vencimiento.

## Integraciones pendientes

- Pagos: proveedor (por ejemplo Mercado Pago), órdenes tipadas, importes calculados en servidor, webhook con firma verificada e idempotencia. Nunca dar por cobrado desde el navegador.
- Push: envío Web Push con VAPID privado, permisos, reintentos y limpieza de endpoints vencidos.
- Chat: Supabase Realtime, destinatarios y políticas por conversación.
- Puntos: libro de movimientos inmutable, reglas de asignación y canje transaccional.
- QR: generación y tokens de check-in firmados, con expiración y protección contra reutilización.
- Agenda: recursos, zona horaria del negocio y prevención de reservas simultáneas.

Documentación oficial consultada: [API REST](https://supabase.com/docs/guides/api), [claves públicas](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
