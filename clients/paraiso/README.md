# Paraíso Fútbol — piloto local

Frontend reutilizado desde `C:/Users/fcaceres/Documents/ChatGPT/Paraiso futbol` el 19/09/2026: portada, actividades, formularios, administración, estilos y escudo. El proyecto original no se modifica ni se publica esta copia.

Ejecutar desde esta carpeta: `node serve.mjs`. Abrir http://localhost:4174.

## Integración real de código

Los componentes originales de reservas e inscripciones llaman a `src/pilot/service.ts`. Este adaptador utiliza **el mismo `createStore` del núcleo PWA**, con empresa `paraiso-pilot`. Reservas usan agenda; fichas demo usan documentos; cambios administrativos usan un registro de eventos separado. La confirmación/cancelación se refleja al consultar de nuevo la disponibilidad. Web Locks serializa las reservas entre pestañas del mismo navegador.

El piloto conserva las cinco páginas del sitio. Para servirlas sin Cloudflare ni Next se incluye un punto de entrada React, un enlace HTML compatible y estilos de soporte para sus componentes. `src/app/api`, `src/lib/database.ts`, layout y PWA originales son referencias copiadas y no entran en el bundle. No se llama a la API ni a la base de datos del sitio original.

## Límites explícitos

Solo datos ficticios: el piloto guarda los formularios en localStorage y incluye un login simulado por perfiles. No subir certificados (se rechazan); no transferir señas. No hay reservas compartidas entre dispositivos ni seguridad de servidor. Los controles locales de turnos no reemplazan transacciones en base de datos. El fixture sigue siendo ilustrativo.

La integración Supabase del núcleo sigue disponible, pero **este adaptador deportivo está limitado al modo local**. Antes de producción requiere tablas tipadas de reservas e inscripciones, autenticación real, aislamiento de fichas por propietario en servidor, disponibilidad pública sin datos personales, validación en servidor y restricción transaccional de solapamientos. Los datos locales no se migran automáticamente.

## Compilar

`public/app.js` ya está compilado. Para recompilar, instalar las dependencias de la copia de `frontend-origin.package.json` más esbuild, o indicar una instalación existente:

```powershell
$env:PARAISO_NODE_MODULES = 'C:\Users\fcaceres\Documents\ChatGPT\Paraiso futbol\node_modules'
node build.mjs
```

El archivo `frontend-origin.pnpm-lock.yaml` registra las versiones del frontend de origen. La compilación escribe exclusivamente el bundle dentro de este piloto.

## Prueba en LAN
Ejecutar con PILOT_HOST igual a la IP Wi-Fi del equipo para escuchar en esa interfaz. El modo HTTP permite formularios demo, pero no instalación/offline mediante service worker ni Web Locks. Las reservas se serializan dentro de una sola pestaña en este modo; no probar concurrencia entre pestañas. Cada navegador y origen mantiene sus propios datos, sin sincronización entre PC y celular. Usar solo datos ficticios.


## HTTPS temporal para instalación PWA
Se agregó start-https.ps1, que ejecuta cloudflared contra http://127.0.0.1:4174. El ejecutable oficial está en .runtime (ignorado por Git). Requiere el servidor local y conexión a Internet. Cada inicio genera una URL pública diferente de trycloudflare.com; al detener el túnel deja de estar disponible. El enlace no protege acceso por contraseña; usar solo datos ficticios. Los datos de cada origen permanecen separados, por lo que no aparecen automáticamente en la nueva URL. No es un despliegue productivo.



## Cuentas demo y accesos

Login se muestra a la derecha de Contactanos; con sesión aparece Mi cuenta. La contraseña común es `Paraiso123!`:

| Usuario | Perfil | Acceso |
|---|---|---|
| admin | Administrador | Todas las solicitudes, configuración y asistencia |
| familia | Familia | Crear y consultar solicitudes propias; ver Alex y su asistencia |
| alumno | Alumno | Ver únicamente clases de ejemplo y asistencia de Alex |
| profe | Profesor | Ver Alex y Luz del grupo de ejemplo y registrar su asistencia |

La sesión dura 8 horas y se guarda por pestaña. Las credenciales son públicas y el control de permisos funciona solo como simulación en el navegador; no protege información frente a quien inspeccione o altere localStorage. Los registros anteriores sin propietario solo aparecen para administración. Familias no pueden elegir el propietario de una solicitud. Alumnos y profesores no reciben las fichas personales en su vista.

Para probar un circuito, entrar como familia y solicitar un turno; salir e ingresar como admin para confirmarlo; volver a familia para consultar el estado. Registrar asistencia como profe y consultarla como alumno. Las cuentas comparten datos únicamente dentro del mismo navegador y origen web. No son cuentas de Supabase.

No hace falta base de datos para esta demostración. Para producción se necesita un proyecto Supabase de titularidad del usuario, habilitar Auth y configurar tablas y políticas de servidor según cada rol. Nunca ingresar contraseñas reales, certificados médicos o información personal en esta demo.
