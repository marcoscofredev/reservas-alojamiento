# Galería de fotos retocadas

30 de octubre de 2026.

Se prepararon 14 versiones con la herramienta integrada image_gen. Las instrucciones completas de cada edición están guardadas en `output/imagegen/*.prompt.txt`. Los originales JPEG se conservaron. Los retoques completos están en `imagenes/*-retoque-natural*.png`, y la web usa copias JPEG y miniaturas en `imagenes/galeria/`.

La foto del frente usa `frente-1-retoque-natural-v2.png`, aprobada por el propietario: sin gato, recipientes sueltos, bolsa, banquillo, florero y objeto azul junto a la puerta. La cocina usa `cocina-retoque-natural-v2.png`, sin el sobre rojo que pidió retirar de la estantería.

Las demás versiones mantienen muebles, instalaciones y entorno; se hicieron correcciones de luz/color y retiraron los elementos sueltos indicados en sus instrucciones. Revisar las imágenes junto con las originales antes de una publicación comercial: una edición generativa puede introducir pequeñas diferencias de textura o detalle incluso cuando se pide conservar la escena.

## Archivos de la web

| Foto | Archivo |
| --- | --- |
| Frente aprobado | `imagenes/galeria/frente-1.jpg` |
| Dormitorio matrimonial | `imagenes/galeria/matrimonial.jpg` |
| Cocina sin el sobre rojo | `imagenes/galeria/cocina.jpg` |
| Sala de estar | `imagenes/galeria/sala-de-estar.jpg` |
| Segundo dormitorio | `imagenes/galeria/habitacion.jpg` |
| Comedor | `imagenes/galeria/comedor.jpg` |
| Otra vista del frente | `imagenes/galeria/frente-2.jpg` |
| Entrada | `imagenes/galeria/frente-entrada.jpg` |
| Otra vista de cocina | `imagenes/galeria/cocina-2.jpg` |
| Baño | `imagenes/galeria/bano.jpg` |
| Ducha | `imagenes/galeria/ducha.jpg` |
| Lavamanos | `imagenes/galeria/lavamanos.jpg` |
| Andacollo, vista de calles | `imagenes/galeria/pueblo-1.jpg` |
| Monumento de Andacollo | `imagenes/galeria/pueblo-2.jpg` |

## Interacción

La página presenta seis fotos y permite desplegar las 14. Al pulsar una, abre un diálogo nativo con anterior/siguiente, flechas del teclado, Escape para cerrar y retorno del foco al enlace que la abrió. En pantallas táctiles también se puede deslizar horizontalmente sobre la foto. No hay avance automático. Si el navegador no admite el diálogo, el enlace abre la imagen completa.

La portada usa la versión aprobada del frente. No se modificaron los datos de reservas ni los contactos.

## Preparación y pruebas

Sharp se usa únicamente para codificar los PNG ya editados como JPEG y generar miniaturas; no agrega retoques ni recorta las imágenes completas. El script se puede repetir con `npm run images:prepare`. Las versiones completas mantienen sus proporciones, incluida la foto vertical del baño.

Pasaron 54 pruebas con PostgreSQL, incluyendo abrir/cerrar, teclado, gestos, retorno del foco, fallos de carga y las 14 imágenes servidas por HTTP. La suite usa un esquema de base separado de las reservas del proyecto. Falta la revisión visual del propietario en su navegador.

Para cargar la nueva ruta `gallery.js`, reiniciar el servidor con Ctrl+C y `npm.cmd start`, recargar y abrir la sección Galería.
