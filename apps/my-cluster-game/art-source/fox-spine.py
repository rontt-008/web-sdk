"""Exports the fox's Spine-style animations (the user's mesh rig, made in <blender stuff>/folders/<name>)
as one Spine skeleton for the game (see Fox.svelte): the look-around (IDLE/kettu_look_around.blend),
played now and then between the idle loops, and the surprise (kettu_surprised.blend), played as a
bonus starts. As sprite sheets they would take well over 100 MB of GPU memory; as a skeleton they
are one small texture and keys.

- static/assets/spines/fox/fox.atlas + .webp: the drawing (the rig's texture) with the same dark
  outline the sprite frames have (fox-sheet.py: 9 px, #3a1606), and the same soft shadow under the
  paws, at the frames' 3/8 scale.
- static/assets/spines/fox/fox.json (Spine 4.2): the rig's bones (same names and parents, its root
  renamed `base`; the surprise's rig, whose eye bones the others leave at rest) under `root`, which
  puts the drawing where the sprite frames have it: 1 unit is 1 px of a frame, the origin the
  frames' anchor (FOX_ART in Fox.svelte: the middle, the paws), y up. The body is one weighted mesh,
  a coarser grid (CELL px) than the rig's 8 px one, each point weighted as the rig's mesh is there
  (its biggest bones), also over the outline round it. An animation for each of ANIMATIONS, keys
  sampled every frame and thinned where the motion is a straight line.

Each animation starts and ends bent onto the sprite idle's first frame (a deform, see ANIMATIONS'
ease), so the game switches between them and the idle without a jump.

Left out: the rig's shape keys (breathing swell, brows, cheeks: a few px, about 1.5 px as drawn in
the game) and its eyelids (the game blinks the fox itself, its lids following the `face` bone).

Run from apps/my-cluster-game with Blender (a minute or two):
    blender -b --factory-startup --python art-source/fox-spine.py -- ["<blender stuff folder>"]
"""

import json
import math
import sys
import os

import bpy
import numpy as np
import OpenImageIO as oiio
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'static', 'assets', 'spines', 'fox')
ARGS = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
SOURCE = next((a for a in ARGS if not a.startswith('--') and os.path.isdir(a)),
              os.path.join(os.path.expanduser('~'), 'Downloads', 'blender stuff'))
# the animations: the game's name for each, its .blend (in <blender stuff>, its IDLE folder or
# folders/<its name>) and how long its bend onto the sprite idle eases off at its start and back on
# at its end (seconds); the skeleton is SKELETON's rig (the surprise's has every bone the others do,
# and eye bones under the face which they leave at rest)
ANIMATIONS = {
    'look': {'blend': 'kettu_look_around.blend', 'ease': 0.7},
    'surprised': {'blend': 'kettu_surprised.blend', 'ease': 0.4},
}
SKELETON = 'surprised'
SPINE_VERSION = '4.2.40'

# the rig (scripts/rig.py there): px per Blender unit, the drawing's px at the world's origin (on
# the ground under the fox), and its canvas
PX = 100.0
ORIGIN = (672.0, 1100.0)
# the sprite frames (fox-sheet.py, Fox.svelte): their scale, where the rig's canvas lands in them
# (frame px = canvas px * SCALE + FRAME_OFFSET, found by matching the drawing on the idle's first
# frame) and their anchor (FOX_ART: half the width, the paws)
SCALE = 3 / 8
FRAME_OFFSET = (-12.5625, -38.4375)
ANCHOR = (501 / 2, 378.0)
# the mesh's grid, in canvas px; at most this many bones a point, none weighing less than this
CELL = 20
INFLUENCES = 4
MIN_WEIGHT = 0.01
# the outline and shadow, as fox-sheet.py draws them (its shadow sat at 470, 985 of fox-plain, which
# is at 60, 114 on the rig's canvas)
DARK = np.array([0x3A, 0x16, 0x06], np.float32) / 255
OUTLINE = 9
HAZE = 16 / 255
SHADOW = {'x': 60 + 470, 'y': 114 + 985, 'rx': 470, 'ry': 40, 'blur': 16, 'opacity': 0.45}
# how far a thinned key may stray: canvas px, degrees, scale
TOLERANCE = {'px': 0.08, 'degrees': 0.04, 'scale': 0.0005}
# The sprite frames' idle (kettuO.blend, its own cut-out rig) has the drawing a hair off where this
# rig has it at the look's first frame (the tail and ear tips, 1 to 2 px as drawn), so the look
# starts bent onto the idle's first frame, the bend easing off over its first seconds, and bends
# back onto it over its last (a deform on the mesh, see ANIMATIONS): the game switches between the two
# with nothing to see. Where the old rig has each point is found by running Blender on kettuO.blend
# too (this script with --old-rig, from main).
OLD_RIG = os.path.join(HERE, 'kettuO.blend')
OLD_SCENE = 'Fox Sprite'
# fox-plain.webp sits here in the old rig's render, and here on this rig's canvas
OLD_PLAIN = (116, 84)
NEW_PLAIN = (60, 114)
# points bent less than this (canvas px) are left out of the deform
BEND_MIN = 0.05
PAD = 8
COMPRESSION = 'webp:90'

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def affine(a, b, c, d, x, y):
    return np.array([[a, b, x], [c, d, y], [0, 0, 1.0]])


def decompose(m):
    """Spine's local transform (x, y, rotation, scaleX, scaleY, shearY) of a 2D affine."""
    a, b, c, d = m[0, 0], m[0, 1], m[1, 0], m[1, 1]
    rotation = math.degrees(math.atan2(c, a))
    shear = math.degrees(math.atan2(d, b)) - rotation - 90
    shear = (shear + 180) % 360 - 180
    return np.array([m[0, 2], m[1, 2], rotation, math.hypot(a, c), math.hypot(b, d), shear])


def rdp(times, values, tolerance):
    """The fewest keys whose straight lines stay within tolerance of every sample."""
    keep = {0, len(times) - 1}
    stack = [(0, len(times) - 1)]
    while stack:
        first, last = stack.pop()
        if last - first < 2:
            continue
        share = ((times[first + 1 : last] - times[first]) / (times[last] - times[first]))[:, None]
        line = values[first] + (values[last] - values[first]) * share
        error = np.abs(values[first + 1 : last] - line).max(axis=1)
        worst = int(np.argmax(error))
        if error[worst] > tolerance:
            middle = first + 1 + worst
            keep.add(middle)
            stack += [(first, middle), (middle, last)]
    return sorted(keep)


def keys(times, values, neutral, tolerance, fields):
    """A timeline's keys, or None when it never strays from neutral."""
    if np.abs(values - neutral).max() <= tolerance:
        return None
    out = []
    for i in rdp(times, values, tolerance):
        key = {'time': round(float(times[i]), 4)} if times[i] > 0 else {}
        key.update({field: round(float(value), 4) for field, value in zip(fields, values[i])})
        out.append(key)
    return out


def resize(pixels, width, height):
    """Lanczos, premultiplied so see-through pixels don't bleed their colour into the edges."""
    premultiplied = pixels.copy()
    premultiplied[..., :3] *= premultiplied[..., 3:]
    source = oiio.ImageBuf(oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), np.ascontiguousarray(premultiplied))
    resized = oiio.ImageBufAlgo.resize(source, filtername='lanczos3', roi=oiio.ROI(0, width, 0, height, 0, 1, 0, 4))
    out = np.clip(resized.get_pixels(oiio.FLOAT), 0, 1)
    alpha = out[..., 3:]
    out[..., :3] = np.where(alpha > 0, out[..., :3] / np.maximum(alpha, 1e-6), 0)
    return out


def dilate(alpha, radius):
    """The alpha grown by a disc (fox-sheet.py's outline)."""
    height, width = alpha.shape
    padded = np.pad(alpha, radius)
    out = alpha.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy <= radius * radius + radius:
                np.maximum(out, padded[radius + dy : radius + dy + height, radius + dx : radius + dx + width], out=out)
    return out


def blur(image, sigma):
    t = np.arange(-3 * sigma, 3 * sigma + 1, dtype=np.float32)
    kernel = np.exp(-t * t / (2 * sigma * sigma))
    kernel /= kernel.sum()
    out = np.apply_along_axis(np.convolve, 1, image, kernel, 'same')
    return np.apply_along_axis(np.convolve, 0, out, kernel, 'same')


def canvas_from_world(v):
    """A world point (the drawing lies in x, z) as canvas px (y down)."""
    return np.array([v[0] * PX + ORIGIN[0], ORIGIN[1] - v[2] * PX])


def rig_from_canvas(p):
    """Canvas px to the rig's own 2D space: px, origin ORIGIN, y up (the bones' space)."""
    return np.array([p[0] - ORIGIN[0], ORIGIN[1] - p[1]])


def bone_world(matrix, perpendicular):
    """A bone's matrix (Blender world) as a 2D affine in the rig's space: x along the bone (its Y),
    y its axis in the drawing's plane (perpendicular: which axis, and its sign)."""
    m = np.array(matrix)
    axis, sign = perpendicular
    along, across, head = m[:3, 1], m[:3, axis] * sign, m[:3, 3]
    return affine(along[0], across[0], along[2], across[2], head[0] * PX, head[2] * PX)


def old_rig(out):
    """In Blender on kettuO.blend (scene Fox Sprite): each piece, front to back: its mesh in the idle's
    first frame (what the sprite frames show) in this rig's canvas px, where each of its points is in
    its cut-out picture (px), its triangles, the picture, and the mesh at rest (canvas px, a first
    guess at where the picture was cut from the drawing). Saved to out."""
    scene = bpy.context.scene
    assert scene.name == OLD_SCENE, scene.name
    rig = bpy.data.objects['FoxRig']
    first = round(rig.animation_data.action.frame_range[0])
    camera = scene.camera
    width, height = scene.render.resolution_x, scene.render.resolution_y
    k = max(width, height) / camera.data.ortho_scale
    shift = np.array(NEW_PLAIN) - np.array(OLD_PLAIN)

    def canvas(obj):
        graph = bpy.context.evaluated_depsgraph_get()
        mesh = obj.evaluated_get(graph).to_mesh()
        world = np.array([tuple(obj.matrix_world @ v.co) for v in mesh.vertices])
        obj.evaluated_get(graph).to_mesh_clear()
        x = (world[:, 0] - camera.location.x) * k + width / 2
        y = height / 2 - (world[:, 2] - camera.location.z) * k
        return np.column_stack([x, y]) + shift

    pieces = sorted((o for o in scene.objects if o.type == 'MESH' and not o.hide_render),
                    key=lambda o: o.matrix_world.translation.y)
    saved = {}
    for i, obj in enumerate(pieces):
        mesh = obj.data
        image = next(n.image for m in mesh.materials if m and m.node_tree for n in m.node_tree.nodes
                     if n.type == 'TEX_IMAGE' and n.image)
        w, h = image.size
        pixels = np.empty(w * h * 4, np.float32)
        image.pixels.foreach_get(pixels)
        uv = np.zeros((len(mesh.loops), 2))
        mesh.uv_layers.active.data.foreach_get('uv', uv.ravel())
        vertex = np.zeros(len(mesh.loops), int)
        mesh.loops.foreach_get('vertex_index', vertex)
        texture = np.zeros((len(mesh.vertices), 2))
        texture[vertex] = uv * [w, h]
        texture[:, 1] = h - texture[:, 1]
        mesh.calc_loop_triangles()
        saved[f'texture{i}'] = texture
        saved[f'triangles{i}'] = np.array([tuple(t.vertices) for t in mesh.loop_triangles])
        saved[f'picture{i}'] = pixels.reshape(h, w, 4)[::-1]
    rig.data.pose_position = 'REST'
    scene.frame_set(first)
    for i, obj in enumerate(pieces):
        saved[f'rest{i}'] = canvas(obj)
    # posed as fox-sheet.py posed it for the sprite frames: every bone from the action's curves at the
    # frame, at rest where it has none (not as the file left them), the action itself taken off
    action = rig.animation_data.action
    curves = action.layers[0].strips[0].channelbag(action.slots[0]).fcurves
    channels = ('location', 'rotation_quaternion', 'scale')
    pose = {b.name: [Vector((0, 0, 0)), Quaternion(), Vector((1, 1, 1))] for b in rig.pose.bones}
    for curve in curves:
        bone = curve.data_path.split('"')[1]
        channel = channels.index(curve.data_path.rsplit('.', 1)[1])
        pose[bone][channel][curve.array_index] = curve.evaluate(first)
    rig.animation_data.action = None
    rig.data.pose_position = 'POSE'
    for name, (location, rotation, scale) in pose.items():
        bone = rig.pose.bones[name]
        bone.location, bone.rotation_quaternion, bone.scale = location, rotation, scale
    scene.frame_set(first)
    for i, obj in enumerate(pieces):
        saved[f'posed{i}'] = canvas(obj)
    np.savez(out, count=len(pieces), **saved)


def cut_from(picture, art, guess, search=24):
    """Where a piece's cut-out picture was cut from the drawing (art, canvas px): the whole px offset
    near the guess where its solid pixels match the drawing best."""
    ys, xs = np.nonzero(picture[..., 3] > 0.95)
    step = max(1, len(xs) // 6000)
    ys, xs = ys[::step], xs[::step]
    colour = picture[ys, xs, :3]
    best = None
    for dy in range(-search, search + 1):
        for dx in range(-search, search + 1):
            x, y = xs + round(guess[0]) + dx, ys + round(guess[1]) + dy
            ok = (x >= 0) & (y >= 0) & (x < art.shape[1]) & (y < art.shape[0])
            if ok.mean() < 0.9:
                continue
            error = np.abs(art[y[ok], x[ok], :3] - colour[ok]).mean() + (1 - art[y[ok], x[ok], 3]).mean()
            if best is None or error < best[0]:
                best = (error, round(guess[0]) + dx, round(guess[1]) + dy)
    return np.array(best[1:]), best[0]


def old_rig_moves(points, art):
    """Where the sprite frames' idle draws each point of the drawing (canvas px) in its first frame:
    followed through the frontmost piece of the old rig whose cut-out picture has it, by where that
    piece's mesh takes that spot of its picture (or the nearest piece, nearest spot)."""
    import subprocess
    import tempfile

    out = os.path.join(tempfile.mkdtemp(prefix='fox-old-rig-'), 'old.npz')
    subprocess.run([bpy.app.binary_path, '-b', '-Y', OLD_RIG, '-S', OLD_SCENE, '--python', os.path.abspath(__file__),
                    '--', '--old-rig', out], check=True, capture_output=True)
    data = np.load(out)
    pieces = []
    for i in range(int(data['count'])):
        texture, posed, triangles = data[f'texture{i}'], data[f'posed{i}'], data[f'triangles{i}']
        picture = data[f'picture{i}']
        guess = np.median(data[f'rest{i}'] - texture, axis=0)
        offset, error = cut_from(picture, art, guess)
        print(f'FOX old piece {i}: cut at {offset.tolist()} (rest put it at {np.round(guess, 1).tolist()}), '
              f'match {error * 255:.1f}')
        tree = BVHTree.FromPolygons([Vector((x, y, 0)) for x, y in texture],
                                    [tuple(int(v) for v in t) for t in triangles])
        pieces.append((texture, posed, triangles, tree, picture, offset))
    moved = np.empty_like(points)
    for k, point in enumerate(points):
        found = []
        for texture, posed, triangles, tree, picture, offset in pieces:
            spot = point - offset
            location, _, face, distance = tree.find_nearest(Vector((*spot, 0)))
            x, y = int(spot[0]), int(spot[1])
            solid = 0 <= x < picture.shape[1] and 0 <= y < picture.shape[0] and picture[y, x, 3] > 0.5
            found.append((distance, solid, spot, location, face, texture, posed, triangles))
        inside = [f for f in found if f[1] and f[0] < 0.5]
        distance, _, spot, location, face, texture, posed, triangles = (
            inside[0] if inside else min(found, key=lambda f: f[0]))
        corners = triangles[face]
        share = poly_3d_calc([Vector((*texture[c], 0)) for c in corners], location)
        moved[k] = sum(s * posed[c] for s, c in zip(share, corners)) + (spot - np.array(location[:2]))
    return moved


def find(blend):
    """A .blend in <blender stuff>, its IDLE folder or folders/<its name>."""
    stem = os.path.splitext(blend)[0]
    for folder in ('', 'IDLE', os.path.join('folders', stem)):
        path = os.path.join(SOURCE, folder, blend)
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f'{blend} not in {SOURCE}')


def open_blend(blend):
    bpy.ops.wm.open_mainfile(filepath=find(blend), load_ui=False)
    scene = bpy.context.scene
    rig = bpy.data.objects['KettuRig']
    body = bpy.data.objects['KettuBody']
    modifier = next(m for m in body.modifiers if m.type == 'ARMATURE')
    assert not modifier.use_deform_preserve_volume, 'dual quaternion skinning has no Spine match'
    image = next(n.image for n in body.data.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE')
    art = oiio.ImageBuf(bpy.path.abspath(image.filepath), 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)
    basis = body.data.shape_keys.key_blocks[0].data if body.data.shape_keys else body.data.vertices
    dense = np.array([canvas_from_world(body.matrix_world @ v.co) for v in basis])
    return scene, rig, body, art, dense


def main():
    os.makedirs(OUT, exist_ok=True)

    # ---- the skeleton's rig: its drawing, mesh, weights and bones
    scene, rig, body, art, dense = open_blend(ANIMATIONS[SKELETON]['blend'])
    height, width = art.shape[:2]

    # the texture: the drawing with the frames' outline, and the shadow
    alpha = art[..., 3].copy()
    alpha[alpha < HAZE] = 0
    under = dilate(alpha, OUTLINE)
    drawn = np.empty_like(art)
    drawn[..., 3] = alpha + under * (1 - alpha)
    premultiplied = art[..., :3] * alpha[..., None] + DARK * (under * (1 - alpha))[..., None]
    drawn[..., :3] = np.where(drawn[..., 3:] > 0, premultiplied / np.maximum(drawn[..., 3:], 1e-6), 0)

    # the mesh: grid cells over the drawing and its outline
    cols, rows = math.ceil(width / CELL), math.ceil(height / CELL)
    kept = np.zeros((rows, cols), bool)
    for j in range(rows):
        for i in range(cols):
            kept[j, i] = drawn[j * CELL : (j + 1) * CELL, i * CELL : (i + 1) * CELL, 3].max() > 1 / 255
    index = -np.ones((rows + 1, cols + 1), int)
    points = []
    triangles = []
    for j, i in zip(*np.nonzero(kept)):
        corners = []
        for dj, di in ((0, 0), (0, 1), (1, 1), (1, 0)):
            if index[j + dj, i + di] < 0:
                index[j + dj, i + di] = len(points)
                points.append((min((i + di) * CELL, width), min((j + dj) * CELL, height)))
            corners.append(index[j + dj, i + di])
        a, b, c, d = corners
        triangles += [a, b, c, a, c, d]
    points = np.array(points, np.float64)
    # the texture's piece: the cells' extent, so every point's uv is inside it
    js, is_ = np.nonzero(kept)
    crop = (int(is_.min()) * CELL, int(js.min()) * CELL, min((int(is_.max()) + 1) * CELL, width),
            min((int(js.max()) + 1) * CELL, height))
    piece_w, piece_h = crop[2] - crop[0], crop[3] - crop[1]
    tex_w, tex_h = round(piece_w * SCALE), round(piece_h * SCALE)
    body_pixels = resize(drawn[crop[1] : crop[3], crop[0] : crop[2]], tex_w, tex_h)
    uvs = (points - [crop[0], crop[1]]) / [piece_w, piece_h]

    sx, sy = SHADOW['rx'] + 3 * SHADOW['blur'], SHADOW['ry'] + 3 * SHADOW['blur']
    ys, xs = np.mgrid[-sy:sy, -sx:sx].astype(np.float32) + 0.5
    ellipse = ((xs / SHADOW['rx']) ** 2 + (ys / SHADOW['ry']) ** 2 <= 1).astype(np.float32)
    shadow = np.zeros((2 * sy, 2 * sx, 4), np.float32)
    shadow[..., :3] = DARK
    shadow[..., 3] = blur(ellipse, SHADOW['blur']) * SHADOW['opacity']
    shadow_w, shadow_h = round(2 * sx * SCALE), round(2 * sy * SCALE)
    shadow_pixels = resize(shadow, shadow_w, shadow_h)

    # the weights: the rig mesh's at each point (at rest), its biggest
    polygons = [tuple(p.vertices) for p in body.data.polygons]
    tree = BVHTree.FromPolygons([Vector((x, y, 0)) for x, y in dense], polygons)
    groups = [g.name for g in body.vertex_groups]
    dense_weights = np.zeros((len(dense), len(groups)))
    for v in body.data.vertices:
        for g in v.groups:
            dense_weights[v.index, g.group] = g.weight
    dense_weights /= np.maximum(dense_weights.sum(axis=1, keepdims=True), 1e-9)
    point_faces = []
    weights = np.zeros((len(points), len(groups)))
    for k, (x, y) in enumerate(points):
        location, _, face, _ = tree.find_nearest(Vector((x, y, 0)))
        corners = polygons[face]
        share = poly_3d_calc([Vector((*dense[c], 0)) for c in corners], location)
        weights[k] = sum(s * dense_weights[c] for s, c in zip(share, corners))
        point_faces.append((list(corners), share, np.array([x, y]) - np.array(location[:2])))

    # the bones: Spine's root places the rig's space on the frames, then the rig's own
    order = []
    while len(order) < len(rig.data.bones):
        order += [b for b in rig.data.bones if b not in order and (b.parent is None or b.parent in order)]
    parents = {b.name: (b.parent.name if b.parent else None) for b in order}
    lengths = {b.name: b.length * PX for b in order}
    order = [b.name for b in order]
    names = {name: ('base' if name == 'root' else name) for name in order}
    assert set(groups) <= set(names), set(groups) - set(names)
    # each bone's axis in the drawing's plane besides its length (X or Z), signed so it is a quarter
    # turn anticlockwise from it
    perpendicular = {}
    for name in order:
        m = np.array(rig.matrix_world @ rig.data.bones[name].matrix_local)
        along = np.array([m[0, 1], m[2, 1]])
        axis = 0 if math.hypot(m[0, 0], m[2, 0]) > math.hypot(m[0, 2], m[2, 2]) else 2
        across = np.array([m[0, axis], m[2, axis]])
        perpendicular[name] = (axis, 1 if along[0] * across[1] - along[1] * across[0] > 0 else -1)
    rest_worlds = {name: bone_world(rig.matrix_world @ rig.data.bones[name].matrix_local, perpendicular[name])
                   for name in order}
    inverse_rest = {name: np.linalg.inv(world) for name, world in rest_worlds.items()}
    setup = {}
    for name in order:
        parent = rest_worlds[parents[name]] if parents[name] else np.eye(3)
        setup[name] = decompose(np.linalg.inv(parent) @ rest_worlds[name])

    # each point's bones (its biggest, at most INFLUENCES) and their shares
    influences = []
    for k in range(len(points)):
        top = [g for g in np.argsort(weights[k])[::-1][:INFLUENCES] if weights[k][g] >= MIN_WEIGHT]
        total = sum(weights[k][g] for g in top)
        influences.append([(groups[g], weights[k][g] / total) for g in top])

    def skinned(k, worlds):
        point = np.array([*rig_from_canvas(points[k]), 1])
        return sum(share * (worlds[name] @ inverse_rest[name] @ point)[:2] for name, share in influences[k])

    # where the sprite frames' idle has each point in its first frame (old rig)
    targets = old_rig_moves(points, art)

    # ---- each animation, from its own .blend (the same rig; bones it lacks stay at rest on their parent)
    animations = {}
    for animation, spec in ANIMATIONS.items():
        scene, rig, body, other_art, other_dense = open_blend(spec['blend'])
        assert other_art.shape == art.shape and np.abs(other_art - art).max() < 2 / 255, f'{animation}: not the same drawing'
        assert other_dense.shape == dense.shape and np.abs(other_dense - dense).max() < 0.01, f'{animation}: not the same mesh'
        for name in order:
            if name in rig.data.bones:
                rest = bone_world(rig.matrix_world @ rig.data.bones[name].matrix_local, perpendicular[name])
                assert np.abs(rest - rest_worlds[name]).max() < 0.01, f'{animation}: {name} rests elsewhere'
        fps = scene.render.fps / scene.render.fps_base
        first, last = scene.frame_start, scene.frame_end
        duration = (last - first + 1) / fps

        def pose(frame):
            scene.frame_set(frame)
            worlds = {}
            for name in order:
                if name in rig.pose.bones:
                    worlds[name] = bone_world(rig.matrix_world @ rig.pose.bones[name].matrix, perpendicular[name])
                else:
                    parent = parents[name]
                    worlds[name] = worlds[parent] @ inverse_rest[parent] @ rest_worlds[name]
            locals_ = {}
            for name in order:
                parent = worlds[parents[name]] if parents[name] else np.eye(3)
                locals_[name] = decompose(np.linalg.inv(parent) @ worlds[name])
            return worlds, locals_

        frames = list(range(first, last + 2))
        times = np.array([(f - first) / fps for f in frames])
        samples = [pose(f) for f in frames]
        gap = max(np.abs(samples[-1][1][n][:3] - samples[0][1][n][:3]).max() for n in order)

        timelines = {}
        for name in order:
            values = np.array([s[1][name] for s in samples])
            rest = setup[name]
            rotation = np.degrees(np.unwrap(np.radians(values[:, 2] - rest[2])))
            bone = {}
            for timeline, vals, neutral, tolerance, fields in (
                ('translate', values[:, :2] - rest[:2], 0, TOLERANCE['px'], ('x', 'y')),
                ('rotate', rotation[:, None], 0, TOLERANCE['degrees'], ('value',)),
                ('scale', values[:, 3:5] / rest[3:5], 1, TOLERANCE['scale'], ('x', 'y')),
                ('shear', np.column_stack([np.zeros(len(values)), values[:, 5] - rest[5]]), 0, TOLERANCE['degrees'],
                 ('x', 'y')),
            ):
                made = keys(times, vals, neutral, tolerance, fields)
                if made:
                    bone[timeline] = made
            if bone:
                timelines[names[name]] = bone

        # its bend onto the sprite idle's first frame, at its start and at its end
        start, end = samples[0][0], samples[-1][0]
        bends_start = np.array([rig_from_canvas(targets[k]) - skinned(k, start) for k in range(len(points))])
        bends_end = np.array([rig_from_canvas(targets[k]) - skinned(k, end) for k in range(len(points))])

        # check: the mesh as Spine will move it against the rig's own (shape keys included)
        worst = []
        for frame in range(first, last + 1, max(1, (last - first) // 20)):
            worlds, _ = pose(frame)
            graph = bpy.context.evaluated_depsgraph_get()
            evaluated = body.evaluated_get(graph).to_mesh()
            moved = np.array([canvas_from_world(body.matrix_world @ v.co) for v in evaluated.vertices])
            body.evaluated_get(graph).to_mesh_clear()
            errors = []
            for k in range(len(points)):
                corners, share, offset = point_faces[k]
                if np.hypot(*offset) > 0.5:
                    continue
                reference = rig_from_canvas(sum(s * moved[c] for s, c in zip(share, corners)))
                errors.append(np.hypot(*(skinned(k, worlds) - reference)))
            worst.append((max(errors), float(np.mean(errors)), frame))
        print(f'FOX {animation}: {duration:.2f} s, ends {gap:.4f} off its start; mesh vs rig (canvas px) worst '
              f'{max(w[0] for w in worst):.2f} at frame {max(worst)[2]}, mean {np.mean([w[1] for w in worst]):.3f}; '
              f'bend onto the idle at most {np.hypot(*bends_start.T).max():.2f}, mean {np.hypot(*bends_start.T).mean():.2f}')
        animations[animation] = {'timelines': timelines, 'duration': duration, 'ease': spec['ease'], 'fps': fps,
                                 'start': start, 'end': end, 'bends_start': bends_start, 'bends_end': bends_end}

    # ---- the mesh's points, the bent ones first (in any animation), so the deforms cover just them
    bent = np.zeros(len(points), bool)
    for a in animations.values():
        bent |= np.hypot(*a['bends_start'].T) > BEND_MIN
        bent |= np.hypot(*a['bends_end'].T) > BEND_MIN
    reorder = np.argsort(~bent, kind='stable')
    renumber = np.empty_like(reorder)
    renumber[reorder] = np.arange(len(reorder))
    points, uvs = points[reorder], uvs[reorder]
    influences = [influences[k] for k in reorder]
    triangles = [int(renumber[t]) for t in triangles]
    bent_count = int(bent.sum())
    for a in animations.values():
        a['bends_start'], a['bends_end'] = a['bends_start'][reorder], a['bends_end'][reorder]

    def deform(bends, worlds):
        out = []
        for k in range(bent_count):
            for name, _ in influences[k]:
                offset = np.linalg.inv(worlds[name][:2, :2]) @ bends[k]
                out += [round(float(offset[0]), 3), round(float(offset[1]), 3)]
        return out

    def ease(start, end):
        return [round(start + 0.42 * (end - start), 4), 0, round(start + 0.58 * (end - start), 4), 1]

    # ---- the skeleton
    root = affine(SCALE, 0, 0, SCALE, ORIGIN[0] * SCALE + FRAME_OFFSET[0] - ANCHOR[0],
                  ANCHOR[1] - ORIGIN[1] * SCALE - FRAME_OFFSET[1])
    spine_bones = [{'name': 'root', 'x': round(root[0, 2], 4), 'y': round(root[1, 2], 4), 'scaleX': SCALE, 'scaleY': SCALE}]
    for name in order:
        x, y, rotation, scale_x, scale_y, shear = setup[name]
        bone = {'name': names[name], 'parent': names[parents[name]] if parents[name] else 'root',
                'length': round(lengths[name], 2)}
        for field, value, neutral in (('x', x, 0), ('y', y, 0), ('rotation', rotation, 0), ('scaleX', scale_x, 1),
                                      ('scaleY', scale_y, 1), ('shearY', shear, 0)):
            if abs(value - neutral) > 1e-6:
                bone[field] = round(float(value), 5)
        spine_bones.append(bone)
    bone_index = {name: i + 1 for i, name in enumerate(order)}

    rig_points = np.array([rig_from_canvas(p) for p in points])
    vertices = []
    used = 0
    for k, point in enumerate(rig_points):
        vertices.append(len(influences[k]))
        used += len(influences[k])
        for name, share in influences[k]:
            local = inverse_rest[name] @ np.array([*point, 1])
            vertices += [bone_index[name], round(float(local[0]), 2), round(float(local[1]), 2), round(float(share), 4)]
    mesh = {
        'type': 'mesh',
        'path': 'body',
        'uvs': [round(float(v), 5) for v in uvs.ravel()],
        'triangles': triangles,
        'vertices': vertices,
        'hull': 0,
        'width': piece_w,
        'height': piece_h,
    }
    centre = rig_from_canvas((SHADOW['x'], SHADOW['y']))
    shadow_attachment = {'x': round(float(centre[0]), 2), 'y': round(float(centre[1]), 2), 'width': 2 * sx,
                         'height': 2 * sy}

    spine_animations = {}
    for animation, a in animations.items():
        duration, eased = a['duration'], a['ease']
        deform_keys = [
            {'vertices': deform(a['bends_start'], a['start']), 'curve': ease(0, eased)},
            {'time': eased},
            {'time': round(duration - eased, 4), 'curve': ease(duration - eased, duration)},
            {'time': round(duration, 4), 'vertices': deform(a['bends_end'], a['end'])},
        ]
        spine_animations[animation] = {
            'bones': a['timelines'],
            'attachments': {'default': {'body': {'body': {'deform': deform_keys}}}},
        }

    # ---- write
    page_w = 1 << math.ceil(math.log2(max(tex_w, shadow_w) + 2 * PAD))
    page_h = 1 << math.ceil(math.log2(tex_h + shadow_h + 3 * PAD))
    page = np.zeros((page_h, page_w, 4), np.float32)
    page[PAD : PAD + tex_h, PAD : PAD + tex_w] = body_pixels
    shadow_y = PAD * 2 + tex_h
    page[shadow_y : shadow_y + shadow_h, PAD : PAD + shadow_w] = shadow_pixels
    spec = oiio.ImageSpec(page_w, page_h, 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), page)
    assert out.write(os.path.join(OUT, 'fox.webp'), oiio.UINT8), out.geterror()
    with open(os.path.join(OUT, 'fox.atlas'), 'w', newline='\n') as file:
        file.write('\n'.join([
            'fox.webp', f'size: {page_w}, {page_h}', 'filter: MipMapLinearLinear, Linear',
            'body', f'bounds: {PAD}, {PAD}, {tex_w}, {tex_h}',
            'shadow', f'bounds: {PAD}, {shadow_y}, {shadow_w}, {shadow_h}',
        ]) + '\n')

    frame_w, frame_h = 501, 402
    skeleton = {
        'skeleton': {'spine': SPINE_VERSION, 'x': -ANCHOR[0], 'y': ANCHOR[1] - frame_h, 'width': frame_w,
                     'height': frame_h, 'fps': animations[SKELETON]['fps'], 'images': '', 'audio': ''},
        'bones': spine_bones,
        'slots': [{'name': 'shadow', 'bone': 'root', 'attachment': 'shadow'},
                  {'name': 'body', 'bone': 'root', 'attachment': 'body'}],
        'skins': [{'name': 'default', 'attachments': {'shadow': {'shadow': shadow_attachment}, 'body': {'body': mesh}}}],
        'animations': spine_animations,
    }
    path = os.path.join(OUT, 'fox.json')
    with open(path, 'w', newline='\n') as file:
        json.dump(skeleton, file, separators=(',', ':'))
    count = sum(len(k) for a in animations.values() for b in a['timelines'].values() for k in b.values())
    print(f'FOX skeleton: {len(order)} bones, mesh {len(points)} points ({used} weights, {bent_count} bent), '
          f'{len(triangles) // 3} triangles, {count} keys, json {os.path.getsize(path) / 1024:.0f} KB, '
          f'atlas {page_w} x {page_h} ({os.path.getsize(os.path.join(OUT, "fox.webp")) / 1024:.0f} KB)')


if '--old-rig' in ARGS:
    old_rig(ARGS[ARGS.index('--old-rig') + 1])
else:
    main()
