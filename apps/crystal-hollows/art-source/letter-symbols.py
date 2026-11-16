"""The low symbols' stills: the user's stone letters (art-source/letters/<letter>-source.png, 1254 x 1254, transparent
round them), cut into one picture each for the reels:

  static/assets/symbols/a.webp, k.webp, q.webp, j.webp   SIZE x SIZE, each letter in the middle

The alpha clean-up, the common scale, the square each shows and the still itself are in symbols_common.py (the lands
and idles, letters-spine.py, line up with them).

Run with Blender's Python (numpy + OpenImageIO), from apps/crystal-hollows:
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/letter-symbols.py
"""
import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_common import APP, LETTERS, SIZE, squares, still, still_square, write

OUT = os.path.join(APP, "static", "assets", "symbols")

letters, side = squares()
os.makedirs(OUT, exist_ok=True)
for letter in LETTERS:
    source, middle = letters[letter]
    out = still(source, middle, side)
    path = os.path.join(OUT, "%s.webp" % letter)
    write(path, out)
    left, top, span = still_square(middle, side)
    ys, xs = np.where(out[..., 3] > 0)
    print("%s: square x%d y%d %dpx in the source -> %s %dx%d, letter %d-%d x %d-%d, %d KB" % (
        letter, left, top, span, os.path.basename(path), SIZE, SIZE, xs.min(), xs.max(), ys.min(), ys.max(),
        os.path.getsize(path) // 1024))
