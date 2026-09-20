# Pruebas del piloto — 20 de septiembre de 2026

Informe inicial anterior a la conexión del piloto. El estado posterior se documenta en [SUPABASE-PILOT-2026-09-20.md](SUPABASE-PILOT-2026-09-20.md).

## Resultado

- `node --test`: 13 pruebas aprobadas, ninguna fallida.
- `node scripts/check.mjs`: 20 archivos JavaScript verificados.
- `node scripts/check-supabase.mjs`: conexión a Auth y clave pública válidas.
- `node scripts/check-supabase-access.mjs`: lectura anónima rechazada con código PostgreSQL 42501 en tenants, tenant_members, tenant_modules, module_records y push_subscriptions. Listado anónimo de documentos sin objetos expuestos; un bucket vacío por sí solo no prueba aislamiento.

Se agregaron pruebas de reserva por familia, confirmación por administrador y consulta posterior por familia; también de solicitudes simultáneas desde una misma instancia sin Web Locks, con una sola reserva aceptada.

## Alcance y límites

El piloto sigue usando autenticación de demostración y almacenamiento local. Las pruebas de roles y reservas ejecutan ese código con almacenamiento en memoria. No prueban permisos de usuarios autenticados en Supabase, aislamiento entre familias en el servidor ni sincronización entre dispositivos. Los controles del frontend no constituyen una frontera de seguridad para producción.

La prueba de concurrencia cubre una sola instancia; no demuestra protección contra reservas simultáneas desde distintos teléfonos. Los ensayos remotos fueron de lectura; no se crearon usuarios ni se modificaron datos.

## Trabajo necesario para la prueba integral remota

1. Conectar el login del piloto a Supabase Auth y asignar roles mediante datos administrados en el servidor.
2. Crear tablas de reservas con acceso por propietario y administrador, y restricciones atómicas contra superposición de horarios.
3. Sustituir el almacenamiento local del piloto por operaciones autenticadas, sin volver silenciosamente al modo local ante errores.
4. Probar con dos familias y un administrador: reserva, confirmación, consulta desde sesiones independientes, bloqueo de acceso ajeno y dos solicitudes simultáneas al mismo turno.

El entorno queda apto para demostraciones con datos ficticios. Esta ejecución no certifica uso productivo ni operación real entre dispositivos.
