"""Renders the fox's animations and packs them into static/assets/sprites/fox.

The idle is the animation kettuO.blend's fox plays. The gust is kettu.blend's, blended in from the
idle's first pose and back out to it, so the game can go from either one to the other without a jump.

Run from apps/my-cluster-game with Blender, which comes with numpy and OpenImageIO:
    blender -b -Y art-source/kettuO.blend -S "Fox Sprite" --python art-source/fox-sheet.py
"""

import json
import math
import os
import tempfile
from collections import deque

import bpy
import numpy as np
import OpenImageIO as oiio
from mathutils import Quaternion, Vector
from OpenImageIO import ImageBufAlgo

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, '..', 'static', 'assets', 'sprites', 'fox')

# the gust's action and the file it comes from (the rig is the same in both files)
GUST_FILE = os.path.join(HERE, 'kettu.blend')
GUST_ACTION = 'WindIdle'
# frames over which the gust blends in from the idle's first pose, and back out to it
GUST_BLEND = 12

# the frames are 3/8 of the render: about as big as the fox shows on a 1080p screen, and small
# enough that each animation fits in one sheet under 4096 px wide, 8 to a row
SCALE = 3 / 8
# the frame is a whole number of these render pixels, so it and its paws land on whole pixels
STEP = 8
COLUMNS = 8
MAX_SHEET = 4096
# clear pixels between frames, so none bleeds into the next when the sheet is filtered
GAP = 2

# the outline and shadow the still fox had, in the render's pixels (fox-plain.webp sits at 116, 84
# in it): a dark brown outline, so it stands out from the orange scene, and a soft shadow under the
# paws, of the same brown
DARK = np.array([0x3A, 0x16, 0x06], np.float32) / 255
OUTLINE = 9
SHADOW = {'x': 116 + 470, 'y': 84 + 985, 'rx': 470, 'ry': 40, 'blur': 16, 'opacity': 0.45}
# haze fainter than this (stray pixels of the cut-out pieces) is cleared, so it gets no outline
HAZE = 16 / 255
# room around the render for the outline and shadow
PAD = 64
# around the outline and shadow, and how faint the shadow's edge is where the frame cuts it
MARGIN = 2
SHADOW_CUT = 2 / 255

# the eyes, for the blink the game draws over them (src/game/foxEyes.ts, see Fox.svelte): the two
# biggest dark patches (outline and iris) about the face, in the render's pixels, with the whites
# and glints inside them
EYES_FILE = os.path.join(HERE, '..', 'src', 'game', 'foxEyes.ts')
EYE_AREA = (120, 260, 640, 540)
EYE_DARK = 85
EYE_BRIGHT = 170
# an eye's outline reaches this far beyond it (for its soft edge), has a point this often, and
# leaves out its thin ends (the tips of its dark rim) and the lid's edge is this wide
EYE_GROW = 1.5
EYE_STEP = 6
EYE_MIN_HEIGHT = 10
EYE_LINE = 6

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)
CHANNELS = ('location', 'rotation_quaternion', 'scale')
LUMINANCE = np.array([0.299, 0.587, 0.114], np.float32) * 255


def pose_at(rig, action, frame):
    """Each bone's location, rotation and scale in the action at the frame, at rest where not keyed."""
    pose = {bone.name: (Vector((0, 0, 0)), Quaternion(), Vector((1, 1, 1))) for bone in rig.pose.bones}
    curves = action.layers[0].strips[0].channelbag(action.slots[0]).fcurves
    for curve in curves:
        bone = curve.data_path.split('"')[1]
        channel = CHANNELS.index(curve.data_path.rsplit('.', 1)[1])
        pose[bone][channel][curve.array_index] = curve.evaluate(frame)
    return pose


def blend(a, b, weight):
    return {
        name: (
            a[name][0].lerp(b[name][0], weight),
            a[name][1].normalized().slerp(b[name][1].normalized(), weight),
            a[name][2].lerp(b[name][2], weight),
        )
        for name in a
    }


def gust_weight(index, count):
    """How much of the gust shows in its frame: easing in over the first frames and out over the last,
    so the frames before and after it would be the idle's first pose."""
    t = min(1, min(index + 1, count - index) / GUST_BLEND)
    return t * t * (3 - 2 * t)


def render_poses(rig, poses):
    scene = bpy.context.scene
    directory = tempfile.mkdtemp(prefix='fox-frames-')
    # posed by hand, not by an action
    rig.animation_data.action = None
    paths = []
    for i, pose in enumerate(poses):
        for name, (location, rotation, scale) in pose.items():
            bone = rig.pose.bones[name]
            bone.location, bone.rotation_quaternion, bone.scale = location, rotation, scale
        scene.render.filepath = os.path.join(directory, f'f_{i:03d}.png')
        bpy.ops.render.render(write_still=True)
        paths.append(scene.render.filepath)
    return paths


def load(path):
    pixels = oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)
    pixels = np.pad(pixels, ((PAD, PAD), (PAD, PAD), (0, 0)))
    pixels[pixels[..., 3] < HAZE] = 0
    return pixels


def shadow_alpha(height, width):
    ys = np.arange(height, dtype=np.float32)[:, None] + 0.5 - (SHADOW['y'] + PAD)
    xs = np.arange(width, dtype=np.float32)[None, :] + 0.5 - (SHADOW['x'] + PAD)
    ellipse = ((xs / SHADOW['rx']) ** 2 + (ys / SHADOW['ry']) ** 2 <= 1).astype(np.float32)
    sigma = SHADOW['blur']
    t = np.arange(-3 * sigma, 3 * sigma + 1, dtype=np.float32)
    kernel = np.exp(-t * t / (2 * sigma * sigma))
    kernel /= kernel.sum()
    blurred = np.apply_along_axis(np.convolve, 1, ellipse, kernel, 'same')
    blurred = np.apply_along_axis(np.convolve, 0, blurred, kernel, 'same')
    return blurred * SHADOW['opacity']


def dilate(alpha, radius):
    """The alpha grown by a disc, which is how far the outline reaches."""
    height, width = alpha.shape
    padded = np.pad(alpha, radius)
    out = alpha.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy <= radius * radius + radius:
                window = padded[radius + dy : radius + dy + height, radius + dx : radius + dx + width]
                np.maximum(out, window, out=out)
    return out


def compose(fox, shadow):
    """The fox over its outline over the shadow, premultiplied."""
    alpha = fox[..., 3]
    under = dilate(alpha, OUTLINE)
    under = under + shadow * (1 - under)
    out = np.empty_like(fox)
    out[..., 3] = alpha + under * (1 - alpha)
    out[..., :3] = fox[..., :3] * alpha[..., None] + DARK * (under * (1 - alpha))[..., None]
    return out


def bounds(mask):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def shrink(pixels, width, height):
    buf = oiio.ImageBuf(oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT))
    buf.set_pixels(oiio.ROI(), np.ascontiguousarray(pixels))
    small = ImageBufAlgo.resize(buf, roi=oiio.ROI(0, width, 0, height, 0, 1, 0, 4)).get_pixels(oiio.FLOAT)
    small[..., 3] = np.clip(small[..., 3], 0, 1)
    small[..., :3] = np.clip(small[..., :3], 0, small[..., 3:4])
    return small


def frame_box(paths, shadow):
    """One frame for every animation, so they line up: the fox in each frame, its outline and the
    shadow (the frames are read again when drawn, as all of them at once is too much memory)."""
    fox_bounds = []
    paws = 0
    for path in paths:
        alpha = load(path)[..., 3]
        fox_bounds.append(bounds(alpha > 0))
        # the paws are the lowest solid part of the fox
        paws = max(paws, bounds(alpha > 0.5)[3])
    shadow_bounds = bounds(shadow >= SHADOW_CUT)
    left = min(min(b[0] for b in fox_bounds) - OUTLINE, shadow_bounds[0]) - MARGIN
    top = min(min(b[1] for b in fox_bounds) - OUTLINE, shadow_bounds[1]) - MARGIN
    right = max(max(b[2] for b in fox_bounds) + OUTLINE, shadow_bounds[2]) + MARGIN
    bottom = max(max(b[3] for b in fox_bounds) + OUTLINE, shadow_bounds[3]) + MARGIN
    # the frame grows out from the paws in whole steps
    top = paws - math.ceil((paws - top) / STEP) * STEP
    bottom = paws + math.ceil((bottom - paws) / STEP) * STEP
    right = left + math.ceil((right - left) / STEP) * STEP
    return left, top, right, bottom, paws


def write_sheet(name, paths, box, shadow):
    left, top, right, bottom, _ = box
    cell_w = round((right - left) * SCALE)
    cell_h = round((bottom - top) * SCALE)
    rows = math.ceil(len(paths) / COLUMNS)
    sheet_w = COLUMNS * cell_w + (COLUMNS - 1) * GAP
    sheet_h = rows * cell_h + (rows - 1) * GAP
    assert sheet_w <= MAX_SHEET and sheet_h <= MAX_SHEET, (sheet_w, sheet_h)

    sheet = np.zeros((sheet_h, sheet_w, 4), np.float32)
    atlas = {}
    for i, path in enumerate(paths):
        composed = compose(load(path), shadow)[top:bottom, left:right]
        x = (i % COLUMNS) * (cell_w + GAP)
        y = (i // COLUMNS) * (cell_h + GAP)
        sheet[y : y + cell_h, x : x + cell_w] = shrink(composed, cell_w, cell_h)
        atlas[f'fox_{name}_{i:02d}'] = {
            'frame': {'x': x, 'y': y, 'w': cell_w, 'h': cell_h},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': cell_w, 'h': cell_h},
            'sourceSize': {'w': cell_w, 'h': cell_h},
        }

    image = f'fox-{name}.webp'
    out = oiio.ImageBuf(oiio.ImageSpec(sheet_w, sheet_h, 4, oiio.FLOAT))
    out.set_pixels(oiio.ROI(), sheet)
    out.specmod().attribute('compression', 'webp:90')
    assert out.write(os.path.join(OUT_DIR, image), oiio.UINT8), out.geterror()
    meta = {'image': image, 'format': 'RGBA8888', 'size': {'w': sheet_w, 'h': sheet_h}, 'scale': '1'}
    with open(os.path.join(OUT_DIR, f'fox-{name}.json'), 'w') as file:
        json.dump({'frames': atlas, 'meta': meta}, file, indent='\t')
        file.write('\n')
    print(f'FOX {name}: {len(paths)} frames of {cell_w} x {cell_h} in a {sheet_w} x {sheet_h} sheet')
    return cell_w, cell_h


def label(mask):
    labels = np.zeros(mask.shape, np.int32)
    count = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if labels[y0, x0]:
            continue
        count += 1
        labels[y0, x0] = count
        queue = deque([(y0, x0)])
        while queue:
            y, x = queue.popleft()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = count
                    queue.append((ny, nx))
    return labels


def find_eyes(fox):
    """The eyes, left first: each one's centre, its top and bottom in each column it covers, and the
    pixels of its dark outline and iris, in the padded render's pixels."""
    x0, y0, x1, y1 = (v + PAD for v in EYE_AREA)
    area = fox[y0:y1, x0:x1]
    luminance = area[..., :3] @ LUMINANCE
    labels = label((luminance < EYE_DARK) & (area[..., 3] > 0.5))
    sizes = np.bincount(labels.ravel())[1:]
    eyes = []
    for k in np.argsort(sizes)[::-1][:2] + 1:
        dark = labels == k
        ys, xs = np.nonzero(dark)
        bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        eye = dark.copy()
        eye[by0:by1, bx0:bx1] |= luminance[by0:by1, bx0:bx1] > EYE_BRIGHT
        columns = []
        for x in range(bx0, bx1):
            rows = np.nonzero(eye[by0:by1, x])[0]
            if len(rows):
                columns.append((x + x0 + 0.5, rows.min() + by0 + y0 - EYE_GROW, rows.max() + 1 + by0 + y0 + EYE_GROW))
        eyes.append({
            'centre': ((bx0 + bx1) / 2 + x0, (by0 + by1) / 2 + y0),
            'columns': np.array(columns),
            'dark': area[..., :3][dark],
        })
    return sorted(eyes, key=lambda eye: eye['centre'][0])


def eye_outline(columns):
    """Points across the eye (x, top, bottom), smoothed, without its thin ends."""
    tall = np.nonzero(columns[:, 2] - columns[:, 1] >= EYE_MIN_HEIGHT + 2 * EYE_GROW)[0]
    columns = columns[tall[0] : tall[-1] + 1].copy()
    for i in (1, 2):
        padded = np.pad(columns[:, i], 2, mode='edge')
        columns[:, i] = np.convolve(padded, np.ones(5) / 5, 'valid')
    picks = list(range(0, len(columns), EYE_STEP))
    if picks[-1] != len(columns) - 1:
        picks.append(len(columns) - 1)
    return columns[picks]


def write_eyes(rendered, box):
    """The eyes in each frame, as src/game/foxEyes.ts, in the frames' pixels."""
    left, top = box[0], box[1]
    found = {name: [find_eyes(load(path)) for path in paths] for name, paths in rendered.items()}
    first = rendered['idle'][0]
    base = found['idle'][0]
    fox = load(first)

    def frame_point(x, y):
        return round((x - left) * SCALE, 1), round((y - top) * SCALE, 1)

    def colour(pixels):
        return '0x' + ''.join(f'{round(v * 255):02x}' for v in np.median(pixels, axis=0))

    eyes = []
    for eye in base:
        outline = eye_outline(eye['columns'])
        middle = eye['columns'][len(eye['columns']) // 4 : 3 * len(eye['columns']) // 4]
        above = [fox[int(y_top) - d, int(x), :3] for x, y_top, _ in middle for d in range(2, 6)]
        below = [fox[int(y_bottom) + d, int(x), :3] for x, _, y_bottom in middle for d in range(1, 5)]
        points = []
        for x, y_top, y_bottom in outline:
            fx, ftop = frame_point(x, y_top)
            points.append(f'[{fx}, {ftop}, {frame_point(x, y_bottom)[1]}]')
        eyes.append((points, colour(above), colour(below)))
    dark = np.concatenate([eye['dark'] for eye in base])
    line = colour(dark[dark @ LUMINANCE < 50])

    offsets = {
        name: [
            [round(float(np.mean([e['centre'][i] - b['centre'][i] for e, b in zip(frame, base)])) * SCALE, 1) for i in (0, 1)]
            for frame in frames
        ]
        for name, frames in found.items()
    }

    out = [
        '// Made by art-source/fox-sheet.py: the fox\'s eyes, for the blink drawn over them (see Fox.svelte),',
        '// in the pixels of its frames.',
        'export const FOX_EYES = {',
        '\t// each eye, left first: its top and bottom at points across it, in the first idle frame, and the',
        '\t// colour of the fur just above and below it',
        '\teyes: [',
    ]
    for points, above, below in eyes:
        out += ['\t\t{', '\t\t\toutline: [', *[f'\t\t\t\t{p},' for p in points], '\t\t\t],']
        out += [f'\t\t\tabove: {above},', f'\t\t\tbelow: {below},', '\t\t},']
    out += [
        '\t],',
        '\t// the dark of their outlines, for the edges of the lids, and how wide those are',
        f'\tline: {line},',
        f'\tlineWidth: {round(EYE_LINE * SCALE, 2)},',
        '\t// how far the eyes are from where they are in the first idle frame, in each frame',
        '\toffsets: {',
    ]
    for name, pairs in offsets.items():
        rows = [', '.join(f'[{dx}, {dy}]' for dx, dy in pairs[i : i + 8]) for i in range(0, len(pairs), 8)]
        out += [f'\t\t{name}: [', *[f'\t\t\t{row},' for row in rows], '\t\t],']
    out += ['\t},', '};', '']
    with open(EYES_FILE, 'w', newline='\n') as file:
        file.write('\n'.join(out))
    most = max(abs(v) for pairs in offsets.values() for pair in pairs for v in pair)
    print(f'FOX eyes: {len(eyes[0][0])} and {len(eyes[1][0])} outline points, moving at most {most} px')


def main():
    scene = bpy.context.scene
    assert scene.name == 'Fox Sprite', scene.name
    render = scene.render
    render.film_transparent = True
    render.image_settings.file_format = 'PNG'
    render.image_settings.color_mode = 'RGBA'
    render.image_settings.color_depth = '8'

    rig = bpy.data.objects['FoxRig']
    idle = rig.animation_data.action
    with bpy.data.libraries.load(GUST_FILE) as (_, loaded):
        loaded.actions = [GUST_ACTION]
    gust = loaded.actions[0]

    idle_frames = range(round(idle.frame_range[0]), round(idle.frame_range[1]) + 1)
    gust_frames = range(round(gust.frame_range[0]), round(gust.frame_range[1]) + 1)
    rest = pose_at(rig, idle, idle_frames[0])
    poses = {
        'idle': [pose_at(rig, idle, frame) for frame in idle_frames],
        'gust': [
            blend(rest, pose_at(rig, gust, frame), gust_weight(i, len(gust_frames)))
            for i, frame in enumerate(gust_frames)
        ],
    }
    rendered = {name: render_poses(rig, frames) for name, frames in poses.items()}

    height, width = load(rendered['idle'][0]).shape[:2]
    shadow = shadow_alpha(height, width)
    box = frame_box([path for paths in rendered.values() for path in paths], shadow)
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, paths in rendered.items():
        cell_w, cell_h = write_sheet(name, paths, box, shadow)
    write_eyes(rendered, box)
    left, top, right, bottom, paws = box
    print(f'FOX {render.fps / render.fps_base:g} fps, paws {round((paws - top) * SCALE)} down the {cell_w} x {cell_h} frame')
    print(f'FOX render crop {left - PAD},{top - PAD} to {right - PAD},{bottom - PAD}; frames in {os.path.dirname(rendered["idle"][0])} and {os.path.dirname(rendered["gust"][0])}')


main()
