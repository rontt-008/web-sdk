"""Exports the symbols' Blender animations as Spine skeletons for the game, in place of sprite
sheets: each piece of a symbol is stored once, in an atlas, and its movement is keys the game plays
(spine-pixi), so a symbol takes a couple of MB of GPU memory rather than 30 to 50, stays sharp drawn
bigger (the big wild) and moves smoothly at any frame rate.

- the user's 2D cut-out animations, made in Blender ("<blender stuff>", its IDLE folder or
  folders/<animation>; SOURCES): image cards (a quad with an emission + transparent material
  showing one PNG) and empties, on an orthographic camera looking straight down, moved by
  location, rotation about the view and scale. A card's "Glow pulse" value (the runes' glows) is
  its alpha, and it is drawn added when its material adds its light (the rune stone's glow).
- static/assets/spines/symbolAnimations/<name>.atlas + .webp: the pieces of a tile's idle and hit
  (one piece the same in both stored once), trimmed to what shows and scaled to TEXTURE px per px
  of the symbol's 256 px still, mipmapped; <name>-idle.json and <name>-hit.json (Spine 4.2): a bone
  for each Blender object (same names and parents) under 'root', which places the Blender
  camera's view on the still: 1 unit is 1 px of the 256 px still, the origin its middle, y up,
  framed as the game's sprite sheets were before them (the idle's wooden frame where the still's
  is, found on the user's exported sheet); keys sampled SAMPLES times a second and thinned
  where the motion is a straight line (to within TOLERANCE)
- leaves.atlas + .webp and leaf-<colour>-hit.json: the leaves' hits, the leaf drawn once as its
  still is (symbol-stills.py: mirrored where its art is, its thick outline cut away and drawn again
  thin, less saturated where its still is) from the first frame the user rendered, TEXTURE times
  the still's size, moving as in Blender, placed so it lies on the still at rest (as leaf-hits.py
  placed the sheets' frames). Its outline grows with the leaf as it comes toward you (the sheets
  drew it again at the same width each frame).

The Fehu and Ingwaz lands stay sprite sheets (rune-lands.py): their shockwave, comet and sparks are
drawn by shaders, not moved pieces.

Run from apps/my-cluster-game with Blender (about a minute):
    blender -b --factory-startup --python art-source/symbol-spines.py -- ["<blender stuff folder>"]
"""

import hashlib
import importlib.util
import json
import math
import os
import sys
import tempfile

import bpy
import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'static', 'assets', 'spines', 'symbolAnimations')
STILLS = os.path.join(HERE, '..', 'static', 'assets', 'symbols')
ARGS = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
SOURCE = ARGS[0] if ARGS else os.path.join(os.path.expanduser('~'), 'Downloads', 'blender stuff')

spec = importlib.util.spec_from_file_location('symbol_stills', os.path.join(HERE, 'symbol-stills.py'))
stills = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stills)

# the game's name for each tile (its still's, its atlas's), and its animations in Blender
TILES = {
    'blueberries': {'idle': 'blueberry_idle', 'hit': 'blueberry_hit'},
    'runestone': {'idle': 'runestone_idle', 'hit': 'runestone_hit'},
    'mushroom': {'idle': 'mushroom_idle', 'hit': 'mushroom_hit'},
    'acorn': {'idle': 'acorn_idle', 'hit': 'acorn_hit'},
    # the whole symbol, its letters and runes moving
    'wild': {'idle': 'wild_symbol_idle', 'hit': 'wild_hit'},
}
LEAVES = {
    'leaf-green': 'leaf_green_hit',
    'leaf-brown': 'leaf_brown_hit',
    'leaf-red': 'leaf_red_hit',
    'leaf-yellow': 'leaf_yellow_hit',
}
# art-source/leaf-green.webp is the user's PNG mirrored, so its tip points left (see README.md)
MIRRORED = {'leaf-green'}
# an animation's .blend, where it isn't <animation>.blend: wild_hit.blend was saved again after it
# was exported to the game, without the `hit` empty that bounces the whole symbol; its backup is
# the one the game showed
SOURCES = {'wild_hit': 'wild_hit.blend1'}

# texture px per px of the still (256 px a tile): about what a cell is on a 4K screen; the wild's
# more, as it is drawn up to 3 cells big too (the big wild)
TEXTURE = {'wild': 2}
TEXTURE_DEFAULT = 1.5
SIZE = 256
SPINE_VERSION = '4.2.40'
SAMPLES = 60
# how far a thinned key may stray: px of the still, degrees, scale, alpha
TOLERANCE = {'px': 0.02, 'degrees': 0.02, 'scale': 0.0002, 'alpha': 0.002}
# between the atlas's pieces (and round them), so the smaller mipmaps don't bleed into each other
PAD = 8
COMPRESSION = 'webp:90'

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)
SHADERS = {'OUTPUT_MATERIAL', 'TEX_IMAGE', 'EMISSION', 'BSDF_TRANSPARENT', 'MIX_SHADER', 'ADD_SHADER'}
PULSE = 'Glow pulse'


def read(path):
    return oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)


def find(animation, *names):
    """The first of these files in the animation's places: the top of <blender stuff>, IDLE,
    folders/<animation>."""
    for folder in ('', 'IDLE', os.path.join('folders', animation)):
        for name in names:
            path = os.path.join(SOURCE, folder, name)
            if os.path.exists(path):
                return path
    raise FileNotFoundError(f'{animation}: none of {names} in {SOURCE}')


def folder_of(animation):
    """The animation's folder (its frames, export, layers): <blender stuff>/<animation> or
    folders/<animation>."""
    for folder in (os.path.join(SOURCE, animation), os.path.join(SOURCE, 'folders', animation)):
        if os.path.isdir(folder):
            return folder
    raise FileNotFoundError(f'{animation}: no folder in {SOURCE}')


def affine(a, b, c, d, x, y):
    return np.array([[a, b, x], [c, d, y], [0, 0, 1.0]])


def world2d(matrix):
    """An object's world matrix as a 2D affine (x, y), checking it lies flat in the view."""
    m = np.array(matrix)
    assert abs(m[2, 0]) < 1e-6 and abs(m[2, 1]) < 1e-6 and abs(m[0, 2]) < 1e-6 and abs(m[1, 2]) < 1e-6, (
        'an object turned out of the view'
    )
    return affine(m[0, 0], m[0, 1], m[1, 0], m[1, 1], m[0, 3], m[1, 3])


def render_from_world(scene):
    """World (x, y) to the render's px (continuous, y down)."""
    camera = scene.camera
    data = camera.data
    assert data.type == 'ORTHO' and data.shift_x == 0 and data.shift_y == 0
    assert np.allclose(np.array(camera.matrix_world.to_3x3()), np.eye(3), atol=1e-6), 'camera not straight down'
    width = scene.render.resolution_x * scene.render.resolution_percentage / 100
    height = scene.render.resolution_y * scene.render.resolution_percentage / 100
    k = max(width, height) / data.ortho_scale
    x, y = camera.matrix_world.translation.x, camera.matrix_world.translation.y
    return affine(k, 0, 0, -k, width / 2 - k * x, height / 2 + k * y), (width, height)


# the still's px (y down, 0 to SIZE) to Spine's units (y up, origin in the middle)
SPINE_FROM_STILL = affine(1, 0, 0, -1, -SIZE / 2, SIZE / 2)


def decompose(m):
    """Spine's local transform (x, y, rotation, scaleX, scaleY, shearY) of a 2D affine."""
    a, b, c, d = m[0, 0], m[0, 1], m[1, 0], m[1, 1]
    rotation = math.degrees(math.atan2(c, a))
    shear = math.degrees(math.atan2(d, b)) - rotation - 90
    shear = (shear + 180) % 360 - 180
    return np.array([m[0, 2], m[1, 2], rotation, math.hypot(a, c), math.hypot(b, d), shear])


def scale_of(m):
    return math.sqrt(abs(np.linalg.det(m[:2, :2])))


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
        key.update({field: round(float(value), 5) for field, value in zip(fields, values[i])})
        out.append(key)
    return out


def premultiplied_resize(pixels, width, height):
    """Lanczos, premultiplied so see-through pixels don't bleed their colour into the edges."""
    return stills.resize(pixels, width, height)


def material_of(obj):
    """A card's image, whether it adds its light, and the node whose value is its alpha (or None)."""
    material = obj.data.materials[0]
    nodes = material.node_tree.nodes
    kinds = {node.type for node in nodes}
    math_nodes = [node for node in nodes if node.type == 'MATH']
    assert kinds <= SHADERS | {'VALUE', 'MATH'}, f'{material.name}: a shader the export does not know'
    assert all(node.operation == 'MULTIPLY' for node in math_nodes), f'{material.name}: not a multiply'
    images = [node.image for node in nodes if node.type == 'TEX_IMAGE']
    assert len(images) == 1, f'{material.name}: {len(images)} images'
    pulse = nodes.get(PULSE)
    assert (pulse is None) == (not math_nodes), f'{material.name}: an alpha other than {PULSE}'
    for node in nodes:
        if node.type == 'EMISSION' and not node.inputs['Strength'].is_linked:
            assert abs(node.inputs['Strength'].default_value - 1) < 1e-6, f'{material.name}: emission not 1'
    return images[0], 'ADD_SHADER' in kinds, pulse


def image_pixels(image):
    """The image as the user saved it (straight alpha, row 0 at the top)."""
    if image.packed_file:
        handle, path = tempfile.mkstemp(suffix=os.path.splitext(image.filepath)[1] or '.png')
        with os.fdopen(handle, 'wb') as file:
            file.write(image.packed_file.data)
        try:
            return read(path)
        finally:
            os.remove(path)
    return read(bpy.path.abspath(image.filepath))


def card_from_image(obj, image):
    """The image's px (continuous, y down) to the card's own (object) space, from its UVs."""
    mesh = obj.data
    width, height = image.size
    uv = np.zeros((len(mesh.loops), 2))
    mesh.uv_layers.active.data.foreach_get('uv', uv.ravel())
    vertex = np.zeros(len(mesh.loops), int)
    mesh.loops.foreach_get('vertex_index', vertex)
    local = np.array([tuple(mesh.vertices[v].co) for v in vertex])
    px = np.column_stack([uv[:, 0] * width, (1 - uv[:, 1]) * height, np.ones(len(uv))])
    fit, *_ = np.linalg.lstsq(px, local[:, :2], rcond=None)
    assert np.abs(px @ fit - local[:, :2]).max() < 1e-4, f'{obj.name}: not a flat card'
    assert np.ptp(local[:, 2]) < 1e-6, f'{obj.name}: not flat'
    return np.vstack([fit.T, [0, 0, 1]])


class Atlas:
    """Pieces packed into one page, a piece the same as one already in stored once."""

    def __init__(self, name):
        self.name = name
        self.regions = {}
        self.by_key = {}

    def add(self, name, key, make):
        if key not in self.by_key:
            assert name not in self.regions, name
            self.regions[name] = make()
            self.by_key[key] = name
        return self.by_key[key]

    def write(self):
        # skyline packing, tallest first: each piece where it sits lowest
        order = sorted(self.regions, key=lambda name: -self.regions[name].shape[0])
        area = sum((p.shape[0] + PAD) * (p.shape[1] + PAD) for p in self.regions.values())
        widest = max(p.shape[1] for p in self.regions.values()) + 2 * PAD
        best = None
        for width in (256, 512, 1024, 2048, 4096):
            if width < widest or width * width * 4 < area:
                continue
            placed, height = self.pack(order, width)
            height = 1 << math.ceil(math.log2(height))
            if height <= 4096 and (best is None or width * height < best[0] * best[1]):
                best = (width, height, placed)
        width, height, placed = best
        page = np.zeros((height, width, 4), np.float32)
        for name, (x, y) in placed.items():
            pixels = self.regions[name]
            page[y : y + pixels.shape[0], x : x + pixels.shape[1]] = pixels
        image = f'{self.name}.webp'
        spec = oiio.ImageSpec(width, height, 4, oiio.FLOAT)
        spec.attribute('oiio:UnassociatedAlpha', 1)
        spec.attribute('compression', COMPRESSION)
        out = oiio.ImageBuf(spec)
        out.set_pixels(oiio.ROI(), page)
        assert out.write(os.path.join(OUT, image), oiio.UINT8), out.geterror()
        lines = [image, f'size: {width}, {height}', 'filter: MipMapLinearLinear, Linear']
        for name, (x, y) in placed.items():
            h, w = self.regions[name].shape[:2]
            lines += [name, f'bounds: {x}, {y}, {w}, {h}']
        with open(os.path.join(OUT, f'{self.name}.atlas'), 'w', newline='\n') as file:
            file.write('\n'.join(lines) + '\n')
        size = os.path.getsize(os.path.join(OUT, image)) / 1024
        print(f'{self.name}: atlas {width} x {height} ({width * height * 4 * 4 / 3 / 2**20:.1f} MB '
              f'with mipmaps), {len(placed)} pieces, {size:.0f} KB', flush=True)

    def pack(self, order, width):
        skyline = [[0, PAD, width]]
        placed = {}
        for name in order:
            h, w = self.regions[name].shape[:2]
            span = w + PAD
            best = None
            for x, _, _ in skyline:
                if x == 0:
                    x = PAD
                if x + span > width:
                    continue
                top = max(y for (sx, y, sw) in skyline if sx < x + span and sx + sw > x)
                if best is None or (top, x) < best:
                    best = (top, x)
            if best is None:
                return placed, 1 << 30
            top, x = best
            placed[name] = (x, top)
            cut = []
            for sx, y, sw in skyline:
                if sx + sw <= x or sx >= x + span:
                    cut.append([sx, y, sw])
                    continue
                if sx < x:
                    cut.append([sx, y, x - sx])
                if sx + sw > x + span:
                    cut.append([x + span, y, sx + sw - x - span])
            cut.append([x, top + h + PAD, span])
            skyline = sorted(cut)
        return placed, max(y for _, y, _ in skyline)


def region_attachment(spine_from_texture, width, height, path):
    """A region attachment (in its bone's space) drawing a width x height piece where
    spine_from_texture puts it (texture px, y down, to the bone's space)."""
    centre = spine_from_texture @ np.array([width / 2, height / 2, 1])
    # the region's own x across, y up
    linear = spine_from_texture[:2, :2] @ np.diag([1, -1])
    rotation = math.atan2(linear[1, 0], linear[0, 0])
    across = np.array([math.cos(rotation), math.sin(rotation)])
    up = np.array([-math.sin(rotation), math.cos(rotation)])
    scale_x = float(np.hypot(*linear[:, 0]))
    scale_y = float(linear[:, 1] @ up)
    assert abs(linear[:, 1] @ across) < 1e-3 * abs(scale_y), f'{path}: sheared'
    return {
        'path': path,
        'x': round(float(centre[0]), 4),
        'y': round(float(centre[1]), 4),
        'rotation': round(math.degrees(rotation), 4),
        'scaleX': round(scale_x, 7),
        'scaleY': round(scale_y, 7),
        'width': width,
        'height': height,
    }


def export(animation, kind, spine_from_world, texture, atlas, prefix, piece=None):
    """The open .blend's animation as a Spine skeleton: <prefix>-<kind>.json, its pieces in atlas.
    piece(obj) can give a card's piece itself: (its name in the atlas, its pixels, and Spine's
    units from its px)."""
    scene = bpy.context.scene
    fps = scene.render.fps / scene.render.fps_base
    first, last = scene.frame_start, scene.frame_end
    duration = (last - first + 1) / fps
    loops = kind == 'idle'
    objects = [o for o in scene.objects if o.type in ('MESH', 'EMPTY') and not o.hide_render]
    for obj in objects:
        assert obj.parent is None or (obj.parent_type == 'OBJECT' and obj.parent in objects), obj.name
        assert not obj.constraints and not obj.modifiers, f'{obj.name}: constraints or modifiers'
    order = []
    while len(order) < len(objects):
        order += [o for o in objects if o not in order and (o.parent is None or o.parent in order)]
    cards = [o for o in order if o.type == 'MESH']
    materials = {o.name: material_of(o) for o in cards}

    def pose(seconds):
        frame = first + seconds * fps
        scene.frame_set(int(math.floor(frame)), subframe=frame - math.floor(frame))
        graph = bpy.context.evaluated_depsgraph_get()
        worlds = {o.name: world2d(o.evaluated_get(graph).matrix_world) for o in order}
        depth = {o.name: o.evaluated_get(graph).matrix_world.translation.z for o in cards}
        alpha = {}
        for o in cards:
            pulse = materials[o.name][2]
            if pulse:
                node_tree = o.data.materials[0].evaluated_get(graph).node_tree
                alpha[o.name] = node_tree.nodes[PULSE].outputs[0].default_value
        locals_ = {}
        for o in order:
            parent = worlds[o.parent.name] if o.parent else np.eye(3)
            locals_[o.name] = decompose(np.linalg.inv(parent) @ worlds[o.name])
        return worlds, locals_, depth, alpha

    times = np.linspace(0, duration, round(duration * SAMPLES) + 1)
    samples = [pose(t) for t in times]
    rest_worlds, setup, rest_depth, _ = samples[0]
    if loops:
        end = samples[-1][1]
        gap = max(np.abs(end[n][:2] - setup[n][:2]).max() for n in setup)
        assert gap < 1e-3, f'{animation}: the loop does not close ({gap:.4f})'
        samples[-1] = samples[0]
    for _, _, depth, _ in samples:
        assert sorted(depth, key=depth.get) == sorted(rest_depth, key=rest_depth.get), f'{animation}: order changes'

    # bones: root places the camera's view on the still, then the objects
    root = spine_from_world
    assert abs(root[0, 1]) < 1e-9 and abs(root[1, 0]) < 1e-9
    bones = [{'name': 'root', 'x': round(root[0, 2], 4), 'y': round(root[1, 2], 4),
              'scaleX': round(root[0, 0], 7), 'scaleY': round(root[1, 1], 7)}]
    for obj in order:
        x, y, rotation, scale_x, scale_y, shear = setup[obj.name]
        bone = {'name': obj.name, 'parent': obj.parent.name if obj.parent else 'root'}
        for field, value, neutral in (('x', x, 0), ('y', y, 0), ('rotation', rotation, 0), ('scaleX', scale_x, 1),
                                      ('scaleY', scale_y, 1), ('shearY', shear, 0)):
            if abs(value - neutral) > 1e-7:
                bone[field] = round(float(value), 6)
        bones.append(bone)

    # a glow's alpha over time; one added brighter than 1 (more than a slot's alpha can be) is drawn
    # as that many copies, each a share of it
    glows, copies = {}, {}
    for obj in cards:
        if materials[obj.name][2]:
            raw = np.array([s[3][obj.name] for s in samples])
            copies[obj.name] = max(1, math.ceil(raw.max() - 1e-6)) if materials[obj.name][1] else 1
            if raw.max() > copies[obj.name] + 1e-6:
                print(f'{animation}: {obj.name} glows {raw.max():.2f}, more than its alpha can (1)')
            glows[obj.name] = np.clip(raw / copies[obj.name], 0, 1)[:, None]

    # slots, back to front, each showing its card's piece
    slots, skin, slot_timelines = [], {}, {}
    for obj in sorted(cards, key=lambda o: rest_depth[o.name]):
        image, adds, pulse = materials[obj.name]
        spine_from_bone = spine_from_world @ rest_worlds[obj.name]
        if piece:
            region, pixels, spine_from_texture = piece(obj)
            region = atlas.add(region, region, lambda: pixels)
            width, height = pixels.shape[1], pixels.shape[0]
        else:
            source = image_pixels(image)
            card = card_from_image(obj, image)
            seen = np.nonzero(source[..., 3] > 0)
            left, top = max(seen[1].min() - 2, 0), max(seen[0].min() - 2, 0)
            right = min(seen[1].max() + 3, source.shape[1])
            bottom = min(seen[0].max() + 3, source.shape[0])
            # texture px per image px: TEXTURE per px of the still, at rest
            factor = texture * scale_of(spine_from_bone @ card)
            width, height = math.ceil((right - left) * factor), math.ceil((bottom - top) * factor)
            key = (hashlib.sha1(source.tobytes()).hexdigest(), left, top, right, bottom, width, height)
            region = atlas.add(
                f'{kind}/{obj.name}', key,
                lambda: premultiplied_resize(source[top:bottom, left:right], width, height),
            )
            image_from_texture = affine((right - left) / width, 0, 0, (bottom - top) / height, left, top)
            spine_from_texture = spine_from_bone @ card @ image_from_texture
        attachment = region_attachment(np.linalg.inv(spine_from_bone) @ spine_from_texture, width, height, region)
        for copy in range(copies.get(obj.name, 1)):
            name = obj.name if copy == 0 else f'{obj.name}{copy + 1}'
            slot = {'name': name, 'bone': obj.name, 'attachment': obj.name}
            if adds:
                slot['blend'] = 'additive'
            if pulse:
                alpha = glows[obj.name]
                slot['color'] = f'ffffff{round(float(alpha[0, 0]) * 255):02x}'
                made = keys(times, alpha, alpha[0], TOLERANCE['alpha'], ('value',))
                if made:
                    slot_timelines[name] = {'alpha': made}
            slots.append(slot)
            skin[name] = {obj.name: attachment}

    # the bones' keys: their moves from their setup pose
    timelines = {}
    for obj in order:
        name = obj.name
        values = np.array([s[1][name] for s in samples])
        rest = setup[name]
        # tolerances in this bone's parent's units
        parent_world = spine_from_world @ (rest_worlds[obj.parent.name] if obj.parent else np.eye(3))
        px = TOLERANCE['px'] / scale_of(parent_world)
        rotation = np.degrees(np.unwrap(np.radians(values[:, 2] - rest[2])))
        bone = {}
        for timeline, vals, neutral, tolerance, fields in (
            ('translate', values[:, :2] - rest[:2], 0, px, ('x', 'y')),
            ('rotate', rotation[:, None], 0, TOLERANCE['degrees'], ('value',)),
            ('scale', values[:, 3:5] / rest[3:5], 1, TOLERANCE['scale'], ('x', 'y')),
            ('shear', np.column_stack([np.zeros(len(values)), values[:, 5] - rest[5]]), 0, TOLERANCE['degrees'], ('x', 'y')),
        ):
            made = keys(times, vals, neutral, tolerance, fields)
            if made:
                bone[timeline] = made
        if bone:
            timelines[name] = bone

    skeleton = {
        'skeleton': {'spine': SPINE_VERSION, 'x': -SIZE / 2, 'y': -SIZE / 2, 'width': SIZE, 'height': SIZE,
                     'fps': SAMPLES, 'images': '', 'audio': ''},
        'bones': bones,
        'slots': slots,
        'skins': [{'name': 'default', 'attachments': skin}],
        'animations': {kind: {'bones': timelines, **({'slots': slot_timelines} if slot_timelines else {})}},
    }
    path = os.path.join(OUT, f'{prefix}-{kind}.json')
    with open(path, 'w', newline='\n') as file:
        json.dump(skeleton, file, separators=(',', ':'))
    count = sum(len(k) for b in timelines.values() for k in b.values()) + sum(
        len(k) for s in slot_timelines.values() for k in s.values())
    print(f'{prefix}-{kind}: {duration:.2f} s{" loop" if loops else ""}, {len(order)} bones, {len(cards)} pieces, '
          f'{count} keys, {os.path.getsize(path) / 1024:.0f} KB', flush=True)


def open_blend(animation):
    path = find(animation, SOURCES.get(animation, f'{animation}.blend'))
    bpy.ops.wm.open_mainfile(filepath=path, load_ui=False, use_scripts=False)
    return bpy.context.scene


def frame_edges(pixels):
    """Where a tile's wooden frame is (left, top, right, bottom): the median of each row's and
    column's first and last solid pixel, so the vines' leaves sticking out don't count."""
    solid = pixels[..., 3] > 0.5
    rows = solid[solid.any(axis=1)]
    cols = solid[:, solid.any(axis=0)].T
    left = np.median([np.argmax(r) for r in rows])
    right = np.median([len(r) - np.argmax(r[::-1]) for r in rows])
    top = np.median([np.argmax(c) for c in cols])
    bottom = np.median([len(c) - np.argmax(c[::-1]) for c in cols])
    return left, top, right, bottom


def tile_fit(name, idle):
    """The still's px from the user's sheet's px, as the game's sprite sheets placed their frames:
    the idle's first wooden frame onto the still's; and the size of a sheet frame."""
    export_folder = os.path.join(folder_of(idle), 'export')
    sheet = read(os.path.join(export_folder, f'{idle}_sheet.png'))
    with open(os.path.join(export_folder, f'{idle}_sheet.json')) as file:
        frame = next(iter(json.load(file)['frames'].values()))['frame']
    first = sheet[frame['y'] : frame['y'] + frame['h'], frame['x'] : frame['x'] + frame['w']]
    left, top, right, bottom = frame_edges(first)
    s_left, s_top, s_right, s_bottom = frame_edges(read(os.path.join(STILLS, f'{name}.webp')))
    scale = ((s_right - s_left) / (right - left) + (s_bottom - s_top) / (bottom - top)) / 2
    dx = (s_left + s_right) / 2 - scale * (left + right) / 2
    dy = (s_top + s_bottom) / 2 - scale * (top + bottom) / 2
    return affine(scale, 0, 0, scale, dx, dy), (frame['w'], frame['h'])


def export_tile(name, animations):
    texture = TEXTURE.get(name, TEXTURE_DEFAULT)
    atlas = Atlas(name)
    still_from_sheet, (sheet_w, sheet_h) = tile_fit(name, animations['idle'])
    for kind, animation in animations.items():
        scene = open_blend(animation)
        render_from, (width, height) = render_from_world(scene)
        sheet_from_render = affine(sheet_w / width, 0, 0, sheet_h / height, 0, 0)
        spine_from_world = SPINE_FROM_STILL @ still_from_sheet @ sheet_from_render @ render_from
        export(animation, kind, spine_from_world, texture, atlas, name)
    atlas.write()


def leaf_fit(name, animation, texture):
    """The leaf's texture (its first frame made as its still), the still's px from the frame's
    px (as leaf-hits.py placed the frames), and the still's px from the texture's."""
    frames = os.path.join(folder_of(animation), 'frames')
    first = read(os.path.join(frames, sorted(f for f in os.listdir(frames) if f.endswith('.png'))[0]))
    mirrored = name in MIRRORED
    if mirrored:
        first = first[:, ::-1].copy()
    saturation = stills.LEAF_SATURATION.get(name, 1)
    ys, xs = np.nonzero(first[..., 3] > 0)
    top, left = max(ys.min() - 2, 0), max(xs.min() - 2, 0)
    pixels, colour = stills.leaf_without_outline(first[top : ys.max() + 3, left : xs.max() + 3])
    pixels[..., :3] = stills.saturated(pixels[..., :3], saturation)
    colour = stills.saturated(colour, saturation)
    ys, xs = np.nonzero(pixels[..., 3] > 0)
    art_w, art_h = xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min()
    scale = (SIZE * stills.LEAF_FILL - stills.LEAF_LINE * 2) / max(art_w, art_h)
    width, height = round(art_w * scale), round(art_h * scale)
    sx, sy = width / art_w, height / art_h
    corner = (left + xs.min(), top + ys.min())
    place = ((SIZE - width) // 2, (SIZE - height) // 2)
    still_from_frame = affine(sx, 0, 0, sy, place[0] - corner[0] * sx, place[1] - corner[1] * sy)
    if mirrored:
        still_from_frame = still_from_frame @ affine(-1, 0, 0, 1, first.shape[1], 0)

    # the texture: the art TEXTURE times the still's size, with room for its line
    line = stills.LEAF_LINE * texture
    margin = math.ceil(line) + 2
    art = pixels[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    art_tw, art_th = round(width * texture), round(height * texture)
    leaf = np.zeros((art_th + 2 * margin, art_tw + 2 * margin, 4), np.float32)
    leaf[margin : margin + art_th, margin : margin + art_tw] = stills.resize(art, art_tw, art_th)
    outline = np.zeros_like(leaf)
    outline[..., :3] = colour
    outline[..., 3] = stills.grow(leaf[..., 3], line)
    leaf = stills.over(leaf, outline)
    leaf[leaf[..., 3] == 0, :3] = 0
    still_from_texture = affine(width / art_tw, 0, 0, height / art_th,
                                place[0] - margin * width / art_tw, place[1] - margin * height / art_th)
    return leaf, still_from_frame, still_from_texture


def export_leaves():
    atlas = Atlas('leaves')
    for name, animation in LEAVES.items():
        texture = TEXTURE.get(name, TEXTURE_DEFAULT)
        leaf, still_from_frame, still_from_texture = leaf_fit(name, animation, texture)
        scene = open_blend(animation)
        render_from, _ = render_from_world(scene)
        spine_from_world = SPINE_FROM_STILL @ still_from_frame @ render_from

        # its one card's piece is the leaf made as its still, named for the leaf
        def piece(obj, name=name, leaf=leaf, spine_from_texture=SPINE_FROM_STILL @ still_from_texture):
            return name, leaf, spine_from_texture

        export(animation, 'hit', spine_from_world, texture, atlas, name, piece)
    atlas.write()


os.makedirs(OUT, exist_ok=True)
for tile, tile_animations in TILES.items():
    export_tile(tile, tile_animations)
export_leaves()
