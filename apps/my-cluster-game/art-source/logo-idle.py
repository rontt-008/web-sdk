"""Draws the RuneFall logo's idle for the game from the user's Blender animation of it.

- the user's runefall_idle.blend (top level of "<blender stuff>"): the logo cut into a sign (the
  letters painted out) and its 8 letters, each its own object bobbing, rocking and swelling on a
  loop; the cut-out layers and layout.json (each letter's pivot) are in "<blender stuff>/runefall_idle"
  or "<blender stuff>/folders/runefall_idle"
- static/assets/sprites/logo/logo-idle.{webp,json}: the sign and the letters, cleaned like the other
  wooden art (wood-frames.py: haze under alpha 16 cleared, alpha 240+ made solid, EDGE_COLOUR under
  see-through pixels), the sign cropped as wood-frames.py cropped the whole logo (to the art with
  PAD px round it, so it is LOGO_ART in src/game/stateGame.svelte.ts), each letter to itself; packed
  GAP px apart, as the game mipmaps the logo (smoothTextures.ts) and the smaller copies would
  otherwise blur the pieces into each other
- src/game/logoIdle.ts: where each letter's pivot is on the sign, and its pose in each frame of the
  loop, sampled from the .blend, so the game (Logo.svelte) moves the letters itself, as sharp as the
  art at any size, rather than playing frames

Run from apps/my-cluster-game with Blender, the .blend open:
    "<Blender>/blender.exe" -b --disable-autoexec "<blender stuff>/runefall_idle.blend" --python-exit-code 1 --python art-source/logo-idle.py
"""

import json
import math
import os

import bpy
import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'static', 'assets', 'sprites', 'logo')
MODULE = os.path.join(HERE, '..', 'src', 'game', 'logoIdle.ts')
NAME = 'runefall_idle'
# Blender units per pixel of the art in the user's scene (its build_scene.py)
PX = 0.01

# as wood-frames.py
HAZE = 16 / 255
SOLID = 240 / 255
PAD = 4
EDGE_COLOUR = np.array([0x3A, 0x16, 0x06], np.float32) / 255
COMPRESSION = 'webp:90'
GAP = 16

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def read(path):
    return oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)


def clean(pixels):
    alpha = pixels[..., 3]
    alpha[alpha < HAZE] = 0
    alpha[alpha >= SOLID] = 1
    pixels[alpha == 0, :3] = EDGE_COLOUR
    return pixels


def bounds(alpha):
    """The art's left, top, right and bottom (exclusive), with PAD px round it."""
    ys, xs = np.nonzero(alpha > 0)
    return xs.min() - PAD, ys.min() - PAD, xs.max() + 1 + PAD, ys.max() + 1 + PAD


def cut(pixels, left, top, right, bottom):
    """That part of the picture, see-through where it reaches past the edge."""
    out = np.zeros((bottom - top, right - left, 4), np.float32)
    out[..., :3] = EDGE_COLOUR
    x0, y0 = max(left, 0), max(top, 0)
    x1, y1 = min(right, pixels.shape[1]), min(bottom, pixels.shape[0])
    out[y0 - top : y1 - top, x0 - left : x1 - left] = pixels[y0:y1, x0:x1]
    return out


def write_atlas(pieces):
    """The pieces (name, pixels) on one sheet: the first across the top, the rest in rows under it."""
    width = pieces[0][1].shape[1]
    places, x, y, row = [], 0, 0, 0
    for name, pixels in pieces:
        h, w = pixels.shape[:2]
        if x and x + w > width:
            x, y, row = 0, y + row + GAP, 0
        places.append((name, pixels, x, y))
        x, row = x + w + GAP, max(row, h)
    height = y + row
    width = max(x + p.shape[1] for _, p, x, _ in places)

    sheet = np.zeros((height, width, 4), np.float32)
    sheet[..., :3] = EDGE_COLOUR
    frames = {}
    for name, pixels, x, y in places:
        h, w = pixels.shape[:2]
        sheet[y : y + h, x : x + w] = pixels
        frames[name] = {
            'frame': {'x': x, 'y': y, 'w': w, 'h': h},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h},
            'sourceSize': {'w': w, 'h': h},
        }

    os.makedirs(OUT, exist_ok=True)
    spec = oiio.ImageSpec(width, height, 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), sheet)
    assert out.write(os.path.join(OUT, 'logo-idle.webp'), oiio.UINT8), out.geterror()
    meta = {'image': 'logo-idle.webp', 'format': 'RGBA8888', 'size': {'w': width, 'h': height}, 'scale': '1'}
    with open(os.path.join(OUT, 'logo-idle.json'), 'w') as file:
        json.dump({'frames': frames, 'meta': meta}, file, indent='\t')
        file.write('\n')
    return width, height


def channel(name, values, digits):
    """A channel's lines in the module: one number if it holds still, else one a frame, wrapped as
    Prettier would (tabs 2 wide, 100 columns)."""
    values = [round(v, digits) + 0.0 for v in values]
    if max(values) - min(values) < 10**-digits:
        return [f'\t\t\t{name}: {values[0]:g},']
    lines, line = [], ''
    for value in values:
        item = f'{value:g},'
        if line and 8 + len(line) + 1 + len(item) > 100:
            lines.append(f'\t\t\t\t{line}')
            line = ''
        line = f'{line} {item}' if line else item
    return [f'\t\t\t{name}: [', *lines, f'\t\t\t\t{line}', '\t\t\t],']


blend_folder = os.path.dirname(bpy.data.filepath)
folder = os.path.join(blend_folder, NAME)
if not os.path.isdir(folder):
    folder = os.path.join(blend_folder, 'folders', NAME)
with open(os.path.join(folder, 'layers', 'layout.json')) as file:
    layout = json.load(file)
art_width, art_height = layout['size']

sign = clean(read(os.path.join(folder, 'layers', 'sign.png')))
letters = [clean(read(os.path.join(folder, 'layers', f'{letter["layer"]}.png'))) for letter in layout['letters']]

# the whole logo's crop: the letters on the sign at rest, as wood-frames.py cropped the user's PNG
covered = 1 - (1 - sign[..., 3]) * np.prod([1 - letter[..., 3] for letter in letters], axis=0)
covered[covered < HAZE] = 0
left, top, right, bottom = bounds(covered)
pieces = [('logo-sign', cut(sign, left, top, right, bottom))]
placed = []
for letter, pixels in zip(layout['letters'], letters):
    l, t, r, b = bounds(pixels[..., 3])
    pieces.append((f'logo-{letter["name"]}', cut(pixels, l, t, r, b)))
    # its pivot on the sign, and where that is on its own piece (0 to 1)
    cx, cy = letter['center']
    placed.append((letter, cx - left, cy - top, (cx - l) / (r - l), (cy - t) / (b - t)))
sheet = write_atlas(pieces)

# each letter's pose in each frame: how far its pivot is from where it is at rest (art pixels, down
# is +), its tilt (clockwise, as the game's y points down) and its scale
scene = bpy.context.scene
objects = [bpy.data.objects[f'letter_{letter["name"]}'] for letter in layout['letters']]
frames = range(scene.frame_start, scene.frame_end + 1)
poses = [{'x': [], 'y': [], 'rotation': [], 'scaleX': [], 'scaleY': []} for _ in objects]
for frame in frames:
    scene.frame_set(frame)
    for letter, ob, pose in zip(layout['letters'], objects, poses):
        location, rotation, scale = ob.matrix_world.decompose()
        cx, cy = letter['center']
        pose['x'].append(location.x / PX + art_width / 2 - cx)
        pose['y'].append(art_height / 2 - location.y / PX - cy)
        pose['rotation'].append(-rotation.to_euler().z)
        pose['scaleX'].append(scale.x)
        pose['scaleY'].append(scale.y)

lines = [
    f'// The RuneFall logo\'s idle (Logo.svelte): written by art-source/logo-idle.py from the user\'s',
    f'// Blender animation ({NAME}.blend), don\'t change it here. The sign and each letter are in the',
    '// logoIdle atlas; each letter\'s pivot is at x, y on the sign (LOGO_ART pixels), anchor is where',
    '// that is on the letter, and in each frame of the loop its pivot is moveX, moveY from there,',
    '// tilted by rotation (clockwise) and scaled; a channel that holds still is one number.',
    'export const LOGO_IDLE = {',
    f'\tframeRate: {scene.render.fps / scene.render.fps_base:g},',
    f'\tframes: {len(frames)},',
    "\tsign: 'logo-sign',",
    '\tletters: [',
]
for (letter, x, y, ax, ay), pose in zip(placed, poses):
    lines += [
        '\t\t{',
        f"\t\t\tkey: 'logo-{letter['name']}',",
        f'\t\t\tx: {round(x, 2):g},',
        f'\t\t\ty: {round(y, 2):g},',
        f'\t\t\tanchor: {{ x: {round(ax, 4):g}, y: {round(ay, 4):g} }},',
        *channel('moveX', pose['x'], 2),
        *channel('moveY', pose['y'], 2),
        *channel('rotation', pose['rotation'], 5),
        *channel('scaleX', pose['scaleX'], 5),
        *channel('scaleY', pose['scaleY'], 5),
        '\t\t},',
    ]
lines += ['\t],', '};', '']
with open(MODULE, 'w', newline='\n') as file:
    file.write('\n'.join(lines))

print(f'logo: {right - left} x {bottom - top} (LOGO_ART), its crop at {left}, {top} of the layers')
print(f'atlas: {sheet[0]} x {sheet[1]}, {len(frames)} frames at {scene.render.fps} fps')
