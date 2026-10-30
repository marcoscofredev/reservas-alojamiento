# Revisión funcional y de seguridad

Revisión inicial: 29 de octubre de 2026. Actualizada el 30 de octubre de 2026. Alcance: código y dependencias de esta versión, API local, calendario, panel, galería y almacenamiento PostgreSQL. No es una certificación ni una prueba de un alojamiento publicado; no incluye firewall, sistema operativo, servidor de correo ni infraestructura de hosting.

El panel privado permite consultar y cancelar reservas de prueba. Ver [su configuración y alcance](panel-privado.md). Pagos y confirmación comercial siguen pendientes. La limpieza del 30 de octubre separa las rutas del panel en `admin-routes.js` del archivo público `admin-client.js`; las rutas de la API y sus controles de acceso se conservan.

## Resultado

La última verificación pasó 54 pruebas automatizadas, incluida la integración con PostgreSQL, el panel privado y la galería. `npm audit --json` no reportó vulnerabilidades conocidas en las dependencias instaladas, incluidas las de desarrollo. Esto no garantiza ausencia de fallos desconocidos o de problemas de configuración al desplegar.

Las pruebas HTTP usan servidores temporales. Las pruebas PostgreSQL crean y eliminan un esquema separado; no agregan reservas ni huéspedes a la tabla del proyecto. Se volvió a consultar el rol de conexión: mantiene activos los tres permisos elevados detallados abajo. La consulta solo leyó esos atributos; no modificó roles ni credenciales.

## Riesgos pendientes antes de publicar

| Prioridad | Hallazgo | Evidencia e impacto | Próximo cambio |
| --- | --- | --- | --- |
| Alta | La conexión usa un rol de PostgreSQL con privilegios excesivos. | Se verificaron `rolsuper`, `rolcreatedb` y `rolcreaterole` activos. Un fallo futuro de la aplicación tendría un alcance mayor sobre la base. | Crear un rol exclusivo de la app con los permisos mínimos y separar las credenciales de migración. No se modificó la contraseña ni el rol local durante esta revisión. |
| Alta | Una reserva de demostración bloquea noches sin verificación y sin vencimiento. | POST es público y guarda estado `demo`. El límite de intentos reduce abuso por una IP, pero no verifica al solicitante ni evita abuso distribuido. | Diseñar solicitudes pendientes con vencimiento y confirmación privada; considerar verificación de contacto y medidas contra automatización. |
| Media | La gestión comercial de pagos y confirmaciones todavía no existe. | El panel privado ya consulta huéspedes y cancela reservas de prueba con autenticación y sesiones; todavía no procesa pagos ni confirma cobros. | Incorporar estados y vencimientos, revisión de transferencias y verificación del proveedor de pagos. |
| Media | El entorno actual es HTTP local. | El servidor arranca en la interfaz local. No se evaluó un despliegue con HTTPS. | Configurar HTTPS, dominio, proxy de confianza, secretos y permisos del hosting. No exponer este servidor de desarrollo directamente. |

## Defensas agregadas

- Helmet con política de contenido: scripts, estilos y conexiones del propio sitio; el iframe de Google Maps se permite explícitamente. Se quitó el único estilo en línea, cuyo equivalente ya estaba en CSS.
- Bloqueo de la inserción de la página en marcos ajenos, prevención de interpretación incorrecta de tipos de archivo y ocultamiento de la cabecera identificadora de Express.
- Validación de Host y rechazo de escrituras de navegador con un Origin ajeno o contexto cross-site. Esto es una defensa del navegador, no autenticación: un cliente directo puede construir sus propias cabeceras.
- Límite por IP: 120 peticiones a la API por minuto y 10 intentos de creación por 15 minutos. Incluye solicitudes inválidas. Devuelve 429 y un tiempo de espera.
- Las respuestas de API llevan `Cache-Control: no-store`, incluidos errores y límites.
- Errores y recursos inexistentes tienen respuestas genéricas; no se devuelve el detalle interno ni una traza.
- Git ignora `.env` y sus variantes, manteniendo `.env.example` como plantilla pública. Se comprobó que `.env` no está entre los archivos rastreados actualmente. No se revisó todo el historial de Git.

Los contadores son locales a cada proceso y se reinician con Node. Para varios servidores o un proxy de producción habrá que configurar un almacenamiento compartido y verificar la IP real; no se confía automáticamente en cabeceras reenviadas.

## Verificaciones funcionales y de privacidad

- Validación del lado servidor: fechas reales, orden, una noche mínima, ventana móvil de un año y años bisiestos.
- Validación de nombre, correo, teléfono opcional, tipos de datos y longitudes. Cuerpo JSON limitado a 4 KB.
- SQL parametrizado: un nombre con apóstrofo y etiquetas se conserva como dato literal; no cambia la consulta.
- La API pública de reservas devuelve solo entrada y salida. Guardar devuelve identificador, fechas y estado; nunca datos del huésped.
- No se encontró uso de `innerHTML`, evaluación de código o almacenamiento del huésped en localStorage en el script revisado.
- La base rechaza superposiciones aun con dos peticiones simultáneas; permite estadías contiguas. Los datos sobreviven al reinicio de conexiones y servidor.
- Un fallo de almacenamiento devuelve error; no se sustituye por una lista vacía que parezca disponible.
- La migración preserva las reservas anteriores.
- Se probaron archivos privados y rutas de recorrido de directorios sin obtener contenido privado.

## Cómo activar y repetir

Reiniciar Node con Ctrl+C y `npm start`, y recargar la página. El proceso que ya estaba abierto no carga por sí solo los cambios del servidor.

Desde Git Bash:

```bash
npm test
PG_INTEGRATION=1 npm test
npm audit --omit=dev
```

Para un futuro despliegue se requiere `NODE_ENV=production` y `PUBLIC_ORIGIN` con el dominio HTTPS exacto. Esa comprobación por sí sola no resuelve los riesgos de negocio ni configura el hosting.

## Referencias

- [Recomendaciones de seguridad de Express](https://expressjs.com/en/advanced/best-practice-security/)
- [Cabeceras y política de contenido con Helmet](https://helmet.js.org/)
- [Límites de peticiones con express-rate-limit](https://express-rate-limit.mintlify.app/quickstart/usage)
- [Consultas parametrizadas con node-postgres](https://node-postgres.com/features/queries)
