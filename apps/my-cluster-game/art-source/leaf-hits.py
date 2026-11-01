"""Draws the low symbols' (L1 to L4, the leaves) hits in static/assets/sprites/symbolHits for the game.

- the user's animations, made in Blender: "<blender stuff>/folders/leaf_<colour>_hit/frames/
  leaf_<colour>_hit_0001.png" to _0090 (or in "<blender stuff>/leaf_<colour>_hit"), 90 frames of
  1600 x 1600 at 60 fps played once (1.5 s): the leaf, drawn at its art's 1254 px in the middle,
  comes up toward you and settles back, starting and ending at rest; the .blend files are at the
  top of "<blender stuff>"
- static/assets/sprites/symbolHits/leaf-<colour>-hit.{webp,json}: each frame made as the leaf's
  still is (symbol-stills.py: mirrored where its art is, its thick outline cut away and drawn again
  thin, less saturated where its still is) and moved and scaled as the still's art is, the same for
  every frame (from the first), on a square OUT_SCALE times the still's, so the leaf has room to
  grow toward you: the game draws it that much bigger than a cell, centred on it, and its first frame
  lies on the still. Packed 10 to a row with a gap between frames, WebP (COMPRESSION).

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/leaf-hits.py ["<blender stuff folder>"]
"""

import importlib.util
import json
import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('symbol_stills', os.path.join(HERE, 'symbol-stills.py'))
stills = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stills)

OUT = os.path.join(HERE, '..', 'static', 'assets', 'sprites', 'symbolHits')
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'blender stuff')
# the animation's colour in the Blender folder, and the still's (and the game's) name for the leaf
LEAVES = {'green': 'leaf-green', 'brown': 'leaf-brown', 'red': 'leaf-red', 'yellow': 'leaf-yellow'}
# art-source/leaf-green.webp is the user's PNG mirrored, so its tip points left (see README.md)
MIRRORED = {'leaf-green'}
# the frames: the art's size in the middle of them
ART = 1254
OUT_SCALE = 1.25
COLUMNS = 10
GAP = 2
COMPRESSION = 'webp:90'


def frames_folder(colour):
    folder = os.path.join(SOURCE, f'leaf_{colour}_hit')
    if not os.path.isdir(folder):
        folder = os.path.join(SOURCE, 'folders', f'leaf_{colour}_hit')
    return os.path.join(folder, 'frames')


def cut(pixels, depth, saturation):
    """The leaf without its outline (as its still, cut up to `depth` px deep), its colours as the
    still's, and the outline's colour; cropped to the leaf, with where the crop starts."""
    ys, xs = np.nonzero(pixels[..., 3] > 0)
    top, left = max(ys.min() - 2, 0), max(xs.min() - 2, 0)
    pixels = pixels[top : ys.max() + 3, left : xs.max() + 3]
    stills.LEAF_OUTLINE = {**stills.LEAF_OUTLINE, 'depth': depth}
    pixels, colour = stills.leaf_without_outline(pixels)
    pixels[..., :3] = stills.saturated(pixels[..., :3], saturation)
    return pixels, stills.saturated(colour, saturation), (left, top)


def warp(pixels, sx, sy, dx, dy, size):
    """`pixels` scaled by (sx, sy) and moved by (dx, dy) onto a `size` square, premultiplied so
    see-through pixels don't bleed their colour into the edges."""
    premultiplied = pixels.copy()
    premultiplied[..., :3] *= premultiplied[..., 3:]
    source = oiio.ImageBuf(oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), np.ascontiguousarray(premultiplied))
    matrix = (sx, 0, 0, 0, sy, 0, dx, dy, 1)
    warped = oiio.ImageBufAlgo.warp(
        source, matrix, filtername='lanczos3', wrap='black', roi=oiio.ROI(0, size, 0, size, 0, 1, 0, 4)
    )
    out = np.clip(warped.get_pixels(oiio.FLOAT), 0, 1)
    alpha = out[..., 3:]
    out[..., :3] = np.where(alpha > 0, out[..., :3] / np.maximum(alpha, 1e-6), 0)
    out[out[..., 3] < 1 / 255] = 0
    return out


def write_sheet(name, frames, size):
    rows = -(-len(frames) // COLUMNS)
    width = COLUMNS * size + (COLUMNS - 1) * GAP
    height = rows * size + (rows - 1) * GAP
    sheet = np.zeros((height, width, 4), np.float32)
    atlas = {}
    for i, frame in enumerate(frames):
        x = (i % COLUMNS) * (size + GAP)
        y = (i // COLUMNS) * (size + GAP)
        sheet[y : y + size, x : x + size] = frame
        atlas[f'{name}_hit_{i:03d}'] = {
            'frame': {'x': x, 'y': y, 'w': size, 'h': size},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': size, 'h': size},
            'sourceSize': {'w': size, 'h': size},
        }
    os.makedirs(OUT, exist_ok=True)
    image = f'{name}-hit.webp'
    spec = oiio.ImageSpec(width, height, 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), sheet)
    assert out.write(os.path.join(OUT, image), oiio.UINT8), out.geterror()
    meta = {'image': image, 'format': 'RGBA8888', 'size': {'w': width, 'h': height}, 'scale': '1'}
    with open(os.path.join(OUT, f'{name}-hit.json'), 'w') as file:
        json.dump({'frames': atlas, 'meta': meta}, file, indent='\t')
        file.write('\n')


size = round(stills.SIZE * OUT_SCALE)
pad = (size - stills.SIZE) / 2
depth = stills.LEAF_OUTLINE['depth']
for colour, name in LEAVES.items():
    folder = frames_folder(colour)
    paths = sorted(os.path.join(folder, f) for f in os.listdir(folder) if f.endswith('.png'))
    saturation = stills.LEAF_SATURATION.get(name, 1)

    def load(path):
        pixels = stills.read(path)
        return pixels[:, ::-1].copy() if name in MIRRORED else pixels

    # the first frame, the leaf at rest, placed as the still places its art (see stills.leaf)
    first = load(paths[0])
    rest_area = (first[..., 3] > 0.5).sum()
    pixels, line_colour, (left, top) = cut(first, depth, saturation)
    ys, xs = np.nonzero(pixels[..., 3] > 0)
    art_w, art_h = xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min()
    scale = (stills.SIZE * stills.LEAF_FILL - stills.LEAF_LINE * 2) / max(art_w, art_h)
    width, height = round(art_w * scale), round(art_h * scale)
    sx, sy = width / art_w, height / art_h
    # where the art's corner goes, in the frame's pixels and on the square
    corner = (left + xs.min(), top + ys.min())
    place = (pad + (stills.SIZE - width) // 2, pad + (stills.SIZE - height) // 2)

    frames = []
    for i, path in enumerate(paths):
        frame = load(path)
        # the outline is as much thicker as the leaf has grown toward you
        grown = np.sqrt((frame[..., 3] > 0.5).sum() / rest_area)
        pixels, _, (left, top) = cut(frame, round(depth * max(1, grown)), saturation)
        dx = place[0] - (corner[0] - left) * sx
        dy = place[1] - (corner[1] - top) * sy
        leaf = warp(pixels, sx, sy, dx, dy, size)
        line = np.zeros_like(leaf)
        line[..., :3] = line_colour
        line[..., 3] = stills.grow(leaf[..., 3], stills.LEAF_LINE)
        out = stills.over(leaf, line)
        out[out[..., 3] == 0, :3] = 0
        frames.append(out)
        if i % 15 == 0:
            print(f'{name}: frame {i + 1} of {len(paths)}', flush=True)

    write_sheet(name, frames, size)
    print(f'{name}: {len(frames)} frames of {size} px, x {sx:.4f} {sy:.4f}', flush=True)
