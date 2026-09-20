# Piloto conectado a Supabase — 20/09/2026

Esta entrega reemplaza las limitaciones de conexión descritas en el informe inicial TEST-RESULTS-2026-09-20.md para login y reservas. Inscripciones y asistencia siguen pendientes.

## Implementado

- Supabase Auth por correo y contraseña, restauración de sesión y logout limitado al dispositivo/sesión actual.
- Perfiles de club administrados en `club_members`, separados de los administradores de la plataforma general.
- Reservas persistentes con RLS: familias ven sus propias reservas; administración ve todas las del club; otros perfiles no ven fichas.
- Escrituras mediante funciones autorizadas. El servidor decide propietario, duración, seña y estado inicial. No se admiten escrituras directas ni autoasignación de roles.
- Restricción de exclusión PostgreSQL contra horarios superpuestos y clave de idempotencia para reintentos.
- Confirmación/cancelación por administrador, consulta manual actualizada desde cualquier sesión y configuración validada de agenda.
- Sin persistencia local de reservas ni sustitución por datos demo ante errores. Las credenciales demo antiguas no se incluyen en el bundle.

## Verificación

- 13 pruebas locales aprobadas, 20 archivos JavaScript verificados y compilación React aprobada.
- 11 escenarios remotos aprobados con `node scripts/check-club-live.mjs`: usuarios reales, membresías, configuración, propiedad, aislamiento entre familias y roles, intentos de escritura directa y de escalar privilegios, sesión independiente, validación, concurrencia, disponibilidad y cancelación.
- Lectura anónima denegada en ocho tablas; ningún documento expuesto en el listado anónimo.
- Circuito visual probado: familia desde localhost → reserva → administrador desde HTTPS temporal → confirmación → consulta de la familia. Reserva ficticia de referencia `9f9b7d04-ec76-41df-819f-0d80668a628a`, Cancha1, 06/11/2026 09:00, conservada confirmada para demostración. Las reservas automatizadas se cancelaron conservando historial.
- No se utilizó un teléfono físico: la prueba de sincronización empleó sesiones independientes y dos orígenes web. Se deja HTTPS disponible para la comprobación del usuario desde el celular.

## Accesos y operación

Cinco cuentas del club (administración, dos familias, alumno y profesor) más una cuenta sin membresía para ensayos negativos. Claves distintas generadas y guardadas únicamente en `.runtime/test-accounts.json` y `.runtime/ACCESOS-PRUEBA.md`, ignorados por Git y no servidos por la web. Sin envíos de correo ni claves administrativas en el frontend.

Proyecto: `frbbsyvanjmmizvbvvja`, destinado a desarrollo. La migración se desplegó desde `develop` mediante la integración nativa de Supabase; las membresías ficticias se cargaron por separado. `main` sigue reservado a versiones aprobadas.

Las sesiones se conservan por pestaña. La disponibilidad y el estado se actualizan al consultar/recargar o pulsar Actualizar; no se implementó Realtime. El sitio temporal depende del equipo y del túnel. No hay ambiente productivo, cobros reales ni migración automática de reservas anteriores. Alumnos y profesores pueden entrar, pero sus módulos no están conectados.
