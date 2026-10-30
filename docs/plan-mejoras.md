# Plan de revisión de El Durazno

Plan iniciado el 29 de octubre de 2026. Estado actualizado el 30 de octubre.

Se retocaron las 14 fotos y se incorporó la galería ampliable y la portada aprobada. El propietario confirmó que ampliar, avanzar y cerrar funcionan. Ver [la entrega de fotos y galería](galeria-retocada.md). También se completó una limpieza focalizada del código y se repitió la revisión de seguridad: [cambios y verificación](limpieza-codigo.md). El menú móvil y las preguntas desplegables siguen pendientes. Los cambios de composición de la galería se postergaron por decisión del propietario.

## Base comprobada

El propietario probó crear y cancelar reservas y comprobar la liberación de noches. La última suite pasó 54 pruebas, con PostgreSQL y acceso privado. La web conserva su identidad clara, verde oscuro y títulos con Georgia.

## 1. Galería y navegación

La galería muestra seis fotos iniciales y permite desplegar las catorce, ampliarlas y recorrerlas con controles y teclado. Tiene textos alternativos, pies y retorno del foco al cerrar; no avanza automáticamente. Las copias web están optimizadas y conservan los originales.

En celular, un botón de menú puede compactar los enlaces manteniendo el menú visible en computadora. Ordenar los enlaces y secciones para que cuenten la misma historia: presentación, alojamiento, fotos, disponibilidad, ubicación, preguntas y contacto.

## 2. Contenido y coherencia visual

Conservar colores y tipografía; ajustar anchos, espaciados y tamaños con la misma escala en todo el sitio. Priorizar un acceso claro a consultar disponibilidad y mostrar capacidad y horarios de forma breve.

Simplificar el texto público que habla del «servidor» o la «base de datos»; conservar una aclaración inequívoca de modo de prueba mientras corresponda. Convertir las preguntas frecuentes en bloques desplegables accesibles para evitar una página tan larga.

No publicar comodidades, tarifas, descuentos o políticas que el propietario no haya confirmado. Las fotos existentes permiten mostrar el interior sin inventar material.

## 3. Código y rendimiento

- Completado: quitar estilos del formulario de Contacto retirado y una regla de alineación redundante.
- Completado: retirar `Availability.addDays`, sin uso en la aplicación; se conserva la cobertura de años bisiestos y cálculo de noches.
- Completado: reutilizar los formateadores de fechas y renombrar el identificador del botón a `guardar-reserva`.
- Completado: separar `admin-routes.js` (servidor) de `admin-client.js` (navegador), con una ruta pública que coincide con el nombre del archivo.
- Completado: optimizar imágenes, declarar dimensiones, cargar fotos inferiores de forma diferida y priorizar la portada.
- Completado: actualizar este plan y el informe de seguridad con las 54 pruebas actuales.

La limpieza conservará las validaciones y la protección contra superposición. No quitar comprobaciones del servidor por parecer repetidas con las del navegador: cumplen funciones distintas.

## 4. Seguridad antes de publicar

Ya existen sesiones con expiración, contraseña con scrypt, protección CSRF, límites de solicitudes y respuestas públicas sin datos del huésped. El panel no necesita una reconstrucción de esas defensas.

Prioridades reales: sustituir el usuario de base con privilegios de administrador por uno limitado; configurar HTTPS y el hosting; definir recuperación de acceso y respaldos; y diseñar vencimiento de solicitudes pendientes para que fechas sin pago no queden bloqueadas indefinidamente.

## 5. Pagos y avisos, después

Mantener el flujo acordado: Mercado Pago integrado con verificación en el servidor y confirmación automática; transferencia pendiente de revisión hasta comprobar el ingreso; interruptor que pause nuevos pagos online; y avisos por correo con acceso al panel. WhatsApp queda como integración posterior.

Faltará concretar tarifas, importe de seña, plazos y qué hacer ante pagos tardíos o devoluciones. No conectar dinero real ni marcar transferencias como pagadas solo por recibir un comprobante.

## Criterios para dar por terminada la mejora visual

Revisar en computadora y celular que no haya desplazamiento horizontal, que se navegue con teclado, que las fotos no se deformen y que la galería recupere el foco al cerrar. Repetir las pruebas del calendario, API y panel después de cambios de código. Mantener los datos de las reservas existentes.

## Referencias consultadas

- [Explora Patagonia National Park](https://www.explora.com/patagonia-national-park-lodge/): combina información de habitaciones, capacidad, servicios y acceso a disponibilidad. Tomamos criterios de organización, no sus prestaciones ni sus textos.
- [Galería de Tierra Patagonia](https://tierrapatagonia.com/gallery/): referencia de fotografía de alojamiento y separación de información de destino, estadía y contacto.
- [Guía W3C para carruseles accesibles](https://www.w3.org/WAI/tutorials/carousels/): controles, teclado y manejo del movimiento.

Siguiente entrega propuesta: menú móvil y preguntas frecuentes más cómodas, manteniendo el estilo actual. Las prioridades de seguridad antes de publicar siguen abiertas; pagos y avisos son una etapa separada.
