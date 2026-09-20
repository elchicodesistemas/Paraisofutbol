# Nexo · PWA Business Suite

Base local reutilizable de una plataforma PWA para empresas. El núcleo usa HTML, CSS y módulos nativos de JavaScript. El piloto Paraíso incluye React y un servidor de notificaciones Web Push; requiere instalar las dependencias con `pnpm install --frozen-lockfile` para ejecutarlo y correr toda la suite. Node.js 24 es la versión utilizada en CI.

## Iniciar

Desde esta carpeta:

```powershell
node scripts/serve.mjs
```

Abrí http://localhost:4173. Para verificar:

```powershell
node scripts/check.mjs
node --test
```

`npm run dev`, `npm run check` y `npm test` son equivalentes si tenés npm instalado. El servidor incluido solo escucha en el equipo local y es para desarrollo.

## Qué funciona

| Módulo | Implementación inicial | Próxima integración |
|---|---|---|
| Autenticación | Login, alta con confirmación de email, logout y renovación de sesión con Supabase | Recuperación de contraseña, MFA |
| Push | Permisos, aviso local, suscripción VAPID y receptor en service worker | Servicio de envío remoto |
| Calendario | Alta, listado cronológico y eliminación de eventos | Vista mensual y recurrencias |
| Pagos | Registro de cuentas pendientes | Checkout y webhooks verificados |
| Documentos | Metadatos demo; carga privada y enlaces firmados en Supabase | Versionado y eliminación de biblioteca |
| Chat | Muro compartido persistente con actualización manual | Realtime y conversaciones privadas |
| Agenda | Alta, listado y eliminación de citas | Disponibilidad y conflictos |
| QR | Lectura de imágenes con BarcodeDetector e ingreso manual | Generación y check-in seguro |
| Puntos | Registro administrativo de asignaciones | Saldo por cliente y canjes |
| Administración | Activación de módulos, identificación de empresa y rol | Gestión de miembros desde interfaz |

El modo demo usa `localStorage`, separado por empresa; no necesita credenciales. No simula cuentas ni cobros reales. Los documentos demo guardan solo metadatos. Al activar Supabase, los datos demo no se migran automáticamente y los errores de conexión nunca se sustituyen por datos locales.

## Estructura

```text
public/
  config.js              # Marca, empresa, módulos e integración pública
  src/core/              # Persistencia, validación, API y componentes compartidos
  src/modules/<modulo>/  # Un punto de entrada independiente por funcionalidad
  src/modules/index.js   # Registro explícito de módulos
  src/app.js             # Navegación, sesión y panel general
  styles.css             # Presentación compartida y adaptable
  sw.js                  # Shell offline y recepción push
  manifest.webmanifest   # Metadatos de instalación PWA
supabase/
  migrations/            # Tablas, RLS y Storage privado
  provision.example.sql  # Alta administrativa de primera empresa
scripts/                 # Servidor y verificación sin dependencias
tests/                   # Validación, aislamiento local, autenticación y servidor
```

## Reutilizar por cliente

Copiá este proyecto, modificá la marca y `tenantId` en `public/config.js`, y habilitá los módulos requeridos. Los módulos reutilizan el contrato `{id, label, icon, render(context)}`. `context` proporciona configuración, sesión, rol y un repositorio común con `list`, `add` y `remove`. Para un rubro específico, agregá su carpeta y registrala en `src/modules/index.js`; extendé también el catálogo permitido en una nueva migración.

La reutilización abarca lógica, componentes visuales y esquema de datos. El esquema JSONB permite empezar; reglas complejas deben evolucionar hacia tablas tipadas por dominio, sin acoplarlas a la marca. Calendario y agenda son conjuntos separados por ahora. `tenantId` selecciona empresa, pero la autorización real siempre depende de la membresía en Supabase y RLS.

Seguí [supabase/README.md](supabase/README.md) para conectar un proyecto. La aplicación guarda la sesión real en `sessionStorage` (por pestaña) y renderiza contenido como texto para evitar inyectar HTML. No incluye recuperación automática de una sesión revocada: cerrá sesión y volvé a ingresar.

## PWA y límites

El service worker guarda solo recursos públicos explícitos. El modo demo puede operar offline después de la primera carga; Supabase requiere conexión y no hay cola de sincronización. Usá HTTPS en producción. Incrementá la versión del caché al publicar nuevas versiones. Incluye iconos PNG de 192 y 512 píxeles y un icono SVG. La instalación depende del navegador; la compatibilidad de instalación y push en dispositivos móviles debe validarse antes de distribuir.

Esta entrega es un scaffold funcional, no una plataforma lista para producción. Las pruebas locales no reemplazan validación de políticas contra Supabase, un proveedor de pagos ni un servicio de push. Las políticas actuales comparten datos entre integrantes de un equipo; agregá autorización por destinatario antes de dar acceso a clientes finales.

Referencias: [Supabase REST](https://supabase.com/docs/guides/api), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Push en service workers](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event).
