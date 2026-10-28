# Del calendario a una reserva simulada

> Etapa anterior: este documento describe la versión en memoria. La implementación actual guarda en PostgreSQL y conserva las reservas al reiniciar. Ver [la actualización sobre PostgreSQL](postgresql.md).

Actualizado el 28 de octubre de 2026.

## Qué quedó hecho

El calendario consulta al servidor cuando elegís entrada y salida. Si el servidor informa disponibilidad, aparece **Crear reserva de prueba**. Elegir fechas por sí solo no crea ninguna reserva.

Al pulsar ese botón, la página envía las fechas al servidor. El servidor vuelve a comprobarlas, agrega una reserva simulada a su lista en memoria y devuelve el resultado. Luego la página actualiza el calendario para mostrar las nuevas noches ocupadas.

Todo sigue siendo una demostración: no se piden datos personales, no se cobra y las reservas creadas se borran al reiniciar el servidor.

## Las tres peticiones

| Petición | Función |
| --- | --- |
| `GET /api/reservas` | Entrega las fechas ocupadas para dibujar el calendario. |
| `GET /api/disponibilidad?checkIn=...&checkOut=...` | Comprueba una estadía concreta y calcula sus noches. |
| `POST /api/reservas` | Recibe las fechas en JSON y crea una reserva simulada si siguen disponibles. |

GET consulta datos. POST solicita una creación. Express necesita `express.json()` para interpretar el cuerpo JSON del POST.

## Por qué comprobamos dos veces

Entre consultar disponibilidad y enviar una solicitud, otra persona podría ocupar las fechas. Por eso el POST vuelve a revisar el rango y las reservas actuales; no confía en el resultado anterior del navegador.

En esta aplicación de una sola instancia, la comprobación y el agregado a la lista ocurren seguidos, sin esperas intermedias. La prueba de dos solicitudes simultáneas acepta una y rechaza la otra. Esto no sustituye las transacciones y restricciones que necesitaremos cuando incorporemos una base de datos y más procesos.

## Las respuestas del servidor

- **201:** se creó una reserva de prueba.
- **400:** faltan fechas, no existen o no respetan el rango.
- **409:** las noches ya están ocupadas.
- **413:** el contenido enviado es demasiado grande.
- **415:** el formato de la petición no es JSON.

Las fechas se validan antes de consultar conflictos. Una salida y otra entrada pueden coincidir el mismo día.

## Qué cambió en los archivos

- `server.js`: API de creación, lectura de JSON y función `createApp` para probar con servidores aislados. `require.main === module` inicia el servidor solo al ejecutar ese archivo directamente.
- `script.js`: consulta automática, prevención de respuestas atrasadas, botón de creación de prueba y actualización de las fechas ocupadas. El botón se habilita únicamente después de una respuesta válida del servidor.
- `index.html`: acción de prueba y mensaje de resultado. No se restauraron los campos manuales de fecha.
- `style.css`: solo espacio para la nueva acción; la revisión de colores y contraste sigue pendiente.
- `package.json`: comandos `npm start` y `npm test`.
- `tests/`: pruebas de reglas, calendario y peticiones HTTP reales contra instancias de prueba.

## Cómo verlo

1. Guardá cualquier cambio pendiente en el editor.
2. En la terminal del servidor anterior, presioná **Ctrl + C**.
3. Ejecutá `npm start` y dejá esa terminal abierta.
4. Abrí `http://127.0.0.1:3000/` y recargá la página.
5. Con los datos iniciales y la fecha de este documento, elegí del **15 al 18 de noviembre de 2026**.
6. Esperá el resultado del servidor y pulsá **Crear reserva de prueba**.
7. Debería aparecer el mensaje de creación y quedar ocupadas las noches del **15, 16 y 17**. El día **18** permite una nueva entrada.
8. Recargar el navegador conserva la simulación mientras el proceso siga vivo. Reiniciar Node vuelve a las dos reservas iniciales.

Las pruebas automatizadas se ejecutan con `npm test`. Usan servidores separados y fechas controladas; no alteran las reservas de la instancia que tenés abierta.

## Lo que todavía falta

Persistencia en PostgreSQL, reservas reales, datos y consentimiento del huésped, autenticación del dueño, estados pendientes y confirmados, política de cancelación completa y cobros. La disponibilidad actual es demostrativa, sin promesa de una reserva comercial.
