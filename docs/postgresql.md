# Reservas guardadas en PostgreSQL

La aplicación usa ahora PostgreSQL para listar reservas, consultar disponibilidad y guardar reservas de prueba. Ya no recupera una lista ficticia al iniciar y no usa datos en memoria si falla la conexión.

## Archivos

- `database.js`: carga `.env` y administra conexiones con `pg`.
- `reservation-store.js`: contiene las consultas SQL. Las fechas recibidas se pasan como parámetros, no se concatenan.
- `server.js`: valida solicitudes y usa el almacenamiento. Una superposición devuelve 409; un fallo de acceso devuelve 503 sin detalles privados.
- `database/schema.sql`: copia de la estructura creada en pgAdmin. No volver a ejecutarla en una base que ya tiene la tabla.

El calendario recibe el mismo formato de fechas que antes. Las reservas siguen siendo simuladas: no hay cobros, confirmaciones comerciales ni datos de huéspedes.

## Protección contra superposiciones

PostgreSQL aplica la restricción `no_overlapping_reservations` a reservas `demo` y `confirmed`. El intervalo incluye la entrada y excluye la salida: una estadía puede comenzar el mismo día que termina otra. Una reserva `cancelled` no bloquea noches.

La creación consiste en un INSERT protegido por esa restricción. Aunque dos solicitudes consulten fechas libres a la vez, solo una puede guardar esas noches. Una consulta previa nunca garantiza por sí sola que la reserva posterior vaya a aceptarse.

## Cómo comprobarlo en la página

1. Guardar los archivos. Detener Node con Ctrl+C y volver a ejecutar `npm start` en Git Bash.
2. Recargar la página del puerto 3000. Una tabla vacía muestra fechas libres: las reservas ficticias anteriores no se importan automáticamente.
3. Elegir fechas libres y pulsar **Crear reserva de prueba**. Quedarán ocupadas en la base de datos.
4. Reiniciar Node y recargar: esas noches deben seguir ocupadas.

Reiniciar ya no borra datos. No hay todavía una interfaz para cancelar o eliminar reservas de prueba.

## Pruebas

`npm test` ejecuta las pruebas de reglas, calendario y API con almacenamiento aislado en memoria. No necesita contraseñas.

Para incluir PostgreSQL, desde Git Bash, con `.env` configurado:

```bash
PG_INTEGRATION=1 npm test
```

La prueba crea un esquema temporal con nombre único, ejecuta el esquema SQL allí y comprueba concurrencia, persistencia al cerrar y abrir servidor/conexiones, reservas contiguas y cancelaciones. Al finalizar elimina ese esquema. No escribe en `public.reservations`.

La guía anterior `paso-reserva-de-prueba.md` describe la etapa previa con memoria; este documento la actualiza en cuanto a almacenamiento y reinicios.
