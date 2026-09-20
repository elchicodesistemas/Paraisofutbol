# Notificaciones del piloto Paraíso

## Demostración desde celulares

Usar la dirección HTTPS temporal vigente que figura en `.runtime/ACCESOS-PRUEBA.md`. Las cuentas y contraseñas son las mismas del piloto con Supabase. Si cambia el dominio del túnel, instalar y activar nuevamente desde la nueva dirección.

1. **iPhone (iOS 16.4 o posterior):** abrir el enlace en Safari, Compartir → Agregar a pantalla de inicio; abrir desde ese ícono, ingresar como familia y tocar Activar notificaciones. Aceptar el permiso del sistema.
2. **Android:** abrir en Chrome, instalar/agregar la app si aparece la opción, ingresar como familia y tocar Activar notificaciones. Aceptar el permiso.
3. Tocar Enviar aviso de prueba. Para demostrar recepción en segundo plano, dejar la sesión iniciada y cerrar la app; no pulsar Cerrar sesión.
4. En otro equipo, ingresar como administrador, abrir Gestión y elegir destinatario. El número de dispositivos activados se consulta con Actualizar dispositivos e historial.
5. Elegir Pendiente de pago o Recordatorio de actividad, editar el texto y pulsar Enviar recordatorio ahora. El aviso también queda en Mi cuenta → Mis últimos avisos.

Si no llega, revisar permiso de notificaciones y modo de concentración/no molestar; confirmar que se instaló desde el dominio vigente y que el panel muestra al menos un dispositivo. Desactivar y volver a activar permite renovar una suscripción. Los permisos solo se solicitan al tocar el botón.

Referencia de compatibilidad: [Web Push en iOS y iPadOS — WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Alcance

- Envío manual de recordatorios a una cuenta, en hasta cinco dispositivos.
- Aviso de prueba propio para cualquier miembro del club.
- Bandeja privada persistida en Supabase e historial administrativo.
- Envío cifrado mediante Web Push y firma VAPID; claves privadas únicamente en el servidor.
- Registro de aceptación, fallos y eliminación de suscripciones vencidas. “Aceptado” significa que el proveedor aceptó el mensaje, no recepción ni lectura por la persona.
- Límite de diez avisos por minuto por emisor; solicitudes repetidas con el mismo identificador no se reenvían.
- Desactivación por dispositivo y al cerrar sesión. Cambiar de cuenta no debe conservar los avisos de la anterior.

No se calculan deudas ni se realizan cobros. No hay tareas programadas ni envío automático por vencimiento/calendario. Tampoco se confirma lectura ni se garantiza entrega del sistema operativo. Solo datos ficticios para la demostración.

## Operación

Instalar desde la raíz con `pnpm install --frozen-lockfile` (pnpm 11.25.0 y Node 24 usados en esta entrega). Iniciar `node clients/paraiso/serve.mjs`; después ejecutar `clients/paraiso/start-https.ps1` para crear el túnel.

El servidor genera una sola vez `.runtime/push-vapid.json`, ignorado por Git. Conservar ese archivo; regenerarlo requiere volver a activar los dispositivos. Solo la clave pública sale por `/api/push/config`. El servidor no usa una clave service_role: valida el JWT y ejecuta funciones de Supabase con los permisos del usuario autenticado.

La migración `202609200002_club_push.sql` añade dispositivos, bandeja y resultados. Las funciones verifican club, rol, destinatario, módulo habilitado, tamaño y origen de la suscripción. El servidor restringe destinos a proveedores push conocidos y nunca permite URLs de red local. No se guardan tokens de sesión en el servidor.

**El equipo, el servidor y el túnel deben estar encendidos para enviar y abrir la app.** Para una demostración estable o producción falta alojar el servidor en una dirección HTTPS permanente; un túnel temporal puede vencer. Una vez aceptado, el proveedor puede retener un aviso hasta una hora si el celular está desconectado.

## Verificación realizada

- 21 pruebas locales aprobadas, incluyendo cifrado/firma con la biblioteca Web Push, autorización del emisor, idempotencia, ausencia de dispositivos, expiración, destino seguro y manejo del aviso por el service worker.
- Seis escenarios contra Supabase aprobados con `node scripts/check-push-live.mjs`: lectura anónima bloqueada, aislamiento de dispositivos, rol administrador, idempotencia, bandeja privada y registro de fallos. El script crea una suscripción técnica, no envía mensajes a proveedores y elimina esa suscripción al terminar.
- Prueba visual HTTPS: administrador envía recordatorio de actividad a la familia; la bandeja de la familia lo recibe; el panel informa correctamente que no hay dispositivos activados.
- API pública revisada: la clave privada no se expone.
- Envío real al dispositivo Android registrado por el usuario: Google aceptó el mensaje. Se corrigió la interpretación de respuestas HTTP 204 de Supabase, que antes mostraba un error después de guardar correctamente la aceptación. Hay una prueba de regresión para este caso.
- El usuario confirmó recepción real del recordatorio de actividad en Android después de la corrección. Se verificó el circuito administrador → proveedor push → celular.
- Pendiente de comprobación: recepción real en iPhone desde la app instalada. No se dio por verificada a partir de la prueba Android.

Biblioteca: [web-push](https://github.com/web-push-libs/web-push).
