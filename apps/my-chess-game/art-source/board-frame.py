"""Makes the board's wooden frame (static/assets/board-frame.webp) from the user's frame
(art-source/board-frame.png, 1254 px, drawn already tipped away: its far side narrower) by straightening
it: its opening is mapped onto a flat square of the board picture's scale (1024 px, 128 a square), the
frame round it, so the game can tilt it with the board itself (TiltedPlane), whatever TILT is.

The opening's and the outside's corners are found by fitting a straight line to each of their sides (the
middle half of each, clear of the mitred corners). The margin round the square is as wide as the frame
reaches out; it's printed in the board's units (560 across), for FRAME in the game.

Run with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\board-frame.py
"""

import math
import os

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "board-frame.png")
OUT = os.path.join(HERE, "..", "static", "assets", "board-frame.webp")
# the opening at the board picture's scale, and the board's own units across it
SQUARE = 1024
BOARD_UNITS = 560
# The wood's colour, browner than drawn (the drawing's is a red orange): each pixel's brightness given
# this tint (a walnut brown, as bright as white), mixed in by AMOUNT and lifted by LIFT. Only the wood:
# the gold lip round the opening (yellow, not red) is kept as drawn.
BROWN = np.array([1.6, 0.9, 0.55])
AMOUNT = 0.75
LIFT = 1.1


def corners(solid):
    """The opening's and the outside's corners (top left, top right, bottom right, bottom left)."""
    h, w = solid.shape
    cx, cy = w // 2, h // 2

    def first(line):
        return int(np.nonzero(line)[0][0])

    sides = {key: [] for key in ("inL", "inR", "inT", "inB", "outL", "outR", "outT", "outB")}
    for y in range(int(h * 0.25), int(h * 0.75)):
        sides["inL"].append((cx - first(solid[y, cx::-1]), y))
        sides["inR"].append((cx + first(solid[y, cx:]), y))
        sides["outL"].append((first(solid[y, :]), y))
        sides["outR"].append((w - 1 - first(solid[y, ::-1]), y))
    for x in range(int(w * 0.25), int(w * 0.75)):
        sides["inT"].append((x, cy - first(solid[cy::-1, x])))
        sides["inB"].append((x, cy + first(solid[cy:, x])))
        sides["outT"].append((x, first(solid[:, x])))
        sides["outB"].append((x, h - 1 - first(solid[::-1, x])))

    lines = {}
    for key, points in sides.items():
        p = np.array(points, float)
        if key.endswith(("L", "R")):  # x = a y + b
            lines[key] = np.polyfit(p[:, 1], p[:, 0], 1)
        else:  # y = a x + b
            lines[key] = np.polyfit(p[:, 0], p[:, 1], 1)

    def cross(vertical, horizontal):
        a1, b1 = lines[vertical]
        a2, b2 = lines[horizontal]
        y = (a2 * b1 + b2) / (1 - a2 * a1)
        return a1 * y + b1, y

    return {
        ring: [cross(ring + "L", ring + "T"), cross(ring + "R", ring + "T"), cross(ring + "R", ring + "B"), cross(ring + "L", ring + "B")]
        for ring in ("in", "out")
    }


def browner(rgb):
    """The wood turned browner (BROWN), the gold left as it is: how red a pixel is decides how much."""
    brightness = (rgb @ np.array([0.2126, 0.7152, 0.0722]))[..., None]
    tinted = brightness * BROWN * LIFT
    redness = rgb[..., 0] / np.maximum(rgb[..., 1], 1e-3)
    wood = np.clip((redness - 1.5) / 0.5, 0, 1)[..., None] * AMOUNT
    return np.clip(rgb * (1 - wood) + tinted * wood, 0, 1)


def square_to_quad(quad):
    """The 3x3 matrix taking (u, v, 1), (u, v) in the unit square, onto the quad (Heckbert)."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = quad
    dx1, dx2, dx3 = x1 - x2, x3 - x2, x0 - x1 + x2 - x3
    dy1, dy2, dy3 = y1 - y2, y3 - y2, y0 - y1 + y2 - y3
    det = dx1 * dy2 - dx2 * dy1
    g = (dx3 * dy2 - dx2 * dy3) / det
    h = (dx1 * dy3 - dx3 * dy1) / det
    return np.array(
        [
            [x1 - x0 + g * x1, x3 - x0 + h * x3, x0],
            [y1 - y0 + g * y1, y3 - y0 + h * y3, y0],
            [g, h, 1.0],
        ]
    )


def sample(image, x, y):
    """Bilinear samples of image (premultiplied) at x, y; clear outside it."""
    h, w = image.shape[:2]
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    out = np.zeros(x.shape + (image.shape[2],), np.float32)
    for dx, dy, weight in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        xi, yi = x0 + dx, y0 + dy
        inside = (xi >= 0) & (xi < w) & (yi >= 0) & (yi < h)
        values = np.zeros_like(out)
        values[inside] = image[yi[inside], xi[inside]]
        out += values * weight
    return out


if __name__ == "__main__":
    config = oiio.ImageSpec()
    config.attribute("oiio:UnassociatedAlpha", 1)
    pixels = oiio.ImageBuf(SOURCE, 0, 0, config).get_pixels(oiio.FLOAT)
    alpha = pixels[..., 3:4]
    premultiplied = np.concatenate([browner(pixels[..., :3]) * alpha, alpha], axis=2)
    found = corners(pixels[..., 3] > 0.5)

    to_source = square_to_quad(found["in"])
    # how far out the frame reaches, in the square's units (the outside's corners taken back through the map)
    from_source = np.linalg.inv(to_source)
    reach = 0.0
    for x, y in found["out"]:
        u, v, w = from_source @ np.array([x, y, 1.0])
        u, v = u / w, v / w
        reach = max(reach, -u, -v, u - 1, v - 1)
    margin = math.ceil(reach * SQUARE) + 4

    size = SQUARE + margin * 2
    grid = (np.arange(size, dtype=np.float64) + 0.5 - margin) / SQUARE
    u, v = np.meshgrid(grid, grid)
    sx, sy, sw = (to_source @ np.stack([u.ravel(), v.ravel(), np.ones(u.size)])).reshape(3, size, size)
    flat = sample(premultiplied, sx / sw - 0.5, sy / sw - 0.5)

    a = flat[..., 3:4]
    rgba = np.concatenate([np.where(a > 1e-4, flat[..., :3] / np.maximum(a, 1e-4), 0), a], axis=2)
    spec = oiio.ImageSpec(size, size, 4, oiio.UINT8)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    spec.attribute("Compression", "webp:92")
    out = oiio.ImageOutput.create(OUT)
    if not out.open(OUT, spec):
        raise SystemExit(out.geterror())
    out.write_image(np.ascontiguousarray(np.clip(rgba, 0, 1), np.float32))
    out.close()

    units = BOARD_UNITS / SQUARE
    print(f"wrote board-frame.webp: {size}x{size}, {os.path.getsize(OUT) / 1e3:.0f} kB")
    print(f"opening {SQUARE} px; margin {margin} px = {margin * units:.1f} units, frame reaches {reach * BOARD_UNITS:.1f} units")
