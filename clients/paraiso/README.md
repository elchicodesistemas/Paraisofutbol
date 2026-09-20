# Paraíso Fútbol — piloto con Supabase

El frontend reutiliza el sitio original de Paraíso. El piloto se sirve con `node serve.mjs` desde esta carpeta, en http://localhost:4174.

## Login y reservas compartidas

El piloto utiliza Supabase Auth y las tablas `club_members`, `club_settings` y `club_bookings`. Cada familia consulta únicamente sus reservas; el administrador del club confirma, cancela y configura la agenda. Alumnos y profesores pueden iniciar sesión, pero no reservar ni consultar fichas de otras personas. Sus módulos de clases y asistencia quedan pendientes.

El servidor asigna el propietario desde la sesión, valida horarios y datos, y evita solapamientos mediante una restricción de PostgreSQL. Un identificador de solicitud hace seguros los reintentos. Los permisos se verifican en la base, aunque se altere el frontend. El cierre de sesión afecta solo a la sesión actual.

`src/pilot/backend.ts` selecciona el proyecto y la empresa. El núcleo Nexo en el puerto 4173 conserva su modo demo independiente. El antiguo adaptador local se conserva como `demo-service.ts` y `demo-auth.ts` para pruebas; no está incluido en el frontend publicado.

## Cuentas de desarrollo

Se crearon perfiles admin, familia, familia2, alumno y profe con correos terminados en `@paraiso.example.com`. No se envían mensajes a esos correos ficticios. Las contraseñas individuales están en `../../.runtime/ACCESOS-PRUEBA.md`, ignorado por Git y fuera de los archivos públicos. La cuenta sin-acceso sirve únicamente para pruebas negativas.

Las asignaciones de desarrollo están documentadas en `../../supabase/seed-club-development.sql`, separado de las migraciones automáticas. Para otros clientes, crear sus usuarios y asignar membresías con acceso administrativo; no reutilizar estas cuentas.

## Verificaciones

Desde la raíz del repositorio:

- `node --test`: pruebas locales del núcleo y del adaptador demo.
- `node scripts/check-supabase-access.mjs`: comprobación remota de lectura anónima.
- `node scripts/check-club-live.mjs`: prueba integral remota con cuentas del archivo local ignorado. Crea reservas ficticias y las cancela al terminar, conservando el historial. Ejecutar solo en desarrollo; no forma parte de las pruebas automáticas de CI.

## Compilación y HTTPS

El archivo `public/app.js` se entrega compilado. Para recompilar:

```powershell
$env:PARAISO_NODE_MODULES = 'C:\Users\fcaceres\Documents\ChatGPT\Paraiso futbol\node_modules'
node build.mjs
```

`start-https.ps1` permite iniciar un túnel temporal contra el servidor local. Cada inicio puede generar una dirección distinta. Los datos guardados en Supabase persisten entre direcciones y dispositivos, pero hay que iniciar sesión en cada uno. El sitio requiere Internet para consultar y guardar reservas; el service worker almacena solo la interfaz pública.

## Límites

Entorno de desarrollo: usar datos ficticios y no transferir dinero. Inscripciones, certificados, clases y asistencia todavía no están conectados. No se migran automáticamente las reservas del antiguo almacenamiento local ni del sitio original. Pagos y notificaciones remotas no forman parte de esta entrega.

Antes de producción faltan dominio y alojamiento estables, proyecto Supabase productivo separado, alta y recuperación de cuentas, gestión operativa de usuarios, respaldo y validación con el club. La compilación todavía depende de la instalación local del frontend original.
