"""Makes the side panel's marble (static/assets/panel-light.webp, panel-dark.webp) from the board picture
(art-source/board.png), so the panel is the same stone as the board: the light squares' marble for its
page, the dark squares' for its head.

The squares without coordinates on them (files b-h, ranks 2-8) are cut out (a little in from their
edges), each evened to the same average colour, and laid edge to edge with their edges overlapping and
blended, so there are no seams; the squares turned half round (which keeps the grain's slant) are used
too, so no square shows twice side by side. Laid at the board's own scale (a square 128 px, as in
board.webp, the board being 640 units across: 1.6 px a unit), the sizes the panel is drawn at:
page 321 x 549 units, head 321 x 112.

Run with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\panel-texture.py
"""

import os

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "board.png")
OUT = os.path.join(HERE, "..", "static", "assets")

SQUARES = 8
# a square's marble at the board's scale, and how much of each square's edge is left off
SQUARE_PX = 128
INSET = 4
# how far neighbouring squares overlap, blended across
OVERLAP = 28
# px a unit of the layout, as on the board, and the panel's sizes in units
DENSITY = 1.6
PAGE = (321, 549)
HEAD = (321, 112)


def squares(board, light):
    # the squares of one colour without coordinates on them, at SQUARE_PX, and turned half round too
    size = board.shape[0] / SQUARES
    tiles = []
    for row in range(SQUARES - 1):
        for col in range(1, SQUARES):
            if ((row + col) % 2 == 0) != light:
                continue
            top, left = round(row * size) + INSET, round(col * size) + INSET
            side = round(size) - 2 * INSET
            crop = np.ascontiguousarray(board[top : top + side, left : left + side], np.float32)
            buf = oiio.ImageBuf(oiio.ImageSpec(side, side, 3, oiio.FLOAT))
            buf.set_pixels(oiio.ROI(), crop)
            small = oiio.ImageBufAlgo.resize(buf, roi=oiio.ROI(0, SQUARE_PX, 0, SQUARE_PX, 0, 1, 0, 3)).get_pixels(oiio.FLOAT)
            tiles.append(small)
    # every square evened to the same average colour, so none stands out as a patch
    mean = np.mean([tile.mean(axis=(0, 1)) for tile in tiles], axis=0)
    tiles = [tile - tile.mean(axis=(0, 1)) + mean for tile in tiles]
    return tiles + [tile[::-1, ::-1] for tile in tiles]


def mosaic(tiles, width, height, seed):
    # the tiles laid edge to edge, overlapping by OVERLAP and blended across it (each weighted by how far
    # in from its own edge a pixel is), in a shuffled order
    rng = np.random.default_rng(seed)
    order = rng.permutation(len(tiles))
    step = SQUARE_PX - OVERLAP
    ramp = np.minimum(np.arange(SQUARE_PX) + 1, OVERLAP) / OVERLAP
    ramp = np.minimum(ramp, ramp[::-1])
    weight = np.minimum.outer(ramp, ramp)[..., None]
    total = np.zeros((height + SQUARE_PX + OVERLAP, width + SQUARE_PX + OVERLAP, 3), np.float32)
    weights = np.zeros((height + SQUARE_PX + OVERLAP, width + SQUARE_PX + OVERLAP, 1), np.float32)
    index = 0
    for y in range(-OVERLAP, height, step):
        for x in range(-OVERLAP, width, step):
            tile = tiles[order[index % len(order)]]
            index += 1
            y0, x0 = y + OVERLAP, x + OVERLAP
            total[y0 : y0 + SQUARE_PX, x0 : x0 + SQUARE_PX] += tile * weight
            weights[y0 : y0 + SQUARE_PX, x0 : x0 + SQUARE_PX] += weight
    out = total / np.maximum(weights, 1e-6)
    return np.clip(out[OVERLAP : OVERLAP + height, OVERLAP : OVERLAP + width], 0, 1)


def write(pixels, name):
    path = os.path.join(OUT, name)
    buf = oiio.ImageBuf(oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 3, oiio.FLOAT))
    buf.set_pixels(oiio.ROI(), np.ascontiguousarray(pixels, np.float32))
    buf.specmod().attribute("Compression", "webp:90")
    if not buf.write(path):
        raise SystemExit(buf.geterror())
    print(f"wrote {name}: {pixels.shape[1]}x{pixels.shape[0]}, {os.path.getsize(path) / 1e3:.0f} kB")


if __name__ == "__main__":
    board = oiio.ImageBuf(SOURCE).get_pixels(oiio.FLOAT)[..., :3]
    for name, light, (units_w, units_h), seed in (
        ("panel-light.webp", True, PAGE, 1),
        ("panel-dark.webp", False, HEAD, 2),
    ):
        width, height = round(units_w * DENSITY), round(units_h * DENSITY)
        write(mosaic(squares(board, light), width, height, seed), name)
