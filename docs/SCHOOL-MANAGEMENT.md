# Gestión de escuela deportiva

El piloto usa `/gestion` con barra lateral. Todos los datos operativos se guardan en el proyecto Supabase de desarrollo. La app requiere conexión; el service worker solo conserva la interfaz, no las fichas privadas.

## Recorrido para administración

1. **Categorías:** definir división y rango de edad. La edad es la que cumple el alumno durante el año calendario de Argentina. Al dejar la categoría vacía en la ficha, se asigna automáticamente si hay una única coincidencia activa. Si coinciden varias divisiones, se debe elegir. El cambio de temporada requiere revisar las categorías de los alumnos; no se trasladan silenciosamente entre divisiones.
2. **Alumnos y tutores:** cargar primero al adulto responsable (mayor de edad, teléfono de emergencia), después al alumno. No se puede guardar un alumno sin tutor. La ficha incluye nacimiento, posición, cobertura, alergias, observaciones médicas y vencimiento del apto.
3. **Archivos:** desde la ficha, cargar foto y apto firmado. Desde profesores, cargar CV/certificaciones. PDF/JPG/PNG, máximo 10 MB. Son archivos privados; los enlaces de apertura duran un minuto. Cargar un apto no valida su firma ni su autenticidad.
4. **Profesores:** vincular una cuenta existente con perfil profesor, asignar categorías y remuneración mensual o por hora. No se crean cuentas ni se liquidan sueldos automáticamente.
5. **Entrenamientos:** programar sesiones individuales, con profesor, categoría y horario. Se bloquean superposiciones del mismo profesor o categoría. La agenda de reservas de canchas sigue separada. Cada sesión tiene plan de entrenamiento y pase de lista Presente/Ausente/Justificado; no se admite asistencia de días futuros. Las sesiones con asistencia no se reprograman.
6. **Cuentas y cobranzas:** generar cuota mensual o matrícula anual por alumno. Registrar cada ingreso con fecha, importe, medio y referencia. El servidor evita duplicar la cuota mensual, la matrícula de temporada y los reintentos del mismo pago. Impide pagos por encima del saldo, incluso si se registran simultáneamente. Anular requiere motivo y conserva el historial. El recibo PDF es interno, no fiscal. Los gastos se registran por rubro y medio de pago.
7. **Partidos:** fecha, hora, rival, condición y lugar; selección de convocados y estadísticas de partidos jugados. La administración puede enviar la convocatoria a las cuentas de los tutores vinculados. Tres hermanos con el mismo tutor generan un destinatario, no tres.

## Comunicación y cuentas

`Comunicación` conserva los avisos individuales. `Cuentas y etiquetas` conserva los grupos, perfiles de acceso, campañas y las cuotas anteriores por persona. Esas cuotas NO se copiaron al nuevo registro por alumno y NO se suman al dashboard de escuela.

Para notificar a un tutor, su ficha debe vincularse a una persona del padrón con cuenta habilitada. Cargar un email en la ficha no crea una cuenta de Auth. Los celulares activan push en Mi cuenta. Las campañas usan los identificadores originales al continuar; no repiten envíos con resultado registrado. El historial persiste en Cuentas y etiquetas. Máximo 50 destinatarios por campaña y 10 campañas por hora.

Los envíos de convocatorias son manuales y requieren acción explícita. Las pruebas de esta implementación no enviaron push ni correo a clientes. Quedó una campaña de demostración sin procesar para verificar la deduplicación del tutor.

## Permisos

| Perfil | Alcance |
|---|---|
| Administrador | Gestión de la escuela, archivos médicos y profesionales, finanzas y notificaciones |
| Profesor | Entrenamientos, asistencia y partidos de categorías asignadas mientras esté activo; contacto de emergencia del responsable |
| Familia / alumno | Conservan Mi cuenta y sus funcionalidades previas; no consultan el padrón escolar ni información de otros alumnos |

La base de datos verifica los permisos aunque se omita o altere el frontend. Las escrituras pasan por funciones autorizadas, las tablas tienen políticas de lectura por rol y la documentación usa el bucket privado `school-private`. El profesor no puede consultar historial médico, fechas de nacimiento de tutores, remuneraciones ni pagos. El acceso de familias a fichas deportivas propias queda fuera de esta etapa.

## Métricas

- Alumnos y profesores: registros activos del padrón escolar.
- Canchas: espacios distintos con reservas confirmadas hoy; no estima ocupación a partir del texto libre de los entrenamientos.
- Asistencia mensual: presentes / (presentes + ausentes). Excluye justificados, alumnos sin marcar y sesiones canceladas. Sin registros se muestra un guion, no 0%.
- Deuda del dashboard: saldo de cuotas generadas para el mes actual cuyo vencimiento ya pasó. Las cuotas sin generar no son deuda.

## Datos de prueba y validación

`scripts/seed-school-demo.mjs` crea tres categorías, tres alumnos ficticios, un tutor ligado a la cuenta familia y un profesor ligado a la cuenta profe; además sesiones, cuotas con tres estados, pagos y un partido. No debe ejecutarse en producción. Preserva la demo si ya existe.

`node --test` incluye cálculos de edad de temporada, redondeo de saldos, anulación y asistencia. `node scripts/check-school-live.mjs` ejecuta pruebas de permisos e integridad contra desarrollo utilizando credenciales locales ignoradas por Git. Conserva registros de auditoría ficticios, desactiva alumnos/categorías de prueba y restaura el perfil del profesor. No realiza envíos. Las pruebas de interfaz verifican escritorio, ancho de celular, edición de ficha y acceso de profesor. El PDF se revisó renderizado con textos largos y anulación, incluyendo salto de página.

## Límites del MVP

- Registro de pagos manual: no cobra, concilia bancos ni factura. Gastos y cargos no se editan ni eliminan desde la interfaz; los pagos se pueden anular con motivo.
- No hay liquidación de sueldos, entrenamientos recurrentes, firma digital, competición con tabla de posiciones ni recategorización anual automática.
- Los datos de salud se guardan como ficha actual y observaciones; no hay un historial clínico versionado.
- El túnel temporal depende de esta computadora encendida y conectada. Al cambiar el dominio, las familias deben iniciar sesión y activar push nuevamente.
- Continúa siendo desarrollo con datos ficticios. No se desplegó `main`, no se habilitó envío de correo ni se modificó DNS.

## Estructura técnica

`clients/paraiso/src/pilot/school/` separa ficha/personal, entrenamiento, finanzas, partidos, métricas, PDF y componentes compartidos. `public/school.css` está aislado bajo clases `sc-*`. Las migraciones `202609220001` a `202609220003` contienen tablas, políticas, archivos privados y funciones autorizadas; `school_save` centraliza validaciones transaccionales. La navegación usa hash bajo `/gestion`, sin nuevas rutas del servidor. Se mantiene el adaptador común de Supabase, sin claves privadas en el frontend.
