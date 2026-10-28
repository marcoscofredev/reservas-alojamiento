import sys,json
from pathlib import Path
path=Path(sys.argv[1])
data=path.read_bytes(); position=0; duration=0; count=0; formats=set()
if data[:3]==b'ID3':
    position=10+sum((data[6+j]&127) << (7*(3-j)) for j in range(4))
while position<len(data):
    if data[position:position+3]==b'TAG' and len(data)-position==128:
        position+=128;break
    if position+4>len(data): raise ValueError('Truncated header')
    header=int.from_bytes(data[position:position+4],'big')
    if header & 0xffe00000 != 0xffe00000: raise ValueError(f'Invalid frame at {position}')
    version=(header>>19)&3; layer=(header>>17)&3; bitrateIndex=(header>>12)&15; sampleIndex=(header>>10)&3; padding=(header>>9)&1
    if version==1 or layer!=1 or bitrateIndex in (0,15) or sampleIndex==3: raise ValueError('Unsupported frame')
    bitrate=([0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] if version==3 else [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex]*1000
    sample=[44100,48000,32000][sampleIndex]//(1 if version==3 else 2 if version==2 else 4)
    size=(144 if version==3 else 72)*bitrate//sample+padding
    if position+size>len(data): raise ValueError('Truncated audio frame')
    duration+=(1152 if version==3 else 576)/sample
    position+=size; count+=1; formats.add((sample,bitrate))
print(json.dumps({'file':path.name,'frames':count,'duration_seconds':round(duration,2),'formats':list(formats),'complete':position==len(data)}))
