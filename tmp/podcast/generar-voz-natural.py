import asyncio, sys, json
from pathlib import Path
sys.path.insert(0,str(Path('tmp/podcast/tts_runtime').resolve()))
import edge_tts

async def main():
    text=Path('output/audio/El-Durazno-repaso-completo.txt').read_text(encoding='utf-8-sig')
    destination=Path('output/audio/El-Durazno-repaso-voz-natural.mp3')
    partial=Path('tmp/podcast/repaso-natural-parcial.mp3')
    speaker=edge_tts.Communicate(text,voice='es-AR-ElenaNeural',rate='-5%')
    last_end=0
    count=0
    with partial.open('wb') as audio:
        async for chunk in speaker.stream():
            if chunk['type']=='audio':
                audio.write(chunk['data'])
                count+=1
            elif chunk['type'] in ('WordBoundary','SentenceBoundary'):
                last_end=max(last_end,chunk.get('offset',0)+chunk.get('duration',0))
    if partial.stat().st_size < 100000: raise RuntimeError('Audio incompleto')
    partial.replace(destination)
    info={'voice':'es-AR-ElenaNeural','bytes':destination.stat().st_size,'duration_seconds':round(last_end/10000000,1),'audio_chunks':count}
    Path('tmp/podcast/voz-natural-metadata.json').write_text(json.dumps(info),encoding='utf-8')
    print(json.dumps(info))

try:
    asyncio.run(asyncio.wait_for(main(),timeout=240))
except Exception as error:
    print('No se pudo completar la narración:',type(error).__name__)
    raise SystemExit(1)
