# Login y recuperación

El login incluye mostrar/ocultar contraseña y /login?recuperar=1 para solicitar recuperación. Supabase envía el enlace con retorno a /login; el fragmento de recuperación se elimina de la dirección y el token se conserva únicamente en memoria para actualizar la contraseña. No cambia la sesión existente ni asigna roles. Recargar esa pantalla requiere volver a abrir el enlace. Los enlaces inválidos permiten solicitar uno nuevo.

Configuración comprobada el 21/09/2026: URL exacta permitida https://linked-validation-acrobat-citation.trycloudflare.com/login. Si cambia el túnel, agregar su URL exacta en Authentication > URL Configuration. No habilitar comodines para todo trycloudflare.com.

Pendiente externo: SMTP personalizado deshabilitado en Supabase. Configurar proveedor y remitente verificado en Authentication > Emails > SMTP Settings. El servicio integrado limita destinatarios al equipo del proyecto. Las cuentas ficticias example.com no tienen buzón. No se realizó un envío real ni un cambio de contraseña real durante esta implementación.

Cuentas: no existe registro público en el piloto ni pantalla de altas en el panel del club. Crear usuario en Supabase Auth y asignar membresía/rol en club_members son pasos distintos. Tener una cuenta Auth no concede acceso al club. No se modificaron las opciones de registro del proveedor.

Validación: compilación, 22 pruebas existentes, comprobación visual del botón y formulario de recuperación, enlace vencido sin formulario de cambio. Falta prueba integral con correo real y SMTP.
