"""Draws the wooden frames and signs drawn round parts of the game's UI, from the user's PNGs:

- rune-ladder: the ladder of branches the four rune boxes sit in, left of the board (RuneTablets.svelte;
  drawn as it is, it keeps its shape; lying down above the board on phones held upright)
- rune-box-frame: round each rune box (not used now: the ladder replaced it)
- bonus-meter-frame: the bonus meter, branches round a bar of planks, with a sign over it for the
  count (BonusMeter.svelte; drawn as it is, the meter keeps its shape), and its planks green alone
  (PLANKS), which the game reveals from the left as the meter fills
- logo: the game's name, RuneFall, on a wooden sign with maple leaves (Logo.svelte, over the bonus
  meter)

For each:
- art-source/<name>.webp: the user's PNG, given as an argument, cleaned up (haze under alpha 16
  cleared, alpha 240+ made solid) and cropped to the art with PAD px round it, lossless; without an
  argument, the one already there
- static/assets/<name>.webp: that in the board's duller, a little greyer look (LOOK, as the board
  frame has it)

It prints the art's size and, for a frame see-through in the middle, where its openings are (the
inner edges of its branches, the medians along the middle half of each opening, so a vine or leaf
reaching in doesn't count), in its pixels: the numbers in the components above. A frame that is solid all over (the meter's planks) is measured by
hand: cleaning a new PNG prints how far its crop moved it.

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/wood-frames.py <name> [<frame.png>]
"""

import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
# a point inside each of a frame's see-through openings, as a share of the cropped art's width and
# height (none: it has none)
FRAMES = {
    'rune-ladder': [(0.5, 0.17), (0.5, 0.41), (0.5, 0.645), (0.5, 0.865)],
    'rune-box-frame': [(0.5, 0.5)],
    'bonus-meter-frame': [],
    'logo': [],
}
# kept in their own colours, without the board's duller look (the meter's planks went grey in it)
VIVID = {'rune-ladder', 'bonus-meter-frame', 'logo'}
# The meter's planks again, green (static/assets/<out>, the game reveals them as it fills): found
# by spreading from the middle of the bar within `within` (left, top, right, bottom) through pixels
# lighter than `dark`, so it stops at the branches' and leaves' outlines, then `edge` px over their
# soft edges; `green` is the planks' average shade, lighter and darker as the wood is, with `shine`.
PLANKS = {
    'bonus-meter-frame': {
        'out': 'bonus-meter-fill.webp',
        'within': (140, 250, 1640, 460),
        'dark': 0.09,
        'edge': 2,
        'green': (0.15, 0.72, 0.29),
        # this much brighter at the top and deeper at the bottom, and a white band (this much white,
        # centred this far down, this wide) for a little shine
        'shine': {'light': 0.12, 'white': 0.4, 'band': 0.2, 'band_width': 0.09},
    },
}

HAZE = 16 / 255
SOLID = 240 / 255
# see-through room left round the art when it is cropped
PAD = 4
# the same look as LOOK in src/game/look.ts and board-frame.py
LOOK = {'saturation': 0.6, 'grey': 0.08}
LUMINANCE = np.array([0.2126, 0.7152, 0.0722], np.float32)
# under see-through pixels, so lossy WebP blurs a dark colour into the soft edges, not black
EDGE_COLOUR = np.array([0x3A, 0x16, 0x06], np.float32) / 255

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def read(path):
    pixels = oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)
    assert pixels.shape[2] == 4, f'{path} has no alpha'
    return pixels


def write(pixels, path, compression):
    spec = oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', compression)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), np.ascontiguousarray(pixels, dtype=np.float32))
    assert out.write(path, oiio.UINT8), out.geterror()


def clean(pixels):
    pixels = pixels.copy()
    alpha = pixels[..., 3]
    alpha[alpha < HAZE] = 0
    alpha[alpha >= SOLID] = 1
    pixels[alpha == 0, :3] = 0
    ys, xs = np.nonzero(alpha > 0)
    print(f"cropped: the PNG's pixels moved by {PAD - xs.min()}, {PAD - ys.min()}")
    return np.pad(pixels[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1], ((PAD, PAD), (PAD, PAD), (0, 0)))


def look(rgb):
    luminance = (rgb @ LUMINANCE)[..., None]
    kept = luminance + LOOK['saturation'] * (rgb - luminance)
    return kept * (1 - LOOK['grey']) + 0.5 * LOOK['grey']


def grow4(mask):
    grown = mask.copy()
    grown[1:] |= mask[:-1]
    grown[:-1] |= mask[1:]
    grown[:, 1:] |= mask[:, :-1]
    grown[:, :-1] |= mask[:, 1:]
    return grown


def green_planks(frame):
    """The planks green, alone, cropped to them, and where they are in the frame."""
    plank = PLANKS[name]
    luminance = frame[..., :3] @ LUMINANCE
    left, top, right, bottom = plank['within']
    open_ = np.zeros(luminance.shape, bool)
    open_[top:bottom, left:right] = (luminance > plank['dark'])[top:bottom, left:right]
    open_ &= frame[..., 3] > 0.5
    # spread from the middle of the bar, through the light seams, up to the dark outlines
    region = np.zeros_like(open_)
    y = (top + bottom) // 2
    region[y, left + (right - left) // 5 : right - (right - left) // 5 : 20] = True
    region &= open_
    while True:
        more = grow4(region) & open_
        if (more == region).all():
            break
        region = more
    # and the soft edges against the outlines
    for _ in range(plank['edge']):
        region = grow4(region) & (frame[..., 3] > 0)

    layer = np.zeros_like(frame)
    shade = (luminance / luminance[region].mean())[..., None]
    rgb = np.array(plank['green'], np.float32) * shade

    # a little shine, by how far down the planks each pixel is in its column (0 at their top, 1 at
    # their bottom: it follows the branches' wobble): brighter above and deeper below, and a soft white
    # band near the top
    shine = plank['shine']
    height = region.shape[0]
    top_of = np.argmax(region, axis=0)
    bottom_of = height - np.argmax(region[::-1], axis=0)
    rows = np.arange(height)[:, None]
    down = np.clip((rows - top_of) / np.maximum(bottom_of - top_of, 1), 0, 1)[..., None]
    rgb = rgb * (1 + shine['light'] * (1 - 2 * down))
    band = np.exp(-(((down - shine['band']) / shine['band_width']) ** 2))
    rgb = rgb + (1 - rgb) * shine['white'] * band

    layer[..., :3] = np.clip(rgb, 0, 1)
    layer[..., 3] = np.where(region, frame[..., 3], 0)
    ys, xs = np.nonzero(region)
    crop = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    return layer[crop], (xs.min(), ys.min())


name = sys.argv[1] if len(sys.argv) > 1 else ''
assert name in FRAMES, f'names are {list(FRAMES)}'
plain = os.path.join(HERE, f'{name}.webp')
if len(sys.argv) > 2:
    write(clean(read(sys.argv[2])), plain, 'lossless')

frame = read(plain)
if name not in VIVID:
    frame[..., :3] = look(frame[..., :3])
filled = green_planks(frame) if name in PLANKS else None
frame[frame[..., 3] == 0, :3] = EDGE_COLOUR
write(frame, os.path.join(HERE, '..', 'static', 'assets', f'{name}.webp'), 'webp:90')

solid = frame[..., 3] > 0.5
height, width = solid.shape
print(f'{name}: size {width} x {height}')
if filled is not None:
    layer, (left, top) = filled
    write(layer, os.path.join(HERE, '..', 'static', 'assets', PLANKS[name]['out']), 'webp:90')
    print(f'{PLANKS[name]["out"]}: {layer.shape[1]} x {layer.shape[0]} at {left}, {top}')


def first(line):
    """How far along a line of see-through-or-not pixels the first solid one is."""
    return int(np.argmax(line)) if line.any() else len(line)


for cx, cy in ((round(width * x), round(height * y)) for x, y in FRAMES[name]):
    assert not solid[cy, cx], f'the point {cx}, {cy} inside an opening is on the art'
    # roughly, along the lines through the point, then the medians along its middle half
    left, right = cx - first(solid[cy, :cx][::-1]), cx + first(solid[cy, cx:])
    top, bottom = cy - first(solid[:cy, cx][::-1]), cy + first(solid[cy:, cx])
    rows = range(top + (bottom - top) // 4, bottom - (bottom - top) // 4)
    cols = range(left + (right - left) // 4, right - (right - left) // 4)
    left = round(np.median([cx - first(solid[y, :cx][::-1]) for y in rows]))
    right = round(np.median([cx + first(solid[y, cx:]) for y in rows]))
    top = round(np.median([cy - first(solid[:cy, x][::-1]) for x in cols]))
    bottom = round(np.median([cy + first(solid[cy:, x]) for x in cols]))
    print(f'opening: left {left}, top {top}, right {right}, bottom {bottom}')
