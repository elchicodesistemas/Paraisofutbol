# Ramas y entornos

## Control de versiones

- `main`: rama reservada para versiones aprobadas de producción. El primer commit es una referencia del piloto, no una certificación de que esté listo para producción.
- `develop`: rama de trabajo e integración de cambios. El desarrollo continúa aquí.
- Promoción: pull request `develop` → `main`, con las verificaciones aprobadas y revisión de las migraciones.
- No hacer force-push ni eliminar historial compartido.

GitHub Actions ejecuta validación de sintaxis/importaciones y pruebas del núcleo y del piloto. Todavía no compila el frontend React: el piloto usa dependencias del proyecto original y hay que independizar esa instalación para obtener una compilación reproducible en CI.

## Bases de datos separadas

Una rama Git no separa datos ni credenciales. Producción y desarrollo deben usar proyectos Supabase distintos o ramas Supabase aisladas. No conectar `develop` a una base productiva.

El repositorio incluye `supabase/migrations`. Antes de activar sincronización automática con una integración GitHub existente, revisar la base de destino y su historial de migraciones. No aplicar la migración inicial sobre una base desconocida.

La integración nativa GitHub → Supabase despliega las migraciones de `develop` sobre `frbbsyvanjmmizvbvvja`, utilizado como desarrollo. Directorio de trabajo: `.`. No añadir un segundo flujo de `db push` en GitHub Actions contra el mismo destino. `main` todavía no tiene base productiva asociada ni despliegue web automático.

## Configuración y secretos

- URL y clave publishable/anon son configuración pública del frontend. Su seguridad depende de Auth y RLS.
- Tokens de administración, contraseñas de base de datos y claves secret/service_role nunca van al frontend ni a Git.
- Variables privadas se guardan localmente en archivos ignorados o en los secretos del entorno de GitHub correspondiente.
- Las cuentas de Supabase con correos `@paraiso.example.com` son exclusivamente de prueba. Sus claves individuales se guardan en `.runtime`, fuera de Git. No deben convertirse en accesos productivos compartidos.

## Estado de conexión

La aplicación general Nexo conserva el modo demo. El piloto deportivo usa Auth real y reservas en Supabase con roles propios, RLS por propietario y exclusión de horarios superpuestos. Inscripciones y asistencias permanecen pendientes. La migración `202609200001_club_reservations.sql` implementa este circuito; la asignación de cuentas de prueba se realiza por separado mediante `seed-club-development.sql`.

Documentación oficial: https://supabase.com/docs/guides/deployment/managing-environments
