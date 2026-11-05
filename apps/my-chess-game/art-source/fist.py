"""Makes the fist that slams the table as a bonus starts (static/assets/fist.webp) from the user's drawing
(art-source/fist.png, 1774 x 887, a fist and forearm in a white sleeve on transparency, the sleeve cut off
along the bottom edge): scaled by SCALE, the whole picture kept so the points the game uses
(FistSlam.svelte: the middle of the sleeve's cut, where the arm pivots, and the middle of the fist) are
the same fractions of it.

Run with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\fist.py
"""

import os

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "fist.png")
OUT = os.path.join(HERE, "..", "static", "assets", "fist.webp")
# the fist is seen at about 0.4-0.5 of the drawing's size, so this keeps it sharp at twice that
SCALE = 0.9

config = oiio.ImageSpec()
config.attribute("oiio:UnassociatedAlpha", 1)
pixels = oiio.ImageBuf(SOURCE, 0, 0, config).get_pixels(oiio.FLOAT)
height, width = pixels.shape[:2]
premultiplied = np.ascontiguousarray(np.dstack([pixels[..., :3] * pixels[..., 3:4], pixels[..., 3:4]]), np.float32)
source = oiio.ImageBuf(oiio.ImageSpec(width, height, 4, oiio.FLOAT))
source.set_pixels(oiio.ROI(), premultiplied)
w, h = round(width * SCALE), round(height * SCALE)
small = oiio.ImageBufAlgo.resize(source, roi=oiio.ROI(0, w, 0, h, 0, 1, 0, 4)).get_pixels(oiio.FLOAT)
a = small[..., 3:4]
rgba = np.clip(np.concatenate([np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0), a], axis=2), 0, 1)

spec = oiio.ImageSpec(w, h, 4, oiio.UINT8)
spec.attribute("oiio:UnassociatedAlpha", 1)
spec.attribute("Compression", "webp:90")
out = oiio.ImageOutput.create(OUT)
if not out.open(OUT, spec):
    raise SystemExit(out.geterror())
out.write_image(np.ascontiguousarray(rgba, np.float32))
out.close()
print(f"wrote fist.webp: {w}x{h}, {os.path.getsize(OUT) / 1e3:.0f} kB")
