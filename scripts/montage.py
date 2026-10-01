import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
W = 240; H = 240 + 18
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * H), 'white')
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(os.path.join(d, f)).convert('RGB'); im.thumbnail((W - 8, 236))
    x, y = (i % cols) * W, (i // cols) * H
    sheet.paste(im, (x + 4, y + 2)); dr.text((x + 4, y + 240), f[:38], fill='black')
sheet.save(out); print(out, sheet.size)
