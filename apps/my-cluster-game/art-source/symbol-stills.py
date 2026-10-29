"""Draws the high symbols' stills (H1 to H4) and the low symbols' leaves (L1 to L4) in
static/assets/symbols for the game.

- art-source/<name>.webp: the user's PNG, given as a `<name>=<path>` argument, cleaned up (haze
  under alpha 16 cleared, alpha 240+ made solid, specks apart from the tile cleared; a PNG without
  alpha on black has the black joined to its edges made see-through first), lossless; without an
  argument for a name, the one already there
- static/assets/symbols/<name>.webp: that without its drawn outline (the dark band running in from
  the tile's edge, at most OUTLINE_DEPTH px, up to where the wood starts; the pixels next to the
  cut fade with how dark they are, so the new edge stays smooth), cropped to the tile and scaled
  (premultiplied Lanczos) so its longer side is 256 px, centred on a 256 x 256 transparent square,
  lossless. How big the game draws it is in src/game/constants.ts.
- static/assets/symbols/leaf-*.webp: art-source/leaf-*.webp without their thick drawn outline (cut
  the same way, LEAF_OUTLINE), drawn again thin (LEAF_LINE px, in the colour of the one cut away:
  the median of its solid pixels), the leaf with its line LEAF_FILL of the square on its longer side,
  so the margin is the gap between symbols; the game stretches the square to fill a cell. Some
  are less saturated than their art (LEAF_SATURATION).

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/symbol-stills.py [blueberries=<png> ...]
"""

import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'static', 'assets', 'symbols')
NAMES = ['blueberries', 'runestone', 'mushroom', 'acorn']
LEAVES = ['leaf-green', 'leaf-brown', 'leaf-red', 'leaf-yellow']

HAZE = 16 / 255
SOLID = 240 / 255
# a background without alpha: black, its brightest channel under this
BLACK = 0.03
SIZE = 256
# the drawn outline: pixels darker than DARK (their brightest channel) joined to the outside, at
# most this deep; the edge left fades out below LIGHT
OUTLINE = {'dark': 0.3, 'light': 0.5}
OUTLINE_DEPTH = 24
# the leaves' is thicker (up to about 55 px in the maple's corners between its lobes): joined corner
# to corner too, and with it everything under half see-through (its soft outer edge and the specks
# around it)
LEAF_OUTLINE = {'dark': 0.3, 'light': 0.5, 'depth': 64}
# their thin line, in px of the 256 px square: about 2 px on a screen where a cell is 85 px
LEAF_LINE = 6
LEAF_FILL = 0.86
# the share of its saturation a leaf keeps (the rest keep all of theirs), line included
LEAF_SATURATION = {'leaf-red': 0.75}
LUMINANCE = np.array([0.2126, 0.7152, 0.0722], np.float32)

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def read(path):
    pixels = oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)
    if pixels.shape[2] == 3:
        pixels = keyed(pixels)
    assert pixels.shape[2] == 4, f'{path} has no alpha'
    return pixels


def write(pixels, path):
    spec = oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', 'lossless')
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), np.ascontiguousarray(pixels, dtype=np.float32))
    assert out.write(path, oiio.UINT8), out.geterror()


def grow4(mask):
    grown = mask.copy()
    grown[1:] |= mask[:-1]
    grown[:-1] |= mask[1:]
    grown[:, 1:] |= mask[:, :-1]
    grown[:, :-1] |= mask[:, 1:]
    return grown


def grow8(mask):
    grown = grow4(mask)
    grown[1:, 1:] |= mask[:-1, :-1]
    grown[1:, :-1] |= mask[:-1, 1:]
    grown[:-1, 1:] |= mask[1:, :-1]
    grown[:-1, :-1] |= mask[1:, 1:]
    return grown


def keyed(pixels):
    """With alpha: see-through where the black background joined to the edges is."""
    black = pixels.max(axis=2) < BLACK
    background = np.zeros_like(black)
    background[[0, -1]] = background[:, [0, -1]] = True
    background &= black
    while True:
        more = grow4(background) & black
        if (more == background).all():
            break
        background = more
    return np.concatenate([pixels, (~background)[..., None].astype(np.float32)], axis=2)


def clean(pixels):
    """Haze cleared, near-solid made solid, and only the tile: the part joined to the middle."""
    pixels = pixels.copy()
    alpha = pixels[..., 3]
    alpha[alpha < HAZE] = 0
    alpha[alpha >= SOLID] = 1
    seen = alpha > 0
    tile = np.zeros_like(seen)
    tile[seen.shape[0] // 2, seen.shape[1] // 2] = True
    while True:
        more = grow4(tile) & seen
        if (more == tile).all():
            break
        tile = more
    alpha[~tile] = 0
    pixels[alpha == 0, :3] = 0
    return pixels


def resize(pixels, width, height):
    """Premultiplied, so see-through pixels don't bleed their colour into the edges."""
    premultiplied = pixels.copy()
    premultiplied[..., :3] *= premultiplied[..., 3:]
    spec = oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT)
    source = oiio.ImageBuf(spec)
    source.set_pixels(oiio.ROI(), np.ascontiguousarray(premultiplied))
    resized = oiio.ImageBufAlgo.resize(source, filtername='lanczos3', roi=oiio.ROI(0, width, 0, height, 0, 1, 0, 4))
    out = np.clip(resized.get_pixels(oiio.FLOAT), 0, 1)
    alpha = out[..., 3:]
    out[..., :3] = np.where(alpha > 0, out[..., :3] / np.maximum(alpha, 1e-6), 0)
    return out


def without_outline(pixels):
    pixels = pixels.copy()
    alpha = pixels[..., 3]
    brightness = pixels[..., :3].max(axis=2)
    outside = alpha < 0.5
    outline = outside
    for _ in range(OUTLINE_DEPTH):
        outline = grow4(outline) & (outside | (brightness < OUTLINE['dark']))
    outline &= ~outside
    edge = grow4(grow4(outline)) & ~outline & ~outside
    fade = np.clip((brightness - OUTLINE['dark']) / (OUTLINE['light'] - OUTLINE['dark']), 0, 1)
    # with the outline's soft outer edge, if it has one
    alpha[outline | outside] = 0
    alpha[edge] *= fade[edge]
    pixels[alpha == 0, :3] = 0
    return pixels


def still(pixels):
    pixels = without_outline(pixels)
    ys, xs = np.nonzero(pixels[..., 3] > 0)
    art = pixels[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    scale = SIZE / max(art.shape[:2])
    width, height = round(art.shape[1] * scale), round(art.shape[0] * scale)
    art = resize(art, width, height)

    square = np.zeros((SIZE, SIZE, 4), np.float32)
    top, left = (SIZE - height) // 2, (SIZE - width) // 2
    square[top : top + height, left : left + width] = art
    return square


def leaf_without_outline(pixels):
    """The leaf without its drawn outline, and the outline's colour."""
    pixels = pixels.copy()
    alpha = pixels[..., 3]
    brightness = pixels[..., :3].max(axis=2)
    outside = alpha < 0.5
    outline = outside
    for _ in range(LEAF_OUTLINE['depth']):
        outline = grow8(outline) & (outside | (brightness < LEAF_OUTLINE['dark']))
    outline &= ~outside
    colour = np.median(pixels[outline & (alpha == 1), :3], axis=0)
    edge = grow8(grow8(outline)) & ~outline & ~outside
    fade = np.clip((brightness - LEAF_OUTLINE['dark']) / (LEAF_OUTLINE['light'] - LEAF_OUTLINE['dark']), 0, 1)
    alpha[outline | outside] = 0
    alpha[edge] *= fade[edge]
    pixels[alpha == 0, :3] = 0
    return pixels, colour


def grow(alpha, radius):
    """The alpha grown by a disk, its edge kept soft."""
    grown = alpha.copy()
    reach = int(np.ceil(radius))
    for dy in range(-reach, reach + 1):
        for dx in range(-reach, reach + 1):
            weight = np.clip(radius + 0.5 - np.hypot(dy, dx), 0, 1)
            if weight > 0:
                grown = np.maximum(grown, np.roll(np.roll(alpha, dy, axis=0), dx, axis=1) * weight)
    return grown


def over(front, back):
    """Straight-alpha front over back."""
    fa, ba = front[..., 3:], back[..., 3:]
    alpha = fa + ba * (1 - fa)
    rgb = (front[..., :3] * fa + back[..., :3] * ba * (1 - fa)) / np.maximum(alpha, 1e-6)
    return np.concatenate([rgb, alpha], axis=2)


def saturated(rgb, share):
    luminance = (rgb @ LUMINANCE)[..., None]
    return luminance + share * (rgb - luminance)


def leaf(pixels, saturation=1):
    pixels, colour = leaf_without_outline(pixels)
    pixels[..., :3] = saturated(pixels[..., :3], saturation)
    colour = saturated(colour, saturation)
    ys, xs = np.nonzero(pixels[..., 3] > 0)
    art = pixels[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    scale = (SIZE * LEAF_FILL - LEAF_LINE * 2) / max(art.shape[:2])
    width, height = round(art.shape[1] * scale), round(art.shape[0] * scale)
    art = resize(art, width, height)

    square = np.zeros((SIZE, SIZE, 4), np.float32)
    top, left = (SIZE - height) // 2, (SIZE - width) // 2
    square[top : top + height, left : left + width] = art
    line = np.zeros_like(square)
    line[..., :3] = colour
    line[..., 3] = grow(square[..., 3], LEAF_LINE)
    out = over(square, line)
    out[out[..., 3] == 0, :3] = 0
    return out


sources = dict(argument.split('=', 1) for argument in sys.argv[1:])
assert set(sources) <= set(NAMES), f'names are {NAMES}'
for name in NAMES:
    source = os.path.join(HERE, f'{name}.webp')
    if name in sources:
        write(clean(read(sources[name])), source)
    write(still(read(source)), os.path.join(OUT, f'{name}.webp'))
    print(f'{name}: done')
for name in LEAVES:
    pixels = read(os.path.join(HERE, f'{name}.webp'))
    write(leaf(pixels, LEAF_SATURATION.get(name, 1)), os.path.join(OUT, f'{name}.webp'))
    print(f'{name}: done')
