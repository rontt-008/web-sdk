"""Makes the pieces standing on the table beside the board (static/assets/table-pieces/<piece>.webp) from
the user's drawings (art-source/table-pieces/<piece>.png: a white king, pawn and rook on transparency):
each cut to its outline and scaled to HEIGHT px tall, as a WebP with alpha. Their sizes on the table
are set in the game (Background.svelte).

Run with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\table-pieces.py
"""

import os

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, "table-pieces")
OUT = os.path.join(HERE, "..", "static", "assets", "table-pieces")
PIECES = ("king", "pawn", "rook")
# tall enough to stay sharp at twice their size on the table (the king ~140 units there)
HEIGHT = 320


def make(piece):
    config = oiio.ImageSpec()
    config.attribute("oiio:UnassociatedAlpha", 1)
    pixels = oiio.ImageBuf(os.path.join(SOURCES, f"{piece}.png"), 0, 0, config).get_pixels(oiio.FLOAT)
    alpha = pixels[..., 3]
    ys, xs = np.nonzero(alpha > 0.02)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    # scaled with the colours multiplied by alpha, so the clear pixels' colours don't bleed into the edge
    crop = pixels[top:bottom, left:right]
    premultiplied = np.ascontiguousarray(np.dstack([crop[..., :3] * crop[..., 3:4], crop[..., 3:4]]), np.float32)
    source = oiio.ImageBuf(oiio.ImageSpec(right - left, bottom - top, 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), premultiplied)
    width = round((right - left) * HEIGHT / (bottom - top))
    small = oiio.ImageBufAlgo.resize(source, roi=oiio.ROI(0, width, 0, HEIGHT, 0, 1, 0, 4)).get_pixels(oiio.FLOAT)
    a = small[..., 3:4]
    rgba = np.clip(np.concatenate([np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0), a], axis=2), 0, 1)

    path = os.path.join(OUT, f"{piece}.webp")
    spec = oiio.ImageSpec(width, HEIGHT, 4, oiio.UINT8)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    spec.attribute("Compression", "webp:92")
    out = oiio.ImageOutput.create(path)
    if not out.open(path, spec):
        raise SystemExit(out.geterror())
    out.write_image(np.ascontiguousarray(rgba, np.float32))
    out.close()
    print(f"wrote table-pieces/{piece}.webp: {width}x{HEIGHT} (aspect {width / HEIGHT:.3f}), {os.path.getsize(path) / 1e3:.0f} kB")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for piece in PIECES:
        make(piece)
