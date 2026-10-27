from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
PAGE = (432, 720)
import json, re

chapters = [
{
 'title':'01 / El proyecto y su estado',
 'paragraphs':[
 'El Durazno es una web para un alojamiento familiar en Andacollo. La meta es mostrar la cabaña, consultar fechas y, más adelante, gestionar reservas desde un servidor con base de datos. El desarrollo se está usando también para aprender, con especial interés en backend.',
 'Hoy funcionan la página pública, la presentación adaptable, el mapa, las preguntas frecuentes y un calendario que recibe dos reservas ficticias desde Express. Elegir fechas calcula noches y comprueba superposiciones. No crea reservas reales.',
 'La separación clave es: HTML describe la estructura; CSS organiza la apariencia; JavaScript agrega comportamiento. El navegador ejecuta el frontend. Node.js ejecuta el servidor. Una API permite que ambos intercambien datos.',
 'La base de datos, la confirmación de reservas, el panel privado, la autenticación y los pagos todavía están pendientes. El formulario de contacto tampoco envía mensajes. Las condiciones de seña y cancelación aún requieren algunas definiciones familiares.'
 ],
 'remember':'Recibir datos del servidor no equivale a tener una base de datos ni un sistema de reservas completo.',
 'question':'¿Qué puede hacer hoy un visitante y qué partes siguen siendo una demostración?',
 'code':None
},
{
 'title':'02 / HTML: la estructura',
 'paragraphs':[
 'Empezamos con un documento HTML en español. En head están los metadatos, el título de la pestaña, el enlace al CSS y los archivos JavaScript. En body está el contenido que ve la persona. head y header son etiquetas diferentes.',
 'header agrupa la cabecera y el menú. nav identifica la navegación. main contiene el contenido principal. Cada section reúne un tema, como Alojamiento o Ubicación. footer contiene el pie de página.',
 'El h1 es el título principal; los h2 identifican secciones; los h3, preguntas dentro de Preguntas frecuentes. Un h3 tiene menor jerarquía aunque lleve la misma sangría que un h2. La sangría muestra anidamiento; el número del encabezado expresa su jerarquía.',
 'Si abrís una etiqueta dentro de otra, cerrás primero la interior. Un div sirve para agrupar contenido cuando hace falta, como el título y la descripción de Alojamiento. Una clase permite identificar ese grupo para darle estilos.'
 ],
 'remember':'La etiqueta que abriste última se cierra primero. Las etiquetas hermanas se alinean.',
 'question':'¿Por qué el título h2 y una pregunta h3 pueden tener los mismos espacios delante?',
 'code':'<section id="alojamiento">\n    <h2>Alojamiento</h2>\n    <p>Descripción de la cabaña.</p>\n</section>'
},
{
 'title':'03 / Navegar, mostrar y describir',
 'paragraphs':[
 'Un enlace con href numeral alojamiento lleva al elemento cuyo id es alojamiento. El numeral está en el enlace; no forma parte del identificador. Cada id debe ser único en la página.',
 'La imagen usa src para indicar el archivo y alt para describir su contenido. El nombre debe coincidir con exactitud: frente espacio uno, punto jpeg, no frente uno sin espacio ni punto jpg. La extensión y la ruta forman parte del nombre.',
 'alt permite comunicar la información a una persona que usa lector de pantalla y ofrece una alternativa cuando la imagen no carga. Por eso los pictogramas tienen una descripción de baño, ducha, wifi, cinco personas, estacionamiento y parrilla.',
 'El mapa se incorpora mediante iframe. La etiqueta de apertura puede ocupar varias líneas: termina en el signo mayor que después del último atributo. El cierre es otra etiqueta. Su title identifica el mapa para tecnologías de asistencia.',
 'Los textos y servicios se redactaron con información de la familia. No se publican características no confirmadas: por ejemplo, actualmente no hay televisión. El mapa y las fotos ayudan a presentar el alojamiento, pero no calculan disponibilidad.'
 ],
 'remember':'HTML incorpora la imagen; CSS cambia su apariencia. Una regla de CSS no crea por sí sola la foto.',
 'question':'¿Qué revisarías si una foto no aparece, aunque el CSS parezca correcto?',
 'code':'<a href="#alojamiento">Ver alojamiento</a>\n<img src="imagenes/frente 1.jpeg"\n     alt="Frente de la cabaña El Durazno">'
},
{
 'title':'04 / CSS: una composición coherente',
 'paragraphs':[
 'La referencia visual aportó naturaleza, fotos protagonistas y espacio entre bloques. La primera versión se sentía demasiado básica; después adoptamos fondo claro, verde oscuro y títulos tradicionales, con texto sobre fondos lisos.',
 'Una regla CSS tiene un selector y propiedades. El selector puede ser una etiqueta, un id precedido por numeral, o una clase precedida por punto. La clase servicios permite cambiar solo el tamaño de los pictogramas.',
 'margin separa elementos por fuera; padding agrega espacio interior. max-width limita el ancho. height auto mantiene la proporción de una imagen. box-sizing border-box incluye el borde y el relleno dentro del ancho declarado.',
 'Grid permite distribuir contenido en columnas. Para evitar el hueco entre el título de Alojamiento y su descripción, los agrupamos y dejamos los pictogramas en la otra columna. En pantallas pequeñas los bloques se apilan mediante media queries.',
 'La revisión general unificó anchos, encabezados y espacios entre secciones. El calendario usa los mismos colores y tipografías. Quedó pendiente reforzar visualmente la diferencia entre fechas libres, ocupadas y seleccionadas; no hicimos ese cambio en esta etapa.'
 ],
 'remember':'Consistencia significa repetir criterios de alineación, espacio y tipografía, no hacer idénticas todas las secciones.',
 'question':'¿Qué diferencia hay entre el espacio del código y los márgenes que ve el visitante?',
 'code':'.servicios {\n    width: 100%;\n    max-width: 360px;\n    height: auto;\n    margin: 0 auto;\n}'
},
{
 'title':'05 / JavaScript y los elementos',
 'paragraphs':[
 'Conectamos JavaScript en head mediante script con defer. El navegador descarga el archivo mientras procesa el documento y lo ejecuta después de analizar el HTML. El script de la página se conecta una sola vez.',
 'document representa la página y getElementById busca un elemento. Una constante puede guardar la referencia a ese elemento. const impide reasignar la variable, pero no congela el campo ni su contenido. let permite una asignación posterior, como reemplazar una lista vacía por los datos del servidor.',
 'Al principio usamos dos campos de fecha y un formulario. addEventListener escuchaba submit. preventDefault evitaba el envío normal, que recargaba la página. textContent escribía la respuesta. value permitía leer las fechas elegidas.',
 'Esa fue una etapa de aprendizaje. Ahora los campos manuales y el botón de consulta fueron retirados: se elige directamente en el calendario y el resumen aparece automáticamente. La selección se guarda en un objeto con entrada y salida.',
 'Los nombres del código pueden estar en inglés para seguir convenciones habituales. Los mensajes para huéspedes siguen en español. Los nombres son libres; los métodos del lenguaje deben escribirse exactamente.'
 ],
 'remember':'No confundas una referencia al elemento con su valor. Tampoco confundas const con un objeto inmutable.',
 'question':'¿Por qué usamos let para la lista recibida del servidor?',
 'code':'const selection = {\n    checkIn: "",\n    checkOut: ""\n};\n\nlet reservations = [];'
},
{
 'title':'06 / Fechas y noches',
 'paragraphs':[
 'Una estadía necesita fechas completas y una salida posterior a la entrada. Si falta una fecha o el orden es incorrecto, se muestra un mensaje y se detiene esa comprobación. if ejecuta código cuando una condición se cumple; return termina la función.',
 'Los campos iniciales entregaban textos con formato año, mes y día, separados por guiones. Para fechas válidas y completas, ese formato permite comparar el orden como texto. La lógica actual también valida que la fecha exista, para rechazar casos como el treinta de febrero.',
 'El rango se mueve con el día: desde hoy hasta el mismo día del año siguiente. No equivale a sumar siempre trescientos sesenta y cinco días. Si hoy fuera veintinueve de febrero y el año siguiente no fuera bisiesto, el máximo sería veintiocho de febrero.',
 'Para contar noches restamos dos fechas interpretadas en UTC y dividimos por los milisegundos de un día. Esto evita errores por cambios de horario local en esa resta. Los límites de hoy, en cambio, parten de la fecha local del navegador.',
 'Del quince al dieciocho hay tres noches: quince, dieciséis y diecisiete. El dieciocho es la salida. No se suma una noche por el hecho de mencionar cuatro fechas del calendario.'
 ],
 'remember':'La entrada incluye su noche; la salida no la ocupa. Los límites se actualizan al abrir y al volver a usar el calendario.',
 'question':'¿Cuántas noches hay del treinta y uno de diciembre al primero de enero?',
 'code':'const millisecondsPerDay = 24 * 60 * 60 * 1000;\nconst nights =\n    (Date.parse(checkOut) - Date.parse(checkIn))\n    / millisecondsPerDay;'
},
{
 'title':'07 / Evitar superposiciones',
 'paragraphs':[
 'Una reserva del diez al quince ocupa las noches del diez al catorce. Otra del doce al dieciséis comparte noches y debe rechazarse. Una del quince al dieciocho puede empezar cuando termina la anterior.',
 'La condición de conflicto combina dos preguntas: ¿la entrada nueva ocurre antes de la salida existente? ¿La salida nueva ocurre después de la entrada existente? El operador doble ampersand exige que ambas sean verdaderas.',
 'Comparar solo si una estadía queda enteramente dentro de otra era insuficiente: dejaba pasar conflictos parciales o reservas que cubren todo el período. Las desigualdades estrictas permiten el cambio de huésped en una misma fecha.',
 'Primero simulamos una reserva con fechas fijas. Después creamos una lista con varias. Los corchetes contienen la lista; las llaves agrupan los datos de cada reserva. Cada objeto tiene su entrada y su salida.',
 'for of recorre la lista. En cada vuelta, la variable reservation representa un objeto diferente. El if se escribe dentro del recorrido. Los cierres deben quedar dentro de la función que usa las fechas. Ahora esas reglas se reúnen en availability.js y sirven al calendario.'
 ],
 'remember':'Validar datos primero; comprobar conflictos después. Una entrada posterior también puede ser válida: no hace falta llegar exactamente el día de salida anterior.',
 'question':'¿Por qué del ocho al diecisiete también choca con una reserva del diez al quince?',
 'code':'checkIn < reservation.checkOut &&\ncheckOut > reservation.checkIn'
},
{
 'title':'08 / El calendario visual',
 'paragraphs':[
 'El calendario convirtió la selección de fechas en una interacción visible. Muestra el mes y año, días de la semana, noches ocupadas y fechas seleccionadas. Las flechas permiten recorrer los meses dentro del límite permitido.',
 'El primer clic elige entrada. El segundo elige salida si el rango es válido. Una nueva entrada después de completar la selección permite comenzar otra consulta. Borrar fechas limpia la selección y el resumen.',
 'Los días pasados y las entradas imposibles no se pueden elegir. Si una noche está ocupada, normalmente no permite empezar allí. Pero esa misma fecha puede servir de salida si es el comienzo de otra reserva y no se comparte ninguna noche.',
 'Esa distinción es importante: una noche ocupada no siempre prohíbe salir ese día. El calendario y la validación usan la misma regla para no contradecirse. También impiden elegir una salida que salte por encima de noches ocupadas.',
 'Los botones tienen descripciones de fecha y estado para lectores de pantalla, y pueden utilizarse con teclado. El resumen comunica entrada, salida y noches sin exigir volver a escribir fechas. Los datos aún son de demostración.'
 ],
 'remember':'La interfaz ayuda a elegir; las reglas determinan si la estadía es válida. Una futura reserva real requerirá validación del servidor.',
 'question':'¿Puede una persona salir el veinte si ese día comienza una reserva del veinte al veinticinco?',
 'code':None
},
{
 'title':'09 / Git, npm y dependencias',
 'paragraphs':[
 'Git guarda versiones del proyecto mediante commits. Revisar el estado permite saber qué cambió antes de guardarlo. Un aviso sobre LF y CRLF describe dos convenciones de saltos de línea; no significa que el CSS esté roto.',
 'Node.js ejecuta JavaScript fuera del navegador. npm administra paquetes del proyecto. npm init con la opción de aceptar valores iniciales creó package.json. Después instalamos Express, que quedó registrado como dependencia.',
 'package-lock.json guarda las versiones resueltas de las dependencias. node_modules contiene los paquetes descargados. Esa carpeta se puede reconstruir mediante npm; por eso agregamos node_modules barra al archivo .gitignore.',
 'El archivo .gitignore va en la carpeta principal, junto a package.json. No va dentro de node_modules. Es un archivo de texto con ese nombre exacto, sin punto txt. El propio .gitignore y los dos archivos de configuración sí se guardan en Git.',
 'Ignorar un archivo no lo borra ni impide usarlo. Además, si un archivo ya estaba bajo seguimiento, agregarlo después a .gitignore no lo saca automáticamente del historial. Por ahora usamos la exclusión para las dependencias recién instaladas.'
 ],
 'remember':'Servidor y navegador ejecutan JavaScript, pero cumplen tareas diferentes. npm instala herramientas; Git guarda el historial.',
 'question':'¿Qué archivos permiten que otra persona reconstruya las dependencias sin copiar node_modules?',
 'code':'npm init -y\nnpm install express\n\n# En .gitignore:\nnode_modules/'
},
{
 'title':'10 / El primer servidor',
 'paragraphs':[
 'Creamos server.js y cargamos Express con require. express crea la aplicación. app.get registra una dirección y una función que responde cuando llega una petición GET.',
 'req representa la petición y res la respuesta. Al principio la dirección principal enviaba un texto con res.send. Ver ese mensaje en el navegador confirmó que la petición llegó al servidor y volvió una respuesta.',
 'Después agregamos la dirección de API para reservas. res.json devuelve la lista como JSON, un formato de intercambio de datos. Las dos reservas de noviembre viven en memoria dentro del código del servidor. Todavía no están en una base de datos.',
 'La dirección principal ahora entrega el HTML mediante sendFile. Otras rutas sirven CSS y JavaScript, y una carpeta específica entrega las imágenes. dirname identifica la carpeta del servidor. No se publica indiscriminadamente toda la carpeta del proyecto.',
 'app.listen inicia el proceso en el puerto tres mil de esta computadora. Para detenerlo se usa Control C en la terminal. Al cambiar server.js hay que reiniciar Node con la configuración actual. El archivo del servidor no se agrega al HTML.'
 ],
 'remember':'Una ruta relaciona una petición con una respuesta. El mensaje inicial y la lista de reservas son dos respuestas distintas.',
 'question':'¿Por qué el archivo del servidor se ejecuta con Node y no con una etiqueta script en la página?',
 'code':'app.get("/api/reservas", function (req, res) {\n    const reservations = [\n        { checkIn: "2026-11-10",\n          checkOut: "2026-11-15" }\n    ];\n    res.json(reservations);\n});'
},
{
 'title':'11 / De la API al calendario',
 'paragraphs':[
 'La web se abre desde el puerto tres mil, servido por Express. Su JavaScript hace una petición fetch a la dirección de reservas. Al usar una dirección relativa, consulta el mismo servidor que entregó la página.',
 'Una función async puede usar await para esperar operaciones dentro de esa función. No bloquea toda la página. Primero llega la respuesta HTTP; después response.json interpreta su contenido. response.ok indica si el código de estado representa éxito.',
 'La primera prueba mostraba los datos en la consola. Luego reemplazamos la lista local por una variable vacía y asignamos los datos recibidos. Hoy la lista ficticia está solo en el servidor; el calendario consume su respuesta.',
 'Mientras carga, el calendario permanece oculto. Solo se dibuja y muestra después de validar que llegó una lista con fechas válidas y orden correcto. Si la petición o los datos fallan, aparece un mensaje de error. No se muestra una lista vacía como si todas las noches estuvieran libres.',
 'También corregimos el evento que se ejecuta al mostrar la página: no debe borrar un mensaje de carga o de error. Las pruebas verifican que una reserva diferente enviada por el servidor modifica el calendario. Eso demuestra que ya no usa la copia anterior.'
 ],
 'remember':'Una respuesta vacía válida no es lo mismo que un fallo de red. En el fallo, no debemos afirmar disponibilidad.',
 'question':'¿Qué hace la asignación reservations igual data, y por qué la variable usa let?',
 'code':'const response = await fetch("/api/reservas");\nif (!response.ok) {\n    throw new Error("Falló la consulta");\n}\nconst data = await response.json();\n// Validar la forma y las fechas antes de usarla.\nreservations = data;\nrenderCalendar();'
},
{
 'title':'12 / Repasar y seguir',
 'paragraphs':[
 'El recorrido actual es: el navegador pide la página a Express, carga sus archivos, solicita las reservas a la API y dibuja el calendario con la respuesta. La persona elige fechas; la página comprueba el rango y muestra las noches. No se envía una solicitud para crear una reserva.',
 'Pasaron dieciséis pruebas automáticas de reglas y selección. Cubren superposiciones, límites, años bisiestos, cambios de mes y fallos de carga simulados. Son evidencia sobre esos casos, no una garantía de que todo un sistema de producción esté terminado.',
 'Para estudiar, explicá sin mirar la diferencia entre HTML, CSS y JavaScript. Después narrá cómo viaja una petición y cómo vuelve la respuesta. Por último, resolvé un ejemplo de superposición antes de mirar la fórmula.',
 'Lo próximo del backend será trasladar las comprobaciones decisivas al servidor y luego guardar datos. Para evitar una doble reserva real, la base de datos y el servidor deberán resolver también los intentos simultáneos. Comprobar solo en el navegador no alcanza.',
 'Quedan para etapas posteriores la creación y confirmación de reservas, PostgreSQL, el panel del dueño, permisos de acceso, cancelaciones completas y pagos. La mejora del contraste visual queda pendiente por pedido del usuario. El calendario actual es una base para seguir aprendiendo.'
 ],
 'remember':'Antes de dar algo por terminado, preguntá: ¿qué comprobé, con qué datos y qué todavía falta?',
 'question':'¿Por qué dos personas podrían ver una fecha libre al mismo tiempo aunque el calendario funcione correctamente?',
 'code':'# Iniciar el servidor:\nnode server.js\n\n# Ejecutar las pruebas actuales:\nnode --test tests/availability.test.cjs tests/calendar.test.cjs'
}
]

root=Path.cwd(); out=root/'output/pdf/El-Durazno-guia-completa-del-proyecto.pdf'
styles={
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=21,leading=25,textColor=colors.HexColor('#244d3c'),spaceAfter=15),
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10.5,leading=14.3,spaceAfter=9),
 'small':ParagraphStyle('small',fontName='Helvetica',fontSize=9,leading=12,textColor=colors.HexColor('#526159'),spaceAfter=10),
 'head':ParagraphStyle('head',fontName='Helvetica-Bold',fontSize=11,leading=14,textColor=colors.HexColor('#244d3c'),spaceBefore=7,spaceAfter=6),
 'code':ParagraphStyle('code',fontName='Courier-Bold',fontSize=7.7,leading=10.2,textColor=colors.HexColor('#202e28'),spaceAfter=10)
}
from xml.sax.saxutils import escape
story=[]
def para(t,style='body'): story.append(Paragraph(t,styles[style]))
para('El Durazno<br/>Del HTML al primer backend','title')
para('GUÍA DE ESTUDIO · ACTUALIZADA AL 27 DE OCTUBRE DE 2026','small')
para('Un repaso del proyecto real, organizado para leer en el teléfono y acompañar el audio. Incluye qué hicimos, por qué, ejemplos de código y preguntas para comprobar lo aprendido.')
para('Qué está funcionando','head')
para('Página adaptable, mapa, servicios y preguntas frecuentes. Calendario con selección de fechas, reglas de noches y reservas de prueba obtenidas desde el servidor Express.')
para('Qué sigue pendiente','head')
para('Base de datos, creación y confirmación de reservas reales, validación decisiva en el servidor, control de concurrencia, panel privado y pagos. El formulario de contacto aún no envía mensajes.')
para('Cómo usar esta guía','head')
para('Leé un tema por vez. Antes de mirar el código, explicá qué problema resuelve. Contestá la pregunta al final de cada tema y después probá un caso en tu proyecto.')
para('Contenido','head')
for chapter in chapters: para(chapter['title'],'small')
for chapter in chapters:
 story.append(PageBreak()); para(chapter['title'],'title')
 for text in chapter['paragraphs']: para(escape(text))
 if chapter['code']:
  story.append(Spacer(1,4)); story.append(Preformatted(chapter['code'],styles['code']))
 para('Para recordar','head'); para(escape(chapter['remember']))
 para('Comprobá que lo entendiste','head'); para(escape(chapter['question']))

def foot(canvas,doc):
 canvas.setStrokeColor(colors.HexColor('#dce3da'));canvas.line(26,28,PAGE[0]-26,28)
 canvas.setFont('Helvetica',7.5);canvas.setFillColor(colors.HexColor('#526159'))
 canvas.drawString(26,16,'EL DURAZNO / Guía de estudio');canvas.drawRightString(PAGE[0]-26,16,str(doc.page))
SimpleDocTemplate(str(out),pagesize=PAGE,rightMargin=26,leftMargin=26,topMargin=26,bottomMargin=40).build(story,onFirstPage=foot,onLaterPages=foot)

# El audio explica los conceptos en voz alta; no recita símbolos ni rutas largas.
intro='El Durazno. Del primer HTML al calendario conectado con un servidor. Este es un repaso educativo narrado con una voz sintética en español. Está basado en el proyecto hasta el veintisiete de octubre de dos mil veintiséis. Podés escucharlo por partes. No necesitás mirar código: vamos a recorrer la idea, el propósito de cada paso y lo que todavía falta construir.'
parts=[intro]
for chapter in chapters:
 spoken=chapter['title'].split(' / ',1)[1]+'.\n\n'+'\n\n'.join(chapter['paragraphs'])+'\n\nPara recordar. '+chapter['remember']+'\n\nUna pregunta para vos. '+chapter['question']+'\n\nPodés pausar unos segundos y responder antes de seguir.'
 parts.append(spoken)
parts.append('Llegaste al final del repaso. La idea más importante es el recorrido: una página presenta, JavaScript interactúa, el servidor responde con datos y, más adelante, la base de datos guardará reservas. El siguiente objetivo es que las decisiones de disponibilidad y la creación de reservas queden protegidas en el servidor. Guardá la guía y volvé a los ejemplos que te resulten más difíciles. Fin del episodio.')
text='\n\n'.join(parts)
# Pronunciación más natural de nombres técnicos para la voz instalada.
replacements={'HTML':'hache te eme ele','CSS':'ce ese ese','JavaScript':'Yava script','Node.js':'Noud','Express':'Exprés','PostgreSQL':'Post gres','JSON':'yeison','API':'a pe i','UTC':'u te ce','npm':'ene pe eme','Git':'guit','frontend':'front end','backend':'back end','wifi':'uai fai','iframe':'ai freim','script.js':'script punto ye ese','server.js':'server punto ye ese','availability.js':'availability punto ye ese','package-lock.json':'package lock punto yeison','package.json':'package punto yeison','node_modules':'node modules','.gitignore':'punto guit ignore','getElementById':'get element bai ai di','textContent':'text content','addEventListener':'add event listener','preventDefault':'prevent default','checkIn':'check in','checkOut':'check out','for of':'for of','max-width':'max width','box-sizing':'box sizing','media queries':'media cueris','response.json':'response punto yeison','response.ok':'response punto o kei','app.get':'app punto get','app.listen':'app punto lisen','res.send':'res punto send','res.json':'res punto yeison','Control C':'control ce','LF':'ele efe','CRLF':'ce erre ele efe'}
for old,new in replacements.items(): text=text.replace(old,new)
(root/'output/audio/El-Durazno-repaso-completo.txt').write_text(text,encoding='utf-8-sig')
(root/'tmp/podcast/chapters.json').write_text(json.dumps(parts,ensure_ascii=False),encoding='utf-8')
from pypdf import PdfReader
reader=PdfReader(str(out))
print('PDF:',len(reader.pages),'páginas')
print('Audio:',len(text.split()),'palabras')
for i,page in enumerate(reader.pages): print(i+1,len(page.extract_text()),page.extract_text()[:55].replace('\n',' '))
