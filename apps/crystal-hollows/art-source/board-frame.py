"""The board's stone frame (the user's picture, art-source/board-frame-source.png: a blue stone frame round a dark blue
panel, transparent outside), cut to what is drawn and saved for BoardFrame.svelte:

  static/assets/board-frame.webp   the frame and its panel, cropped to the opaque part

It prints the panel's rectangle inside the cut (INNER in BoardFrame.svelte): the inside edge of the panel's dark
outline, found by scanning out from the middle along many rows and columns (the median, so the panel's streaks
don't count).

Run with Blender's Python (numpy + OpenImageIO):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/board-frame.py
"""
import os
import numpy as np
import OpenImageIO as oiio

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, "art-source", "board-frame-source.png")
OUT = os.path.join(APP, "static", "assets", "board-frame.webp")
PAD = 2  # px of transparency kept round the cut, so the edge pixels filter cleanly
SPECK = 4  # alpha this low or lower is the cut-out's leftover haze round the frame (all over the picture): cleared


def read(path):
    # straight (unassociated) alpha, as it is stored, so nothing is premultiplied and back
    config = oiio.ImageSpec()
    config.attribute("oiio:UnassociatedAlpha", 1)
    inp = oiio.ImageInput.open(path, config)
    a = np.asarray(inp.read_image(format=oiio.UINT8))
    inp.close()
    return a


img = read(SRC)
img[img[..., 3] <= SPECK] = 0
alpha = img[..., 3]
ys, xs = np.where(alpha > 0)
x0, y0 = max(xs.min() - PAD, 0), max(ys.min() - PAD, 0)
x1, y1 = min(xs.max() + 1 + PAD, img.shape[1]), min(ys.max() + 1 + PAD, img.shape[0])
cut = np.ascontiguousarray(img[y0:y1, x0:x1])

spec = oiio.ImageSpec(cut.shape[1], cut.shape[0], 4, oiio.UINT8)
spec.attribute("oiio:UnassociatedAlpha", 1)
spec.attribute("compression", "webp:92")
out = oiio.ImageOutput.create(OUT)
out.open(OUT, spec)
out.write_image(cut)
out.close()

# the panel: from the middle outwards to the first dark pixel of its outline
lum = cut[..., 0] * 0.3 + cut[..., 1] * 0.5 + cut[..., 2] * 0.2
H, W = lum.shape
cx, cy = W // 2, H // 2


def first_dark(line, start, step):
    i = start
    while 0 <= i < len(line) and line[i] >= 35:
        i += step
    return i


rows = range(int(H * 0.25), int(H * 0.75), 5)
cols = range(int(W * 0.2), int(W * 0.8), 5)
left = int(np.median([first_dark(lum[y], cx, -1) for y in rows])) + 1
right = int(np.median([first_dark(lum[y], cx, 1) for y in rows]))
top = int(np.median([first_dark(lum[:, x], cy, -1) for x in cols])) + 1
bottom = int(np.median([first_dark(lum[:, x], cy, 1) for x in cols]))

back = read(OUT)
diff = np.abs(back.astype(int) - cut.astype(int))
print("size", W, H, "(cut x %d y %d from %dx%d)" % (x0, y0, img.shape[1], img.shape[0]))
print("INNER x %d y %d width %d height %d" % (left, top, right - left, bottom - top))
print("alpha exact:", bool((diff[..., 3] == 0).all()), " mean rgb diff (opaque): %.2f" % diff[..., :3][back[..., 3] == 255].mean())
print("board-frame.webp: %d KB" % (os.path.getsize(OUT) // 1024))
