"""The background's textures, from the cave water idle in 'blender stuff' (folders/cave_water_idle, its .blend in
IDLE/cave_water_idle.blend): the cave picture as it is, and the water's layers cut to the pool (AREA, with a margin
for the ripples' shifts) for CaveWater.svelte, which moves the water as the .blend's materials do.

  static/assets/background.webp             the picture (source/cave.webp, copied as it is)
  static/assets/background-water.webp       the clean water the ripples shift (layers/water_fill.png), lossless
  static/assets/background-water-mask.png   red = where the water is (water_mask), green = how much it moves (water_amp)

Run with Blender's Python (numpy + OpenImageIO):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/cave-water.py
Rerun it when segment.py has been run again; check AREA in CaveWater.svelte against what it prints.
"""
import json, os, shutil
import numpy as np
import OpenImageIO as oiio

SRC = r"C:\Users\Rontt\Downloads\blender stuff\folders\cave_water_idle"
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(APP, "static", "assets")
MARGIN = 24  # px round the pool: more than the ripples ever shift it (~10 px)


def read(path):
    inp = oiio.ImageInput.open(path)
    a = np.asarray(inp.read_image(format=oiio.UINT8))
    inp.close()
    return a


def write(path, a, **attrs):
    spec = oiio.ImageSpec(a.shape[1], a.shape[0], a.shape[2], oiio.UINT8)
    for k, v in attrs.items():
        spec.attribute(k, v)
    out = oiio.ImageOutput.create(path)
    out.open(path, spec)
    out.write_image(np.ascontiguousarray(a))
    out.close()


layout = json.load(open(os.path.join(SRC, "layers", "layout.json")))
W, H = layout["size"]
x0, y0, x1, y1 = layout["water_bbox"]
x0, y0 = max(x0 - MARGIN, 0), max(y0 - MARGIN, 0)
x1, y1 = min(x1 + 1 + MARGIN, W), min(y1 + 1 + MARGIN, H)

shutil.copyfile(os.path.join(SRC, "source", "cave.webp"), os.path.join(OUT, "background.webp"))

fill = read(os.path.join(SRC, "layers", "water_fill.png"))[y0:y1, x0:x1, :3]
write(os.path.join(OUT, "background-water.webp"), fill, compression="lossless")

mask = read(os.path.join(SRC, "layers", "water_mask.png"))[y0:y1, x0:x1, 0]
amp = read(os.path.join(SRC, "layers", "water_amp.png"))[y0:y1, x0:x1, 0]
assert mask[0].max() == 0 and mask[-1].max() == 0 and mask[:, 0].max() == 0, "the pool reaches the cut's edge"
write(os.path.join(OUT, "background-water-mask.png"), np.dstack([mask, amp, np.zeros_like(mask)]))

# check the lossless webp reads back exactly
back = read(os.path.join(OUT, "background-water.webp"))[..., :3]
print("webp exact:", bool((back == fill).all()))
print("PICTURE", W, H, "AREA x %d y %d width %d height %d" % (x0, y0, x1 - x0, y1 - y0))
for f in ("background.webp", "background-water.webp", "background-water-mask.png"):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, "KB")
