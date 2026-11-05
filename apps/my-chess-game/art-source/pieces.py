"""Makes the chess pieces' pictures (static/assets/pieces/<colour><piece>.webp) from the user's drawings:
art-source/pieces/white/<piece>.png (white with black lines) and art-source/pieces/black/<piece>.png
(black with a white edge and white inner lines), each on transparency, 1254 px square, drawn filling it.

Each piece is cut to its outline and scaled to its own height, so the king stands tallest and the pawn
shortest, the white and black of a kind the same, and set on a 256 px transparent square standing on one
bottom line (the game draws the square at 92% of a board square, centred). The drawings' colours are
kept as they are.

Run with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\pieces.py
"""

import os
import time

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, "pieces")
OUT = os.path.join(HERE, "..", "static", "assets", "pieces")

SIZE = 256
# where every piece stands, and the widest one may be, in the 256 px square
BASELINE = 238
MAX_WIDTH = 240
# each piece's height in the square
HEIGHTS = {"K": 224, "Q": 216, "B": 214, "N": 204, "R": 188, "P": 168}
COLOURS = {"w": "white", "b": "black"}
# drawings whose dark lines are thickened, by this many of their pixels on each side: the white pawn is
# drawn with thinner lines than the rest (about 25 px against 40), so it's brought up to match the black
# pawn's look (about 7 px in the 256 px square instead of 5)
THICKEN = {("white", "P"): 4}


def read(path):
    # the drawing's own colours, not multiplied by its alpha
    config = oiio.ImageSpec()
    config.attribute("oiio:UnassociatedAlpha", 1)
    pixels = oiio.ImageBuf(path, 0, 0, config).get_pixels(oiio.FLOAT)
    return pixels[..., :3], pixels[..., 3]


def spread(values, steps, pick):
    # each pixel takes the `pick` (np.minimum or np.maximum) of its neighbours', `steps` times, square
    # and cross steps in turn (round enough)
    for step in range(steps):
        out = values.copy()
        out[1:] = pick(out[1:], values[:-1])
        out[:-1] = pick(out[:-1], values[1:])
        out[:, 1:] = pick(out[:, 1:], values[:, :-1])
        out[:, :-1] = pick(out[:, :-1], values[:, 1:])
        if step % 2:
            out[1:, 1:] = pick(out[1:, 1:], values[:-1, :-1])
            out[1:, :-1] = pick(out[1:, :-1], values[:-1, 1:])
            out[:-1, 1:] = pick(out[:-1, 1:], values[1:, :-1])
            out[:-1, :-1] = pick(out[:-1, :-1], values[1:, 1:])
        values = out
    return values


def thicken(rgb, alpha, steps):
    # the dark lines grow both ways: into the light fill (the darkest neighbour wins) and, for the
    # outline, out past the edge (the clear outside counted as dark, the most opaque neighbour wins)
    rgb = np.where(alpha[..., None] > 0.5, rgb, 0.0)
    return spread(rgb, steps, np.minimum), spread(alpha, steps, np.maximum)


def place(rgb, alpha, piece):
    # cut to the piece, scale it to its height (or the widest allowed), stand it on the bottom line
    ys, xs = np.nonzero(alpha > 0.02)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    scale = min(HEIGHTS[piece] / (bottom - top), MAX_WIDTH / (right - left))
    width, height = round((right - left) * scale), round((bottom - top) * scale)

    # scaled with the colours multiplied by alpha, so the fully clear pixels' colours (some are white)
    # don't bleed into the edges
    premultiplied = np.ascontiguousarray(np.dstack([rgb * alpha[..., None], alpha])[top:bottom, left:right], np.float32)
    # copied into the buffer (an ImageBuf made straight from an array can outlive it and crash)
    source = oiio.ImageBuf(oiio.ImageSpec(right - left, bottom - top, 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), premultiplied)
    small = oiio.ImageBufAlgo.resize(source, roi=oiio.ROI(0, width, 0, height, 0, 1, 0, 4)).get_pixels(oiio.FLOAT)

    canvas = np.zeros((SIZE, SIZE, 4), np.float32)
    x, y = (SIZE - width) // 2, BASELINE - height
    canvas[y : y + height, x : x + width] = np.clip(small, 0, 1)
    # back to plain colours for the PNG
    a = canvas[..., 3:4]
    canvas[..., :3] = np.where(a > 1e-4, canvas[..., :3] / np.maximum(a, 1e-4), 0)
    return np.clip(canvas, 0, 1)


def write(pixels, path):
    spec = oiio.ImageSpec(SIZE, SIZE, 4, oiio.UINT8)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    out = oiio.ImageOutput.create(path)
    # The running Storybook reloads as the first pictures change and reads them all again, which can
    # hold one for a moment: try again for a few seconds. (Writing to a file that didn't open crashes
    # OIIO outright, so stop with its reason if it never does.)
    for _ in range(50):
        if out.open(path, spec):
            break
        time.sleep(0.1)
    else:
        raise SystemExit(f"can't write {path}: {out.geterror()}")
    if not out.write_image(pixels):
        raise SystemExit(f"can't write {path}: {out.geterror()}")
    out.close()


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for prefix, folder in COLOURS.items():
        for piece in HEIGHTS:
            rgb, alpha = read(os.path.join(SOURCES, folder, f"{piece}.png"))
            if (folder, piece) in THICKEN:
                rgb, alpha = thicken(rgb, alpha, THICKEN[(folder, piece)])
            write(place(rgb, alpha, piece), os.path.join(OUT, f"{prefix}{piece}.webp"))
            print(f"wrote pieces/{prefix}{piece}.webp")
