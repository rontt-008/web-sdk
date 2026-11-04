"""Makes the multiplier badge's frame (static/assets/multiplier-frame.webp) from the user's astrology circle
(art-source/Make_circle_astrology_frame_2a846dbd_2K.jpg, gold line art on white): the white taken off into
transparency, the gold kept at its true colour, the same size, as a WebP with alpha.

Run from the math-sdk folder (its Python has Pillow):
    .\\env\\Scripts\\python.exe ..\\web-sdk\\apps\\my-chess-game\\art-source\\multiplier-frame.py
"""

import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "Make_circle_astrology_frame_2a846dbd_2K.jpg")
OUT = os.path.join(HERE, "..", "static", "assets", "multiplier-frame.webp")

image = np.asarray(Image.open(SOURCE).convert("RGB")).astype(np.float32) / 255
# how much ink is on each pixel: white none, the darkest gold all of it
darkness = 1 - image.mean(axis=2)
alpha = np.clip(darkness / darkness.max(), 0, 1)
# the ink's own colour, with the white it was blended over taken out (c = a * ink + (1 - a) * 1)
safe = np.maximum(alpha, 1e-3)[..., None]
ink = np.clip((image - (1 - safe)) / safe, 0, 1)
# faint pixels (jpeg noise on the white) go altogether
alpha[alpha < 0.06] = 0
rgba = np.dstack([ink, alpha])
Image.fromarray((rgba * 255).round().astype(np.uint8), "RGBA").save(OUT, "WEBP", quality=88, method=6)
print(f"wrote {os.path.relpath(OUT, HERE)}: {os.path.getsize(OUT) / 1e3:.0f} kB, {rgba.shape[1]}x{rgba.shape[0]}")
