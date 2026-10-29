"""Renders a high symbol's win animation into static/assets/sprites/symbolWins, and its still
(static/assets/symbols) from the animation's first frame, so the two line up.

Each high symbol is a 2D cut-out rig of the user's art in its own .blend (blueberry_slot.blend,
stump_slot.blend, mushroom_slot.blend, acorn_slot.blend). Frames 1-48 are the win, 30 a second,
ending as it began; 61-76 are a landing, not used yet. The renders get the outline ring every symbol
has (the leaves' outlines were doubled, see README.md): it is grown from the symbol alone, rendered
without its sparkles, dust and wood chips, so those get no outline.

Run from apps/my-cluster-game with Blender, which comes with numpy and OpenImageIO, once per file
(without -Y: the rigs need no scripts):
    blender -b art-source/blueberry_slot.blend --python art-source/symbol-sheets.py
"""

import json
import math
import os
import tempfile

import bpy
import numpy as np
import OpenImageIO as oiio
from OpenImageIO import ImageBufAlgo

HERE = os.path.dirname(os.path.abspath(__file__))
STILL_DIR = os.path.join(HERE, '..', 'static', 'assets', 'symbols')
SHEET_DIR = os.path.join(HERE, '..', 'static', 'assets', 'sprites', 'symbolWins')

# each file's symbol: its name in the game, and the outline ring its still had (in final pixels,
# grown over its drawn outline to about 11 px in all, in the colour of its own edge)
SYMBOLS = {
    'blueberry_slot.blend': {'name': 'blueberries', 'ring': 7.5, 'colour': 0x1B0100},
    'stump_slot.blend': {'name': 'stump', 'ring': 9.1, 'colour': 0x2C0502},
    'mushroom_slot.blend': {'name': 'mushroom', 'ring': 5.5, 'colour': 0x270201},
    'acorn_slot.blend': {'name': 'acorn', 'ring': 5.3, 'colour': 0x330A01},
}
WIN_FRAMES = range(1, 49)
# the effects, rendered over the symbol but not part of its outline
FX_PREFIXES = ('Sparkle_', 'Dust_', 'Chip_')

# the still is SIZE square with the symbol (outline included) across FILL of it, like every symbol;
# a cell of the board is SIZE of the animation's pixels too
SIZE = 256
FILL = 0.86
# renders are DOWN times the final size, so the ring is smooth when shrunk
DOWN = 3
# the rigs' cameras are framed about the symbol at rest; widened this much (at the same pixels per
# unit), so nothing the win does is cut off by the frame's edge
ROOM = 1.6
# haze fainter than this (stray pixels of the cut-out pieces) gets no outline
HAZE = 16 / 255
# faintest pixel kept when the frames are trimmed
CLEAR = 1 / 255
# clear pixels around each frame in the sheet, so none bleeds into the next when filtered
GAP = 2
MAX_SHEET = 4096
FRAME_RATE = 30

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def load(path):
    return oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)


def write(path, pixels, compression):
    """Straight-alpha pixels to a file."""
    height, width = pixels.shape[:2]
    spec = oiio.ImageSpec(width, height, 4, oiio.UINT8)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', compression)
    out = oiio.ImageOutput.create(path)
    out.open(path, spec)
    out.write_image(np.clip(np.round(pixels * 255), 0, 255).astype(np.uint8))
    out.close()


def bounds(mask):
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def dilate(alpha, radius):
    """The alpha grown by a disc, which is how far the ring reaches (worked out only around the
    symbol, as the rest stays clear)."""
    x0, y0, x1, y1 = bounds(alpha > 0)
    height, width = alpha.shape
    x0, y0 = max(0, x0 - radius), max(0, y0 - radius)
    x1, y1 = min(width, x1 + radius), min(height, y1 + radius)
    crop = alpha[y0:y1, x0:x1]
    padded = np.pad(crop, radius)
    grown = crop.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy <= radius * radius + radius:
                window = padded[radius + dy : radius + dy + crop.shape[0], radius + dx : radius + dx + crop.shape[1]]
                np.maximum(grown, window, out=grown)
    out = np.zeros_like(alpha)
    out[y0:y1, x0:x1] = grown
    return out


def render(scene, frames, fx, directory):
    for obj in scene.objects:
        if obj.name.startswith(FX_PREFIXES):
            obj.hide_render = not fx
    paths = []
    for frame in frames:
        scene.frame_set(frame)
        scene.render.filepath = os.path.join(directory, f'{"full" if fx else "body"}_{frame:03d}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(scene.render.filepath)
    return paths


def body_size(scene, directory):
    """The symbol's longer side at rest (frame 1), in pixels of a SIZE render."""
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    (path,) = render(scene, [1], False, directory)
    x0, y0, x1, y1 = bounds(load(path)[..., 3] >= HAZE)
    return max(x1 - x0, y1 - y0)


def attached(alpha):
    """Where the symbol is: its solid parts and the soft edges joined to them, without the faint
    specks the cut-out pieces leave about (each would grow into a dot of outline)."""
    mask = alpha >= HAZE
    region = alpha >= 0.5
    while True:
        grown = region.copy()
        grown[1:] |= region[:-1]
        grown[:-1] |= region[1:]
        grown[:, 1:] |= region[:, :-1]
        grown[:, :-1] |= region[:, 1:]
        grown &= mask
        if (grown == region).all():
            return region
        region = grown


def compose(full, body, ring, colour):
    """The render over the ring grown from the symbol alone, premultiplied."""
    symbol = attached(body[..., 3])
    # the specks are cleared from the render too (its sparkles and chips are never where they are)
    full = np.where(((body[..., 3] > 0) & ~symbol)[..., None], 0, full)
    alpha = full[..., 3]
    under = dilate(np.where(symbol, body[..., 3], 0), ring)
    out = np.empty_like(full)
    out[..., 3] = alpha + under * (1 - alpha)
    out[..., :3] = full[..., :3] * alpha[..., None] + colour * (under * (1 - alpha))[..., None]
    return out


def shrink(premultiplied):
    """DOWN times smaller, back to straight alpha."""
    height, width = premultiplied.shape[:2]
    buf = oiio.ImageBuf(oiio.ImageSpec(width, height, 4, oiio.FLOAT))
    buf.set_pixels(oiio.ROI(), np.ascontiguousarray(premultiplied))
    roi = oiio.ROI(0, width // DOWN, 0, height // DOWN, 0, 1, 0, 4)
    small = ImageBufAlgo.resize(buf, filtername='lanczos3', roi=roi).get_pixels(oiio.FLOAT)
    alpha = np.clip(small[..., 3:4], 0, 1)
    rgb = np.clip(small[..., :3], 0, alpha)
    rgb = np.where(alpha > 0, rgb / np.maximum(alpha, 1e-6), 0)
    out = np.concatenate([rgb, alpha], axis=2)
    out[out[..., 3] < CLEAR] = 0
    return out


def window(pixels, cx, cy, size):
    """size x size of the pixels about cx, cy, clear where they run out."""
    half = size // 2
    pad = size
    padded = np.pad(pixels, ((pad, pad), (pad, pad), (0, 0)))
    return padded[cy - half + pad : cy + half + pad, cx - half + pad : cx + half + pad]


def pack(frames):
    """Trimmed frames in rows, tallest first, in a sheet about as wide as it is tall."""
    trims = [bounds(frame[..., 3] > 0) for frame in frames]
    sizes = [(x1 - x0, y1 - y0) for x0, y0, x1, y1 in trims]
    area = sum((w + GAP) * (h + GAP) for w, h in sizes)
    width = max(max(w for w, _ in sizes), math.ceil(math.sqrt(area * 1.1)))
    order = sorted(range(len(frames)), key=lambda i: -sizes[i][1])
    places, x, y, row = {}, 0, 0, 0
    for i in order:
        w, h = sizes[i]
        if x + w > width:
            x, y, row = 0, y + row + GAP, 0
        places[i] = (x, y)
        x += w + GAP
        row = max(row, h)
    height = y + row
    width = max(px + sizes[i][0] for i, (px, _) in places.items())
    assert width <= MAX_SHEET and height <= MAX_SHEET, (width, height)
    return trims, sizes, places, width, height


def main():
    symbol = SYMBOLS[os.path.basename(bpy.data.filepath)]
    name = symbol['name']
    colour = np.array([(symbol['colour'] >> s) & 0xFF for s in (16, 8, 0)], np.float32) / 255
    scene = bpy.context.scene
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    directory = tempfile.mkdtemp(prefix=f'{name}-frames-')

    # rendered so the symbol at rest comes out at its still's size, DOWN times over
    body = SIZE * FILL - 2 * symbol['ring']
    resolution = round(SIZE * ROOM * body / body_size(scene, directory)) * DOWN
    scene.render.resolution_x = scene.render.resolution_y = resolution
    scene.camera.data.ortho_scale *= ROOM
    ring = round(symbol['ring'] * DOWN)
    bodies = render(scene, WIN_FRAMES, False, directory)
    fulls = render(scene, WIN_FRAMES, True, directory)

    frames = [shrink(compose(load(full), load(body), ring, colour)) for full, body in zip(fulls, bodies)]
    for i, frame in enumerate(frames):
        alpha = frame[..., 3]
        edge = max(alpha[0].max(), alpha[-1].max(), alpha[:, 0].max(), alpha[:, -1].max())
        assert edge == 0, f'frame {i + 1} is cut off by the edge of the render; widen ROOM'

    # the still: the first frame, centred on a SIZE square
    x0, y0, x1, y1 = bounds(frames[0][..., 3] > 0)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    write(os.path.join(STILL_DIR, f'{name}.webp'), window(frames[0], cx, cy, SIZE), 'lossless')

    # the animation's frames: about the same middle, big enough for all of them
    union = [bounds(frame[..., 3] > 0) for frame in frames]
    reach = max(
        max(cx - b[0] for b in union),
        max(b[2] - cx for b in union),
        max(cy - b[1] for b in union),
        max(b[3] - cy for b in union),
    )
    cell = 2 * (reach + 1)
    frames = [window(frame, cx, cy, cell) for frame in frames]
    trims, sizes, places, sheet_w, sheet_h = pack(frames)

    sheet = np.zeros((sheet_h, sheet_w, 4), np.float32)
    atlas = {}
    for i, frame in enumerate(frames):
        (tx0, ty0, tx1, ty1), (w, h), (x, y) = trims[i], sizes[i], places[i]
        sheet[y : y + h, x : x + w] = frame[ty0:ty1, tx0:tx1]
        atlas[f'{name}_win_{i:02d}'] = {
            'frame': {'x': x, 'y': y, 'w': w, 'h': h},
            'rotated': False,
            'trimmed': True,
            'spriteSourceSize': {'x': tx0, 'y': ty0, 'w': w, 'h': h},
            'sourceSize': {'w': cell, 'h': cell},
        }

    os.makedirs(SHEET_DIR, exist_ok=True)
    image = f'{name}-win.webp'
    write(os.path.join(SHEET_DIR, image), sheet, 'webp:90')
    meta = {'image': image, 'format': 'RGBA8888', 'size': {'w': sheet_w, 'h': sheet_h}, 'scale': '1'}
    with open(os.path.join(SHEET_DIR, f'{name}-win.json'), 'w') as file:
        json.dump({'frames': atlas, 'meta': meta}, file, indent='\t')
        file.write('\n')

    first_last = np.abs(frames[0] - frames[-1]).max()
    print(
        f'SYMBOL {name}: rendered at {resolution} px, {len(frames)} frames of {cell} x {cell} '
        f'(sizeRatios {cell / SIZE:.4f}) in a {sheet_w} x {sheet_h} sheet; still {x1 - x0} x {y1 - y0}; '
        f'first and last frames differ by {first_last:.3f}'
    )


main()
