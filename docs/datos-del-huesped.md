# Datos del huésped y Contacto

## Qué cambió

Cuando la consulta de disponibilidad es positiva, el calendario muestra un formulario con nombre y apellido, correo y teléfono opcional. El formulario pertenece a Disponibilidad; Contacto ahora muestra canales de comunicación directa.

Al enviar, la API valida las fechas y los datos del huésped. Los guarda juntos en la misma reserva mediante parámetros SQL. PostgreSQL sigue impidiendo las superposiciones, incluso si llegan solicitudes simultáneas.

El calendario público solo recibe entrada y salida. La respuesta al guardar devuelve identificador, fechas y estado, sin nombre, correo ni teléfono. No hay una ruta pública para consultar huéspedes.

La aplicación sigue en modo de prueba. Las reservas nuevas conservan estado `demo`; todavía no agregamos confirmación comercial, pagos, correos automáticos ni un panel privado de administración.

## Archivos principales

- `guest.js`: valida y normaliza nombre, correo y teléfono.
- `database/migrations/001-guest-details.sql`: agrega las columnas sin borrar reservas anteriores. Los datos históricos quedan vacíos.
- `database/migrate.js`: ejecuta esa actualización dentro de una transacción.
- `server.js` y `reservation-store.js`: validan y guardan los nuevos campos.
- `index.html` y `script.js`: formulario de reserva y su envío.

## Prueba manual

La actualización de columnas ya fue aplicada en la base local. Para otra instalación que tenga la tabla anterior, ejecutar `npm run db:migrate` una vez; se puede repetir sin borrar datos.

1. Reiniciar el servidor con Ctrl+C y `npm start`. Recargar la página.
2. Elegir dos fechas disponibles: aparecerá el formulario del huésped.
3. Usar datos ficticios, por ejemplo `Huésped de prueba` y `huesped@example.com`. El teléfono se puede dejar vacío.
4. Guardar y comprobar que se apartan las noches.
5. En pgAdmin, Query Tool de la base del proyecto, consultar:

```sql
SELECT check_in, check_out, guest_name, guest_email, guest_phone
FROM reservations
ORDER BY created_at DESC;
```

Es una consulta local para el administrador. No publicar los resultados ni agregar estos campos a la lista pública del calendario.

## Contacto

Se quitó el formulario de consultas. El teléfono publicado corresponde a Francisco Cofré. Instagram y correo están pendientes de que el propietario confirme las cuentas; no hay enlaces inventados.
