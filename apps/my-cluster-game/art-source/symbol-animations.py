"""Draws the high symbols' idle loops (H1 to H4) in static/assets/sprites/symbolIdles for the game.

- the user's 2D cut-out animations, made in Blender: "<blender stuff>/<name>_idle/export/
  <name>_idle_sheet.png", 120 frames of 256 x 256 at 30 fps that loop (the .blend files, layers and
  scripts are in that folder too)
- static/assets/sprites/symbolIdles/<still>-idle.{webp,json}: each frame moved and scaled (the same
  for all of a symbol's frames, premultiplied Lanczos) so the tile's wooden frame is where it is in
  the still (static/assets/symbols/<still>.webp, from symbol-stills.py): the game draws both at the
  same size (TILE_SIZE) and can swap one for the other without a jump. Packed 10 to a row with a
  gap between frames (so they don't bleed into each other when drawn smaller), WebP (IDLE_COMPRESSION).

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/symbol-idles.py ["<blender stuff folder>"]
"""

import json
import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS = os.path.join(HERE, '..', 'static', 'assets', 'symbols')
OUT = os.path.join(HERE, '..', 'static', 'assets', 'sprites', 'symbolIdles')
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'blender stuff')
# the animation's name in the Blender folder, and the still's (and the game's) name for the symbol
SYMBOLS = {'blueberry': 'blueberries', 'runestone': 'runestone', 'mushroom': 'mushroom', 'acorn': 'acorn'}

SIZE = 256
COLUMNS = 10
GAP = 2
IDLE_COMPRESSION = 'webp:90'

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def read(path):
    return oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)


def frame_edges(pixels):
    """Where the tile's wooden frame is (left, top, right, bottom): the median of each row's and
    column's first and last solid pixel, so the vines' leaves sticking out don't count."""
    solid = pixels[..., 3] > 0.5
    rows = solid[solid.any(axis=1)]
    cols = solid[:, solid.any(axis=0)].T
    left = np.median([np.argmax(r) for r in rows])
    right = np.median([len(r) - np.argmax(r[::-1]) for r in rows])
    top = np.median([np.argmax(c) for c in cols])
    bottom = np.median([len(c) - np.argmax(c[::-1]) for c in cols])
    return left, top, right, bottom


def moved(pixels, scale, dx, dy):
    """The frame scaled by `scale` and moved by (dx, dy) on a SIZE x SIZE square, premultiplied so
    see-through pixels don't bleed their colour into the edges."""
    premultiplied = pixels.copy()
    premultiplied[..., :3] *= premultiplied[..., 3:]
    source = oiio.ImageBuf(oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), np.ascontiguousarray(premultiplied))
    matrix = (scale, 0, 0, 0, scale, 0, dx, dy, 1)
    warped = oiio.ImageBufAlgo.warp(
        source, matrix, filtername='lanczos3', wrap='black', roi=oiio.ROI(0, SIZE, 0, SIZE, 0, 1, 0, 4)
    )
    out = np.clip(warped.get_pixels(oiio.FLOAT), 0, 1)
    alpha = out[..., 3:]
    out[..., :3] = np.where(alpha > 0, out[..., :3] / np.maximum(alpha, 1e-6), 0)
    out[out[..., 3] < 1 / 255] = 0
    return out


def write_sheet(name, frames):
    rows = -(-len(frames) // COLUMNS)
    width = COLUMNS * SIZE + (COLUMNS - 1) * GAP
    height = rows * SIZE + (rows - 1) * GAP
    sheet = np.zeros((height, width, 4), np.float32)
    atlas = {}
    for i, frame in enumerate(frames):
        x = (i % COLUMNS) * (SIZE + GAP)
        y = (i // COLUMNS) * (SIZE + GAP)
        sheet[y : y + SIZE, x : x + SIZE] = frame
        atlas[f'{name}_idle_{i:03d}'] = {
            'frame': {'x': x, 'y': y, 'w': SIZE, 'h': SIZE},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': SIZE, 'h': SIZE},
            'sourceSize': {'w': SIZE, 'h': SIZE},
        }

    image = f'{name}-idle.webp'
    spec = oiio.ImageSpec(width, height, 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', IDLE_COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), sheet)
    assert out.write(os.path.join(OUT, image), oiio.UINT8), out.geterror()
    meta = {'image': image, 'format': 'RGBA8888', 'size': {'w': width, 'h': height}, 'scale': '1'}
    with open(os.path.join(OUT, f'{name}-idle.json'), 'w') as file:
        json.dump({'frames': atlas, 'meta': meta}, file, indent='\t')
        file.write('\n')


os.makedirs(OUT, exist_ok=True)
for animation, name in SYMBOLS.items():
    sheet = read(os.path.join(SOURCE, f'{animation}_idle', 'export', f'{animation}_idle_sheet.png'))
    with open(os.path.join(SOURCE, f'{animation}_idle', 'export', f'{animation}_idle_sheet.json')) as file:
        atlas = json.load(file)
    frames = [
        sheet[f['frame']['y'] : f['frame']['y'] + f['frame']['h'], f['frame']['x'] : f['frame']['x'] + f['frame']['w']]
        for f in atlas['frames'].values()
    ]

    # the first frame's wooden frame onto the still's, the same for every frame (the frame holds still)
    left, top, right, bottom = frame_edges(frames[0])
    still_left, still_top, still_right, still_bottom = frame_edges(read(os.path.join(STILLS, f'{name}.webp')))
    scale = ((still_right - still_left) / (right - left) + (still_bottom - still_top) / (bottom - top)) / 2
    dx = (still_left + still_right) / 2 - scale * (left + right) / 2
    dy = (still_top + still_bottom) / 2 - scale * (top + bottom) / 2

    write_sheet(name, [moved(frame, scale, dx, dy) for frame in frames])
    print(f'{name}: {len(frames)} frames, x {scale:.4f} moved {dx:.1f}, {dy:.1f}')
