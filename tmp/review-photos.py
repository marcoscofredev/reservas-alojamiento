from PIL import Image, ImageOps, ImageDraw
from pathlib import Path

root = Path(__file__).resolve().parents[1]
photos = sorted((root / 'imagenes').glob('*.jpeg'))
sheet = Image.new('RGB', (1000, ((len(photos) + 3) // 4) * 210), '#f8f9f5')
draw = ImageDraw.Draw(sheet)
for i, photo in enumerate(photos):
    with Image.open(photo) as source:
        print(f'{photo.name}: {source.width}x{source.height}')
        thumb = ImageOps.contain(ImageOps.exif_transpose(source), (240, 175))
        x, y = (i % 4) * 250, (i // 4) * 210
        sheet.paste(thumb, (x, y))
        draw.text((x + 4, y + 180), photo.name, fill='#202e28')
sheet.save(root / 'tmp' / 'review-photos.jpg')
