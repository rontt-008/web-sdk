"""Draws the rune symbols' (F, Fehu, and I, Ingwaz) land animations in static/assets/sprites for the game.

- the user's 2D cut-out animations, made in Blender, in "<blender stuff>" or "<blender stuff>/folders"
  (the .blend files are at the top of "<blender stuff>"): "<rune>_land/export/<rune>_land_sheet.png",
  90 frames of 256 x 256 at 60 fps played once (1.5 s), starting and ending on the symbol at rest.
  They are rendered from the same 1254 px art as the game's stills (static/assets/symbols/
  symbolrune.png, symbolrune2.png) and line up with them, so they are used as they are, no fitting.
- static/assets/sprites/symbolLands/<rune>-land.{webp,json}: packed 10 to a row with a gap between
  frames (so they don't bleed into each other when drawn smaller), WebP (COMPRESSION), as
  symbol-animations.py packs the high symbols' idles and hits.

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/rune-lands.py ["<blender stuff folder>"]
"""

import json
import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'static', 'assets', 'sprites', 'symbolLands')
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'blender stuff')
RUNES = ['fehu', 'ingwaz']
COLUMNS = 10
GAP = 2
# 90 doesn't break; lower WebP qualities have written all-black sheets through OpenImageIO
COMPRESSION = 'webp:90'

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def read_frames(rune):
    folder = f'{rune}_land'
    if not os.path.isdir(os.path.join(SOURCE, folder)):
        folder = os.path.join('folders', folder)
    export = os.path.join(SOURCE, folder, 'export')
    sheet = oiio.ImageBuf(os.path.join(export, f'{rune}_land_sheet.png'), 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)
    with open(os.path.join(export, f'{rune}_land_sheet.json')) as file:
        atlas = json.load(file)
    # in the order they play (the user's names number them)
    return [
        sheet[f['frame']['y'] : f['frame']['y'] + f['frame']['h'], f['frame']['x'] : f['frame']['x'] + f['frame']['w']]
        for _, f in sorted(atlas['frames'].items())
    ]


def write_sheet(rune, frames):
    size = frames[0].shape[0]
    rows = -(-len(frames) // COLUMNS)
    width = COLUMNS * size + (COLUMNS - 1) * GAP
    height = rows * size + (rows - 1) * GAP
    sheet = np.zeros((height, width, 4), np.float32)
    atlas = {}
    for i, frame in enumerate(frames):
        x = (i % COLUMNS) * (size + GAP)
        y = (i // COLUMNS) * (size + GAP)
        sheet[y : y + size, x : x + size] = frame
        atlas[f'{rune}_land_{i:03d}'] = {
            'frame': {'x': x, 'y': y, 'w': size, 'h': size},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': size, 'h': size},
            'sourceSize': {'w': size, 'h': size},
        }

    os.makedirs(OUT, exist_ok=True)
    image = f'{rune}-land.webp'
    spec = oiio.ImageSpec(width, height, 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), sheet)
    assert out.write(os.path.join(OUT, image), oiio.UINT8), out.geterror()
    meta = {'image': image, 'format': 'RGBA8888', 'size': {'w': width, 'h': height}, 'scale': '1'}
    with open(os.path.join(OUT, f'{rune}-land.json'), 'w') as file:
        json.dump({'frames': atlas, 'meta': meta}, file, indent='\t')
        file.write('\n')


for rune in RUNES:
    frames = read_frames(rune)
    write_sheet(rune, frames)
    print(f'{rune}: {len(frames)} land frames of {frames[0].shape[1]} x {frames[0].shape[0]}')
