import asyncio, sys, json
from pathlib import Path
sys.path.insert(0,str(Path('tmp/podcast/tts_runtime').resolve()))
import edge_tts

async def main():
    parts=json.loads(Path('tmp/podcast/chapters.json').read_text(encoding='utf-8'))
    semaphore=asyncio.Semaphore(3)
    durations={}
    async def chapter(i,text):
        async with semaphore:
            file=Path(f'tmp/podcast/voz-natural-capitulo-{i:02}.mp3')
            last_end=0
            speaker=edge_tts.Communicate(text,voice='es-AR-ElenaNeural',rate='-5%')
            with file.open('wb') as audio:
                async for item in speaker.stream():
                    if item['type']=='audio': audio.write(item['data'])
                    elif item['type'] in ('WordBoundary','SentenceBoundary'):
                        last_end=max(last_end,item.get('offset',0)+item.get('duration',0))
            if file.stat().st_size < 1000: raise RuntimeError('Capítulo vacío')
            durations[i]=last_end/10000000
            print(f'Capítulo {i+1}/{len(parts)} generado',flush=True)
    await asyncio.gather(*(chapter(i,text) for i,text in enumerate(parts)))
    destination=Path('output/audio/El-Durazno-repaso-voz-natural.mp3')
    with destination.open('wb') as joined:
        for i in range(len(parts)):
            data=Path(f'tmp/podcast/voz-natural-capitulo-{i:02}.mp3').read_bytes()
            if data[:3]==b'ID3':
                size=sum((data[6+j]&127) << (7*(3-j)) for j in range(4))
                data=data[10+size:]
            joined.write(data)
    info={'voice':'es-AR-ElenaNeural','bytes':destination.stat().st_size,'duration_seconds':round(sum(durations.values()),1),'chapters':len(parts)}
    Path('tmp/podcast/voz-natural-metadata.json').write_text(json.dumps(info),encoding='utf-8')
    print(json.dumps(info),flush=True)
try:
    asyncio.run(asyncio.wait_for(main(),timeout=300))
except Exception as error:
    print('No se pudo completar:',type(error).__name__,flush=True)
    raise SystemExit(1)
