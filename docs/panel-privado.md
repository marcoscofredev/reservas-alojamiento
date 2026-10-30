# Panel privado de El Durazno

## Primera configuración

Las tablas de usuarios, sesiones y registro de cancelaciones ya fueron creadas en la base local. No se creó ninguna cuenta automáticamente ni existe una contraseña predeterminada.

En una terminal interactiva de VS Code, ubicada en la carpeta del proyecto:

```powershell
npm.cmd run admin:create
```

Elegir un usuario de entre 3 y 64 caracteres: letras minúsculas, números, puntos, guiones o guiones bajos. Elegir una contraseña de 12 a 128 caracteres y repetirla. Mientras se escribe no se muestra. No enviarla por el chat ni guardarla como argumento de un comando.

En Git Bash se puede usar `npm run admin:create`. Si Node no reconoce la terminal como interactiva, usar PowerShell dentro de VS Code. `npm.cmd` evita el error de ejecución del lanzador `npm.ps1`, sin cambiar la política del sistema.

El comando guarda un hash con scrypt y sal aleatoria. También genera una clave de sesión en `.env` si falta, sin mostrarla. No sobrescribe usuarios existentes ni sus contraseñas. Para otra persona se puede repetir el comando con otro usuario.

Después detener el servidor con Ctrl+C y reiniciarlo:

```powershell
npm.cmd start
```

Abrir [el panel local](http://127.0.0.1:3000/admin) e ingresar con el usuario creado. El panel y la página pública usan la misma base de reservas.

## Funciones actuales

- Ver fechas, estado, nombre, correo y teléfono del huésped después de iniciar sesión.
- Filtrar activas, canceladas o todas, con paginación de 25 reservas.
- Cancelar reservas de prueba después de confirmar la acción. Las noches se liberan y se registra quién canceló y cuándo. No se borran los datos de la reserva.
- Cerrar sesión y bloquear sesiones vencidas o de cuentas deshabilitadas.

No se cancela desde aquí una reserva marcada como confirmada: antes deberá existir la gestión de pagos y sus posibles devoluciones. Tampoco se puede marcar una reserva como pagada desde el panel actual.

Las reservas antiguas sin datos del huésped se muestran con «Sin datos».

## Seguridad de esta etapa

- No se guardan contraseñas en texto legible.
- Sesiones en PostgreSQL con cookies HttpOnly, SameSite Strict y vigencia de dos horas. En producción la cookie requiere HTTPS.
- El login regenera la sesión; cerrar sesión la elimina del servidor.
- Cada acceso privado comprueba que la cuenta siga activa.
- Los cambios requieren origen válido y un token de protección CSRF.
- El login permite cinco intentos por 15 minutos por IP; también se aplican los límites generales de la API.
- API y página del panel sin caché. El cliente limpia los datos al salir de la página y revalida al volver.
- El código del cliente usa contenido de texto, no inserta HTML de huéspedes ni conserva credenciales en almacenamiento del navegador.

Antes de publicar siguen pendientes: rol de PostgreSQL con permisos reducidos, configuración de HTTPS y proxy del hosting, respaldo/restauración, recuperación de acceso y los controles del flujo de pago. No exponer el servidor local directamente a Internet.

## Próximas etapas acordadas

1. Solicitudes pendientes y vencimiento de fechas apartadas.
2. Dos opciones de pago: Mercado Pago integrado y transferencia con revisión manual.
3. Interruptor para pausar nuevos pagos de Mercado Pago sin interrumpir los que ya estén en curso.
4. Avisos por correo con acceso al panel; WhatsApp más adelante.

Esas funciones están planificadas, no implementadas en este panel inicial.

## Verificación

La suite completa pasó 50 pruebas incluyendo PostgreSQL en esquemas temporales separados de las reservas del proyecto. Para repetirla en PowerShell:

```powershell
$env:PG_INTEGRATION = '1'
npm.cmd test
```

Las pruebas incluyen contraseña incorrecta, bloqueo de intentos, sesión persistente, sesión vencida, logout, cuenta deshabilitada, falta de token CSRF, privacidad pública, cancelación idempotente y registro de auditoría.

Referencias: [sesiones de Express](https://expressjs.com/en/resources/middleware/session/), [sesiones PostgreSQL](https://github.com/voxpelli/node-connect-pg-simple), [scrypt de Node](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).
