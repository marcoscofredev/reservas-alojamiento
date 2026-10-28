import asyncio, sys
from pathlib import Path
sys.path.insert(0,str(Path('tmp/podcast/tts_runtime').resolve()))
import edge_tts
async def main():
    voices=await edge_tts.list_voices()
    matches=[v for v in voices if v['ShortName']=='es-AR-ElenaNeural']
    if not matches: raise RuntimeError('No se encontró la voz seleccionada.')
    print('Voz disponible:',matches[0]['ShortName'])
    text='Vamos a repasar El Durazno, tranquilos y paso a paso. Pensá en el recorrido que hace una persona: abre la página, mira la cabaña y elige las fechas. Detrás de esa acción hay varias partes trabajando juntas. El HTML organiza el contenido. El CSS le da el aspecto visual. Y JavaScript permite interactuar con el calendario. Ahora sumamos un servidor: la página le pregunta qué fechas están ocupadas y recibe una respuesta. No hace falta memorizar todo de una vez. Lo importante es entender qué responsabilidad tiene cada parte.'
    await edge_tts.Communicate(text,voice='es-AR-ElenaNeural',rate='-5%').save('output/audio/El-Durazno-muestra-voz-natural.mp3')
    print('Muestra generada:',Path('output/audio/El-Durazno-muestra-voz-natural.mp3').stat().st_size)
asyncio.run(main())
