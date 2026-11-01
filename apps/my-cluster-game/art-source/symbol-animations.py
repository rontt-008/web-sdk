"""Draws the high symbols' (H1 to H4) and the wild's (W) idle loops and hits in static/assets/sprites
for the game.

- the user's 2D cut-out animations, made in Blender, in "<blender stuff>" or "<blender stuff>/folders"
  (the .blend files, layers and scripts are in those folders too):
  - "<name>_idle/export/<name>_idle_sheet.png", 120 frames of 256 x 256 (the wild's 256 x 263) at
    30 fps that loop
  - "<name>_hit/export/<name>_hit_sheet.png", 60 frames of 256 x 256 (the wild's 256 x 263) at
    60 fps played once (1 s), starting and ending on the tile at rest; rendered with the same camera
    as the idle (without the folder only the idle is drawn)
- static/assets/sprites/symbolIdles/<still>-idle.{webp,json} and symbolHits/<still>-hit.{webp,json}:
  each frame moved and scaled (the same for all of a symbol's frames, idle and hit, premultiplied
  Lanczos) so the tile's wooden frame is where it is in the still (static/assets/symbols/<still>.webp,
  from symbol-stills.py): the game draws them all at the same size (TILE_SIZE) and can swap one for
  another without a jump. Packed 10 to a row with a gap between frames (so they don't bleed into
  each other when drawn smaller), WebP (COMPRESSION).

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/symbol-animations.py ["<blender stuff folder>"]
"""

import json
import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS = os.path.join(HERE, '..', 'static', 'assets', 'symbols')
SPRITES = os.path.join(HERE, '..', 'static', 'assets', 'sprites')
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'blender stuff')
# the animation's name in the Blender folder, and the still's (and the game's) name for the symbol
SYMBOLS = {
    'blueberry': 'blueberries',
    'runestone': 'runestone',
    'mushroom': 'mushroom',
    'acorn': 'acorn',
    # the whole symbol, its letters and runes moving (wild_idle is the same with only them)
    'wild_symbol': 'wild',
}
# an animation whose hit has a name of its own: the wild's is wild_hit
HITS = {'wild_symbol': 'wild'}
# each kind of animation: the folder the game's sheets go in
KINDS = {'idle': 'symbolIdles', 'hit': 'symbolHits'}

SIZE = 256
# room round the still's square, in its px, for a symbol whose animations reach past it (so they
# aren't cut off): the wild's hit swells about 11 px out on each side (14 with the resampling's
# soft edge), its idle's outline 2 px; the game draws its frames that much bigger (WILD_SHEET in
# src/game/constants.ts). (The tiles' frames, without room, touch their edges.)
ROOM = {'wild': 16}
COLUMNS = 10
GAP = 2
COMPRESSION = 'webp:90'

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


def moved(pixels, scale, dx, dy, size):
    """The frame scaled by `scale` and moved by (dx, dy) on a size x size square, premultiplied so
    see-through pixels don't bleed their colour into the edges."""
    premultiplied = pixels.copy()
    premultiplied[..., :3] *= premultiplied[..., 3:]
    source = oiio.ImageBuf(oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), np.ascontiguousarray(premultiplied))
    matrix = (scale, 0, 0, 0, scale, 0, dx, dy, 1)
    warped = oiio.ImageBufAlgo.warp(
        source, matrix, filtername='lanczos3', wrap='black', roi=oiio.ROI(0, size, 0, size, 0, 1, 0, 4)
    )
    out = np.clip(warped.get_pixels(oiio.FLOAT), 0, 1)
    alpha = out[..., 3:]
    out[..., :3] = np.where(alpha > 0, out[..., :3] / np.maximum(alpha, 1e-6), 0)
    out[out[..., 3] < 1 / 255] = 0
    return out


def write_sheet(name, kind, frames):
    size = frames[0].shape[0]
    # with room, nothing you could see cut off at a frame's edge (alpha 1/255 specks don't count)
    edges = [np.concatenate([f[0, :, 3], f[-1, :, 3], f[:, 0, 3], f[:, -1, 3]]).max() for f in frames]
    if name in ROOM and max(edges) > 1.5 / 255:
        print(f'{name} {kind}: frame {int(np.argmax(edges))} reaches its edge; give it more ROOM')
    rows = -(-len(frames) // COLUMNS)
    width = COLUMNS * size + (COLUMNS - 1) * GAP
    height = rows * size + (rows - 1) * GAP
    sheet = np.zeros((height, width, 4), np.float32)
    atlas = {}
    for i, frame in enumerate(frames):
        x = (i % COLUMNS) * (size + GAP)
        y = (i // COLUMNS) * (size + GAP)
        sheet[y : y + size, x : x + size] = frame
        atlas[f'{name}_{kind}_{i:03d}'] = {
            'frame': {'x': x, 'y': y, 'w': size, 'h': size},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': size, 'h': size},
            'sourceSize': {'w': size, 'h': size},
        }

    out_dir = os.path.join(SPRITES, KINDS[kind])
    os.makedirs(out_dir, exist_ok=True)
    image = f'{name}-{kind}.webp'
    spec = oiio.ImageSpec(width, height, 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), sheet)
    assert out.write(os.path.join(out_dir, image), oiio.UINT8), out.geterror()
    meta = {'image': image, 'format': 'RGBA8888', 'size': {'w': width, 'h': height}, 'scale': '1'}
    with open(os.path.join(out_dir, f'{name}-{kind}.json'), 'w') as file:
        json.dump({'frames': atlas, 'meta': meta}, file, indent='\t')
        file.write('\n')


def read_frames(animation, kind):
    """The frames of the user's sheet for this symbol and kind, in order (none without its folder)."""
    folder = f'{animation}_{kind}'
    if not os.path.isdir(os.path.join(SOURCE, folder)):
        folder = os.path.join('folders', folder)
    if not os.path.isdir(os.path.join(SOURCE, folder)):
        return []
    export = os.path.join(SOURCE, folder, 'export')
    sheet = read(os.path.join(export, f'{animation}_{kind}_sheet.png'))
    with open(os.path.join(export, f'{animation}_{kind}_sheet.json')) as file:
        atlas = json.load(file)
    return [
        sheet[f['frame']['y'] : f['frame']['y'] + f['frame']['h'], f['frame']['x'] : f['frame']['x'] + f['frame']['w']]
        for f in atlas['frames'].values()
    ]


for animation, name in SYMBOLS.items():
    idle = read_frames(animation, 'idle')
    hit = read_frames(HITS.get(animation, animation), 'hit')

    # the idle's first wooden frame onto the still's, the same for every frame of both (the frame
    # holds still, and the hit is rendered with the same camera)
    assert idle, f'{animation}: no idle'
    left, top, right, bottom = frame_edges(idle[0])
    if hit:
        hit_edges = frame_edges(hit[0])
        assert max(abs(a - b) for a, b in zip(hit_edges, (left, top, right, bottom))) <= 1, (
            f'{animation}: the hit is framed differently from the idle {hit_edges}'
        )
    still_left, still_top, still_right, still_bottom = frame_edges(read(os.path.join(STILLS, f'{name}.webp')))
    scale = ((still_right - still_left) / (right - left) + (still_bottom - still_top) / (bottom - top)) / 2
    room = ROOM.get(name, 0)
    dx = (still_left + still_right) / 2 - scale * (left + right) / 2 + room
    dy = (still_top + still_bottom) / 2 - scale * (top + bottom) / 2 + room
    size = SIZE + 2 * room

    write_sheet(name, 'idle', [moved(frame, scale, dx, dy, size) for frame in idle])
    if hit:
        write_sheet(name, 'hit', [moved(frame, scale, dx, dy, size) for frame in hit])
    print(f'{name}: {len(idle)} idle and {len(hit)} hit frames, x {scale:.4f} moved {dx:.1f}, {dy:.1f}')
