# Conexión de desarrollo

- Proyecto: `frbbsyvanjmmizvbvvja`
- URL: `https://frbbsyvanjmmizvbvvja.supabase.co`
- Repositorio: `https://github.com/elchicodesistemas/Paraisofutbol`
- Rama de trabajo: `develop`; rama reservada para versiones aprobadas: `main`.

El usuario confirmó que el proyecto está vacío. Se propone utilizarlo para desarrollo y reservar un destino independiente para producción. La clave pública está configurada en `public/config.js`; no concede permisos administrativos ni permite ejecutar SQL.

La API Auth y la clave pública se verificaron el 19/09/2026. La migración inicial `202609140001_platform` fue desplegada por la integración GitHub y se verificó en Database Migrations. El acceso anónimo a las tablas está denegado. El modo demo permanece activo hasta completar cuentas reales y políticas específicas del club. Los perfiles deportivos locales todavía no se conectan a esta base.

La integración nativa quedó habilitada con repositorio `elchicodesistemas/Paraisofutbol`, directorio `.`, y rama de despliegue `develop`. Supabase llama a ese campo «Production branch name» porque apunta a la base principal del proyecto, pero **este proyecto se utiliza como desarrollo**. Su etiqueta interna `main` no corresponde a la rama Git `main`. No se contrató Branching ni se creó un entorno productivo.

La segunda migración crea la empresa El Paraíso Deportes con ID `11ee1db5-485d-498f-a915-dd36dd7b2e70` y el catálogo inicial de módulos. No crea usuarios, membresías ni contraseñas compartidas.

Para repetir la comprobación: `node scripts/check-supabase.mjs`. El código de salida 2 indica que falta el esquema.

Pendientes para completar la vinculación:

1. Crear las cuentas reales de Auth y asignar membresías por un administrador; nunca promover automáticamente a quien se registre.
2. Implementar tablas y políticas específicas del piloto deportivo y reemplazar su autenticación demo.
3. Configurar un entorno independiente para producción y proteger la rama `main` mediante revisión y checks requeridos.

La creación de ramas en GitHub no despliega la aplicación ni configura automáticamente entornos de base de datos o protección de ramas.
