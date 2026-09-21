# Administración del club: personas, cuotas y grupos

Disponible en `/gestion` para administradores del club. Datos en Supabase de desarrollo. Los correos de recuperación continúan pendientes de SMTP; este módulo no envía emails.

## Personas y accesos

- Buscar por nombre, correo o teléfono; crear y editar fichas.
- Etiquetas múltiples por persona, filtro por etiqueta y estado de pago.
- Las cuentas que existían al aplicar la migración tienen ficha vinculada automáticamente.
- Una ficha nueva NO crea un usuario Auth, contraseña ni invitación. Crear primero la cuenta en Supabase Auth, luego usar «Acceso de…» con el mismo correo para vincularla y asignar familia, alumno, profesor o administrador.
- El correo de contacto es independiente del correo de acceso; editar la ficha no cambia Auth.
- Habilitar/deshabilitar acceso actúa sobre la membresía del club. Al deshabilitar se eliminan sus dispositivos de push del club, pero se conserva el historial. No se puede modificar el propio acceso administrativo.
- «Incluir en envíos grupales» controla únicamente la selección de destinatarios. No deshabilita el login.

## Cuotas mensuales (ARS)

Una cuota por persona y mes: importe, total acumulado abonado y nota. Saldo = importe menos abonado. Estados: sin cuota, pendiente, pago parcial o al día. No tener cuota no significa tener deuda.

No procesa dinero, verifica transferencias ni emite facturas. Al editar se ingresa el total acumulado abonado. No permite valores negativos ni abonos mayores a la cuota. El historial conserva antes/después, fecha y administrador. Una modificación concurrente exige recargar la cuota; no sobrescribe silenciosamente.

## Envíos por etiqueta

Seleccionar etiqueta, revisar destinatarios y completar título/mensaje. Incluye sus personas activas con cuenta y membresía vigentes; los filtros de búsqueda y pago NO reducen ese envío, y se avisa expresamente en la pantalla. Se guarda una lista de destinatarios al crearlo. Límite de 50 personas por envío, 10 campañas por hora y 100 avisos por minuto por remitente.

Mantener la página abierta durante el proceso. El historial permite al administrador creador continuar destinatarios sin procesar después de una interrupción. Cada destinatario tiene un identificador estable: los avisos ya registrados, incluso fallidos o sin resultado confirmado, no se repiten. No hay un trabajador en segundo plano ni reintentos automáticos de entregas inciertas.

Quien no tenga dispositivos recibe el aviso en su bandeja. Push requiere permiso previo en el celular. «Aceptado» no confirma recepción ni lectura. No se enviaron notificaciones a teléfonos durante esta implementación.

## Validación

- `node --test`: incluye continuidad de grupos, no duplicación, errores inciertos, transporte push y permisos existentes.
- `node scripts/check-management-live.mjs`: privacidad de siete tablas, restricciones por rol, etiquetas, cuotas, auditoría, conflictos, lista de grupo e idempotencia. Solo desarrollo; crea registros QA ficticios y deja la persona fuera de grupos.
- `node scripts/check-management-access-live.mjs`: vinculación de cuenta Auth de prueba, cambio de perfil, deshabilitación y rechazo entre tenants. Solo desarrollo; no manda mensajes.
- Prueba de navegador: crear etiqueta, asignar persona, cuota de 12.000 con 4.000 abonados, saldo de 8.000 y vista previa de destinatarios.

Demo guardada: etiqueta «Escuelita · Demo», asignada a Segunda familia de prueba, cuota de septiembre de 2026 con importes ficticios. Los registros QA son ficticios y permanecen para auditoría.
