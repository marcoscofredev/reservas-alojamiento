from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A5
from xml.sax.saxutils import escape
from pathlib import Path
out=Path('output/pdf/El-Durazno-repaso-JavaScript-disponibilidad.pdf')
s=getSampleStyleSheet()
s.add(ParagraphStyle(name='TitleED',fontName='Helvetica-Bold',fontSize=23,leading=26,textColor=colors.HexColor('#244d3c'),spaceAfter=16))
s.add(ParagraphStyle(name='HeadED',fontName='Helvetica-Bold',fontSize=15,leading=19,textColor=colors.HexColor('#244d3c'),spaceBefore=9,spaceAfter=7))
s.add(ParagraphStyle(name='BodyED',fontName='Helvetica',fontSize=11,leading=14.5,spaceAfter=7))
s.add(ParagraphStyle(name='CodeED',fontName='Courier',fontSize=8,leading=11,backColor=colors.HexColor('#edf2ed'),borderPadding=9,spaceBefore=8,spaceAfter=12))
story=[]
def p(t): story.append(Paragraph(t,s['BodyED']))
def h(t): story.append(Paragraph(t,s['HeadED']))
def code(t): story.append(Preformatted(t,s['CodeED']))
def page(t):
 if story: story.append(PageBreak())
 story.append(Paragraph(t,s['TitleED']))
page('01 / Qué construimos')
p('EL DURAZNO · GUÍA DE REPASO · 22 OCT 2026')
p('Una consulta de fechas de prueba. Esta guía resume la sesión de JavaScript y deja el código ordenado para estudiar desde el teléfono.')
h('El recorrido')
for t in ['1. HTML: agregamos entrada, salida, botón y un espacio para el mensaje.','2. Conectamos script.js con el HTML usando defer.','3. Buscamos los elementos y guardamos sus referencias en constantes.','4. Escuchamos el envío del formulario sin recargar la página.','5. Validamos el orden de las fechas y calculamos las noches.']: p(t)
h('Lo que todavía no hace')
p('No consulta una base de datos, no compara reservas ocupadas, no bloquea fechas ni confirma reservas. El mensaje muestra la duración, no disponibilidad real.')
h('Tres responsabilidades')
p('<b>HTML:</b> estructura y campos. <b>CSS:</b> apariencia y distribución. <b>JavaScript:</b> comportamiento. Más adelante, el servidor volverá a validar la disponibilidad.')
page('02 / Conectar la página')
h('Los identificadores deben coincidir')
code('''<form id="form-disponibilidad">
  <label for="entrada">Entrada</label>
  <input type="date" id="entrada"
         name="entrada" required>
  <label for="salida">Salida</label>
  <input type="date" id="salida"
         name="salida" required>
  <button type="submit">Consultar</button>
</form>
<p id="resultado-disponibilidad"
   role="status"></p>''')
p('<b>type="date"</b> abre el selector de fechas del navegador. <b>required</b> exige completar el campo. <b>label for</b> enlaza la etiqueta con el id del campo.')
p('El párrafo empieza vacío: JavaScript escribirá allí. role="status" permite anunciar sus cambios mediante tecnologías de asistencia.')
h('En head, una sola vez')
code('<script src="script.js" defer></script>')
p('<b>src</b> indica el archivo. <b>defer</b> permite descargarlo mientras se procesa el HTML y ejecutarlo después del análisis de la página. head y header son elementos distintos.')
page('03 / Identificar y escuchar')
p('Al principio de script.js:')
code('''const entrada =
  document.getElementById("entrada");
const salida =
  document.getElementById("salida");
const formulario = document.getElementById(
  "form-disponibilidad");
const resultado = document.getElementById(
  "resultado-disponibilidad");''')
p('<b>document</b> representa la página. <b>getElementById</b> busca un elemento por su identificador exacto. Si no lo encuentra, devuelve null.')
p('<b>const</b> impide reasignar esa variable. No congela el elemento: la persona puede elegir otra fecha y el programa puede cambiar sus propiedades.')
h('Una primera prueba')
code('''formulario.addEventListener(
  "submit", function (event) {
    event.preventDefault();
    resultado.textContent =
      "Buscando disponibilidad...";
  }
);''')
p('<b>submit:</b> envío del formulario. <b>preventDefault():</b> evita la navegación normal del envío. <b>textContent:</b> escribe texto en el resultado. El mensaje de prueba no inicia una búsqueda real.')
p('La referencia a toda la sección disponibilidad no se necesita en este paso. Los nombres propios pueden estar en inglés; los textos para huéspedes siguen en español.')
page('04 / Leer y validar')
p('Este es el comienzo del bloque final. Reemplaza el listener de prueba; no se agrega un segundo listener.')
code('''formulario.addEventListener(
  "submit", function (event) {
    event.preventDefault();

    const checkIn = entrada.value;
    const checkOut = salida.value;

    if (!checkIn || !checkOut) {
      resultado.textContent =
        "Elegí las fechas de entrada y salida.";
      return;
    }

    if (checkOut <= checkIn) {
      resultado.textContent =
        "La salida debe ser posterior " +
        "a la entrada.";
      return;
    }

    // Continúa en la página siguiente.''')
p('<b>.value</b> lee el valor actual. Se lee dentro de la función para obtener las fechas de cada consulta, no solo las que existían al cargar la página.')
p('<b>!</b> significa negación; <b>||</b>, "o". Si falta cualquiera de las fechas, mostramos el mensaje. El navegador suele impedir antes el envío de campos vacíos por required.')
p('<b>if</b> ejecuta un bloque si se cumple una condición. <b>return</b> termina la función para no seguir calculando después de un error.')
page('05 / Calcular las noches')
p('Continuación dentro de la misma función:')
code('''    const millisecondsPerDay =
      24 * 60 * 60 * 1000;
    const nights =
      (Date.parse(checkOut) -
       Date.parse(checkIn)) /
      millisecondsPerDay;

    resultado.textContent =
      `Tu estadía es de ${nights} ` +
      `${nights === 1 ? "noche" : "noches"}. ` +
      "Todavía no comprobamos disponibilidad.";
  }
);''')
h('Por qué funciona')
p('Los campos entregan fechas válidas en formato AAAA-MM-DD. Ese formato permite comparar su orden como texto cuando ambas fechas están completas.')
p('<b>Date.parse</b> convierte esas cadenas de fecha en milisegundos. Para este formato de solo fecha, ambas se interpretan en UTC. Restarlas así evita que un cambio de horario local altere la cuenta de noches.')
p('Un día tiene 24 × 60 × 60 × 1000 milisegundos. Dividir la diferencia por ese número da la cantidad de noches.')
p('Las comillas invertidas permiten insertar valores con <b>${...}</b>. La expresión <b>condición ? opción1 : opción2</b> elige "noche" si el valor es 1 y "noches" en los demás casos.')
h('Entrada incluida, salida libre')
p('Del 22 al 27 son cinco noches: 22, 23, 24, 25 y 26. La salida del 27 permite una nueva entrada ese día.')
page('06 / Probar y continuar')
h('Pruebas rápidas')
for t in ['Mismo día de entrada y salida: debe mostrar error.','Salida anterior a la entrada: debe mostrar error.','Del 22 al 27 del mismo mes y año: debe mostrar cinco noches.','Del 22 al 23: debe mostrar una noche.','Cambiar las fechas y volver a consultar: debe actualizar el resultado sin recargar.']: p('• '+t)
h('Si la página se recarga')
p('Revisá que script.js esté guardado y conectado una sola vez; que los id coincidan; y que todas las llaves y los paréntesis estén cerrados. Un error de sintaxis puede impedir que se registre el listener.')
p('En la sesión faltaba cerrar el listener. Corregimos ese cierre sin agregar otro listener debajo.')
h('Próximos pasos acordados')
for t in ['Limitar las fechas desde hoy hasta doce meses adelante, calculados al abrir la página. Todavía no está implementado.','Simular estadías ocupadas y detectar superposiciones.','Mejorar la presentación del calendario.','Conectar un servidor y una base de datos. El servidor será la autoridad para confirmar disponibilidad.']: p('• '+t)
h('Para comprobar que lo entendiste')
p('¿Qué diferencia hay entre el campo entrada y entrada.value? ¿Por qué usamos preventDefault? ¿Qué detiene return? ¿Calcular cinco noches significa que esas noches están libres?')
def footer(c,d):
 c.setStrokeColor(colors.HexColor('#dce3da')); c.line(28,28,A5[0]-28,28)
 c.setFont('Helvetica',8); c.setFillColor(colors.HexColor('#526159')); c.drawString(28,16,'EL DURAZNO / JavaScript paso a paso'); c.drawRightString(A5[0]-28,16,str(d.page))
SimpleDocTemplate(str(out),pagesize=A5,rightMargin=28,leftMargin=28,topMargin=25,bottomMargin=36).build(story,onFirstPage=footer,onLaterPages=footer)
from pypdf import PdfReader
r=PdfReader(str(out)); print(str(out.resolve())); print('Pages:',len(r.pages))
