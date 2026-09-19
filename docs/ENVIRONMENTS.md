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

No se agrega despliegue automático por ahora: se debe verificar primero el repositorio que ya está vinculado a Supabase, la rama de producción y el destino de desarrollo para no duplicar ejecuciones de migraciones.

## Configuración y secretos

- URL y clave publishable/anon son configuración pública del frontend. Su seguridad depende de Auth y RLS.
- Tokens de administración, contraseñas de base de datos y claves secret/service_role nunca van al frontend ni a Git.
- Variables privadas se guardan localmente en archivos ignorados o en los secretos del entorno de GitHub correspondiente.
- Las cuentas `admin`, `familia`, `alumno` y `profe` actuales son demo. No deben convertirse en accesos productivos compartidos.

## Estado de conexión

La aplicación general tiene un adaptador Supabase preparado. El piloto deportivo todavía usa autenticación y almacenamiento locales. Conectar el piloto requiere implementar Auth real, membresías por rol, tablas deportivas y permisos por propietario, y probarlos antes de cambiar el modo demo.

Documentación oficial: https://supabase.com/docs/guides/deployment/managing-environments
