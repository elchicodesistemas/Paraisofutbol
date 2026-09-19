# Conexión de desarrollo

- Proyecto: `frbbsyvanjmmizvbvvja`
- URL: `https://frbbsyvanjmmizvbvvja.supabase.co`
- Repositorio: `https://github.com/elchicodesistemas/Paraisofutbol`
- Rama de trabajo: `develop`; rama reservada para versiones aprobadas: `main`.

El usuario confirmó que el proyecto está vacío. Se propone utilizarlo para desarrollo y reservar un destino independiente para producción. La clave pública está configurada en `public/config.js`; no concede permisos administrativos ni permite ejecutar SQL.

La API Auth respondió correctamente el 19/09/2026. La consulta del endpoint `tenants` devolvió tabla inexistente. El modo demo permanece activo hasta completar migraciones, cuentas reales y validación de permisos. Los perfiles deportivos locales todavía no se conectan a esta base.

Para repetir la comprobación: `node scripts/check-supabase.mjs`. El código de salida 2 indica que falta el esquema.

Pendientes para completar la vinculación:

1. Dar acceso administrativo mediante la conexión Supabase o iniciar sesión en el panel abierto. No compartir contraseñas ni claves secretas en el chat.
2. Revisar la integración GitHub existente, su rama y directorio configurados antes de aplicar migraciones para evitar ejecuciones duplicadas.
3. Aplicar y registrar la migración inicial; crear la empresa y membresías con cuentas reales.
4. Implementar tablas y políticas específicas del piloto deportivo y reemplazar su autenticación demo.
5. Configurar un entorno independiente para producción y proteger la rama `main` mediante revisión y checks requeridos.

La creación de ramas en GitHub no despliega la aplicación ni configura automáticamente entornos de base de datos o protección de ramas.
