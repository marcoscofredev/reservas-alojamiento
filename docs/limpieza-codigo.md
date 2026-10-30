# Limpieza de código y revisión de seguridad

30 de octubre de 2026.

## Cambios aplicados

- Se separaron los nombres del panel: `admin-routes.js` contiene las rutas privadas del servidor y `admin-client.js` es el código que recibe el navegador. La dirección pública ahora es `/admin-client.js`; la API sigue usando `/api/admin`.
- El identificador del botón pasó de `crear-reserva-prueba` a `guardar-reserva`, actualizado en HTML, JavaScript y pruebas. El estado de las reservas sigue siendo `demo`; este cambio no habilita reservas comerciales.
- Se retiró `Availability.addDays`, que solo aparecía en su definición y en una prueba de esa misma función. Las pruebas de noches, cambios de mes, años bisiestos y ventana de un año continúan.
- Se retiraron estilos de `textarea` del formulario de Contacto eliminado y una alineación de Galería ya heredada de la grilla general. Los elementos existentes conservan sus estilos.
- Se reutilizan los formateadores de fechas del calendario y del panel en lugar de construir uno por cada fecha mostrada.
- Se retiraron dos asignaciones repetidas de la cabecera de caché en respuestas correctas: el control central de seguridad ya aplica `no-store` a toda la API, incluidos errores.
- Se actualizaron el plan de mejoras y el informe de seguridad para reflejar las funciones ya entregadas.

No se agregaron dependencias ni se modificaron datos, contraseñas o reservas existentes. Las validaciones del navegador, del servidor y de PostgreSQL se conservan porque protegen etapas distintas.

## Verificación

Las 54 pruebas pasaron antes y después de la limpieza, con integración PostgreSQL habilitada y esquemas temporales separados. Cubren calendario, consultas y creación de reservas, superposiciones simultáneas, persistencia, huéspedes, acceso al panel, sesión, cancelación, privacidad, límites de solicitudes y galería.

Se amplió la comprobación de archivos privados para incluir `admin-routes.js`, `admin-password.js` y `admin-store.js`; también se comprueba que el HTML del panel apunte al archivo público correcto. No se hizo una nueva inspección visual automática del navegador: la captura mediante Computer Use no pudo verificar la dirección abierta.

La consulta de vulnerabilidades de dependencias devolvió cero hallazgos conocidos en las versiones instaladas. Esto no equivale a certificar que la aplicación sea segura en cualquier entorno.

## Seguridad pendiente

La conexión actual a PostgreSQL todavía usa un rol con permisos de administrador, creación de bases y creación de roles. Antes de publicar hay que utilizar credenciales de la aplicación con permisos reducidos, separadas de las migraciones.

También siguen pendientes HTTPS y configuración de despliegue, respaldos y recuperación de acceso, y vencimiento/verificación de solicitudes que hoy bloquean fechas sin pago. El límite por IP reduce intentos repetidos, pero no reemplaza ese flujo comercial. Ver [el informe de seguridad](revision-seguridad.md).

## Cómo cargar los cambios

Detener el servidor actual con Ctrl+C, iniciarlo otra vez con `npm.cmd start` y recargar la web y el panel. El reinicio es necesario por el nuevo nombre del módulo del servidor y la ruta del archivo público del panel. No volver a crear el usuario ni la base de datos.

Se posponen los cambios de composición de la galería. Menú móvil, preguntas desplegables, pagos y avisos siguen como próximos trabajos.

Referencia contrastada: [recomendaciones oficiales de seguridad de Express](https://expressjs.com/advanced/best-practice-security/).
