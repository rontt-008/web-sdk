"""The wild, from the user's IDLE/bat_ring_idle.blend in blender stuff (what it does and how it is built and tuned:
blender stuff/folders/bat_ring_idle/README.md): the thorn ring turns clockwise, once round in 12 s, while the crystal bat
hovers in front of it, as wide as its band, its wings beating every 1.5 s, its body bobbing, its ears and feet trailing
and the whole bat drifting a little. A seamless loop, 360 frames at 30 fps. Here the bat also gets a red glow.

  static/assets/symbols/wild.webp                 the still: the loop's first frame, SIZE x SIZE
  static/assets/spines/wild/wild.atlas + .webp    one mipmapped page: the ring, the glow and the bat
  static/assets/spines/wild/wild.json             the skeleton and its `idle`, the loop

The .blend has two pictures, packed in it:
- `ring`: a card of the ring (ring.png, the canvas's size) turning round its hole's middle. In Spine, the picture on a
  `ring` bone that turns -360 degrees over the loop (two keys: Spine doesn't take the short way round between them).
- `bat`: a grid mesh of the bat (symbol.png, in its own px; BatRig's object scales it down to the ring's) bent by BatRig:
  `bat` bobs, drifts, leans and stretches the whole bat, wing_L, wing_R, ear_L, ear_R and feet turn on it, the weights
  easing from part to part. In Spine, a weighted mesh on those bones (spine_common: the armature's scale is on `bat`),
  its points spine_common's quadtree, within TOL source px of Blender's at every frame. Each point keeps all its
  weights (up to six bones: the weight maps leave traces of 1-3 / 255 round the parts; only four would put some points
  2 px off).
The skeleton's setup pose is the loop's first frame, the still, so it shows the still before it plays.

The red glow (the user asked for it on 2026-11-11; not in the .blend, added here): the bat's outline blurred, red
(GLOW_*), on a mesh of its own made here in the opened .blend (not saved): a grid like the bat's, a margin wider all
round for the glow to fade out in, bent by BatRig with the bat's weights (where it lies past the bat's picture, those
at its nearest edge), so it beats, bobs and drifts with the bat. It is drawn between the ring and the bat, in the
still's render too, and exported like the bat; its picture is soft, so it is kept at GLOW_RES of the still's density.

The square (the still's, and the skeleton's bounds) is centred on the ring's middle and round everything the loop
reaches (the ring's leaves and thorns as it turns; the bat and its glow stay inside them), that circle filling FILL of
it. The game draws the square at constants WILD_SIZE (the circle 1.25 cells across), over the board's mask once its
reel is at rest (constants OVERSIZE_SYMBOLS), so the turning leaves aren't cut at the board's edge.

The still is Blender's own render of the first frame (EEVEE, as the .blend is set up), of the pictures cleaned like the
symbols' (symbols_common: the faint specks round the ring cleared, the insides solid), so the idle starts exactly on it.

Run from apps/crystal-hollows (~20 s):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" -b --factory-startup --python art-source/wild-spine.py
  ... -- <check.json>   also writes Blender's own places for the meshes' points and the ring picture's corners at
                        every CHECK_EVERY-th frame there
"""
import bpy, os, sys, json, math, shutil, tempfile
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_common import APP, SIZE, FILL, clean, read, still, still_square, write
from spine_common import (PPU, EDGE, Rig, image_px, mesh_attachment, setup_pose, sample, timelines, shrink,
                          write_skeleton, write_atlas, grid_of, positions, crop_of, showing_cells, quadtree_mesh)

BLEND = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff", "IDLE", "bat_ring_idle.blend")
STILL = os.path.join(APP, "static", "assets", "symbols", "wild.webp")
OUT = os.path.join(APP, "static", "assets", "spines", "wild")
NAME = "wild"
PAGE_W = 512         # the ring (~240 px) beside the bat (~175 x 100) over the glow
CHECK_EVERY = 3
# the red glow round the bat (in the bat picture's px)
GLOW_COLOR = (255, 36, 44)
GLOW_ALPHA = 0.85    # on the bat's outline, fading out from it
GLOW_BLUR = 45       # three box blurs of this radius (about a Gaussian of it), so it fades out ~2.5x that past the outline
GLOW_GAIN = 2.2      # the blurred outline is 0.5 on it: times this, the glow is full there
GLOW_RES = 0.5       # its picture's density, of the still's (it is soft)
GRID_PX = 10         # its mesh's grid, as the bat's
# The spin (the user, 2026-11-12: a bat ring that lands spins in its cell before it becomes the tall WILD): a second
# animation, `spin`, the ring turning once round the way it turns in the idle, easing in and out (cubic), over
# SPIN_SECONDS (SPIN_KEYS linear keys along the curve), the bat in its setup pose. It starts and ends on the setup pose
# (the still, the idle's first frame), so the game can go on from it to the still or the idle with no jump.
SPIN_SECONDS = 0.75      # (1.1 at first; the user, 2026-11-12: "make the bat wild animations faster")
SPIN_KEYS = 32
# The fly (2026-11-12, the user: the bats' flight to the reel's middle, where they turn into the WILD, smoother): a
# third animation, `fly`, one beat of the idle's wings (the wings, ears and feet repeat every FLY_BEAT s; the body's
# drift and the ring's turn don't, so they stay in the setup pose), played in FLY_SECONDS. It starts and ends on the
# setup pose, the tall wild's morph's first frame, so the glide flows into it. The game's glide lasts as long
# (constants TALL_WILD.glideMs x pace).
FLY_BEAT = 1.5
FLY_SECONDS = 0.5       # (0.75 at first, as the glide was slower)
FLY_BONES = {"wing_L": ("rotate", "scale"), "wing_R": ("rotate", "scale"), "ear_L": ("rotate",), "ear_R": ("rotate",),
             "feet": ("rotate",)}
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
CHECK = argv[0] if argv else None


def cleaned(o):
    """o's picture cleaned (uint8 RGBA, row 0 = top) and its size; the .blend's copy is cleaned too, for the render."""
    px, iw, ih = image_px(o)
    img = clean(np.clip(np.round(px * 255), 0, 255).astype(np.uint8))
    image = next(n.image for n in o.data.materials[0].node_tree.nodes if n.type == "TEX_IMAGE")
    image.pixels.foreach_set((img[::-1].astype(np.float32) / 255).ravel())
    image.update()
    return img, iw, ih


def first_frame_render(sc):
    """Blender's render of the first frame (uint8 straight-alpha RGBA, the canvas's size)."""
    assert sc.render.film_transparent and sc.render.resolution_percentage == 100
    sc.frame_set(sc.frame_start)
    tmp = tempfile.mkdtemp()
    try:
        sc.render.filepath = os.path.join(tmp, "first.png")
        sc.render.image_settings.file_format, sc.render.image_settings.color_mode = "PNG", "RGBA"
        sc.render.image_settings.color_depth = "8"
        bpy.ops.render.render(write_still=True)
        return read(sc.render.filepath)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def box_blur(a, r, axis):
    """a box blur of radius r along an axis, zero past the edges."""
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad), axis=axis)
    n = a.shape[axis]
    return (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(n), axis=axis)) / (2 * r + 1)


def glow_picture(img):
    """The glow: the picture's outline blurred, red (uint8 RGBA), on a canvas `pad` px wider all round; and pad."""
    pad = 3 * GLOW_BLUR
    h, w = img.shape[:2]
    a = np.zeros((h + 2 * pad, w + 2 * pad))
    a[pad:pad + h, pad:pad + w] = img[..., 3] / 255
    for _ in range(3):
        a = box_blur(box_blur(a, GLOW_BLUR, 0), GLOW_BLUR, 1)
    a = np.clip(a * GLOW_GAIN, 0, 1) * GLOW_ALPHA
    out = np.zeros(a.shape + (4,), np.uint8)
    out[..., 3] = np.round(a * 255)
    out[..., :3][out[..., 3] > 0] = GLOW_COLOR
    return clean(out), pad


def add_glow(img, pad, bat, grid, X, Y, rig, behind):
    """The glow's mesh in the opened .blend: a grid over its picture (img, `pad` px past the bat's all round), on the
    bat's armature, its points weighted as the bat's are at the same place (bilinear between the bat's points; past
    the bat's picture, as at its nearest edge), drawn just behind the bat (at depth `behind`)."""
    gh, gw = img.shape[:2]
    nx, ny = math.ceil(gw / GRID_PX) + 1, math.ceil(gh / GRID_PX) + 1
    gx, gy = np.meshgrid(np.linspace(0, gw, nx), np.linspace(0, gh, ny))
    pts = np.column_stack([gx.ravel(), gy.ravel()])
    me = bpy.data.meshes.new("glow")
    me.from_pydata([(x / PPU, 0.0, (gh - y) / PPU) for x, y in pts], [],
                   [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i)
                    for j in range(ny - 1) for i in range(nx - 1)])
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            x, y = pts[me.loops[li].vertex_index]
            uv.data[li].uv = (x / gw, 1 - y / gh)
    image = bpy.data.images.new("glow.png", gw, gh, alpha=True)
    image.alpha_mode = "STRAIGHT"
    image.pixels.foreach_set((img[::-1].astype(np.float32) / 255).ravel())
    mat = bat.data.materials[0].copy()
    next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE").image = image
    me.materials.append(mat)
    o = bpy.data.objects.new("glow", me)
    bpy.context.scene.collection.objects.link(o)
    o.parent = rig
    o.matrix_parent_inverse = Matrix.Identity(4)
    s = rig.matrix_world.to_scale().x
    o.location = (-pad / PPU, (behind - rig.matrix_world.translation.y) / s, -pad / PPU)
    # the bat's weights at each point, bilinear on the bat's grid (clamped to it)
    names = [g.name for g in bat.vertex_groups]
    wb = np.zeros((len(names), len(bat.data.vertices)))
    for v in bat.data.vertices:
        for g in v.groups:
            wb[g.group, v.index] = g.weight
    wg = wb[:, grid]                                                         # (groups, rows, columns)
    fi = np.interp(np.clip(pts[:, 0] - pad, X[0], X[-1]), X, np.arange(len(X)))
    fj = np.interp(np.clip(pts[:, 1] - pad, Y[0], Y[-1]), Y, np.arange(len(Y)))
    i0 = np.minimum(fi.astype(int), len(X) - 2); ti = fi - i0
    j0 = np.minimum(fj.astype(int), len(Y) - 2); tj = fj - j0
    w = (wg[:, j0, i0] * (1 - ti) * (1 - tj) + wg[:, j0, i0 + 1] * ti * (1 - tj)
         + wg[:, j0 + 1, i0] * (1 - ti) * tj + wg[:, j0 + 1, i0 + 1] * ti * tj)
    w /= w.sum(axis=0)
    for gi, name in enumerate(names):
        vg = o.vertex_groups.new(name=name)
        for vi in np.nonzero(w[gi] > 1e-4)[0]:
            vg.add([int(vi)], float(w[gi, vi]), "REPLACE")
    mod = o.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    bpy.context.view_layer.update()
    return o


bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene
RW, RH = sc.render.resolution_x, sc.render.resolution_y
cam = sc.camera
assert cam.data.type == "ORTHO" and abs(cam.data.ortho_scale * PPU - max(RW, RH)) < 1e-3 and \
    abs(cam.location.x * PPU - RW / 2) < 1e-3 and abs(cam.location.z * PPU - RH / 2) < 1e-3, \
    "the camera doesn't show the canvas at 1 px = 1 / PPU"
ring, bat, rig = bpy.data.objects["ring"], bpy.data.objects["bat"], bpy.data.objects["BatRig"]
ring_img, iw, ih = cleaned(ring)
assert (iw, ih) == (RW, RH), "the ring's picture isn't the canvas"
bat_img, bw, bh = cleaned(bat)
assert max(abs(a) for a in rig.matrix_world.to_euler()) < 1e-6, "BatRig is turned"
scale = rig.matrix_world.to_scale()
assert abs(scale.x - scale.z) < 1e-6 and abs(scale.x - scale.y) < 1e-6, "BatRig isn't scaled evenly"
assert bat.parent == rig and bat.matrix_world == rig.matrix_world, "the bat isn't where its rig is"

# ---------------------------------------------------------------- the glow, a mesh of its own on the bat's rig
grid, X, Y = grid_of(bat, bw, bh)
glow_img, glow_pad = glow_picture(bat_img)
glow = add_glow(glow_img, glow_pad, bat, grid, X, Y, rig,
                behind=(ring.matrix_world.translation.y + bat.matrix_world.translation.y) / 2)
gh, gw = glow_img.shape[:2]
# the meshes, front last: name -> (object, picture, its size, atlas px per picture px of the still's density)
MESHES = {"glow": (glow, glow_img, (gw, gh), GLOW_RES), "bat": (bat, bat_img, (bw, bh), 1.0)}

# ---------------------------------------------------------------- the ring card: picture px -> its own place
assert tuple(ring.scale) == (1, 1, 1)
uv = ring.data.uv_layers.active.data
corner = {}
for li, loop in enumerate(ring.data.loops):
    corner[tuple(round(c, 5) for c in uv[li].uv)] = ring.data.vertices[loop.vertex_index].co.copy()
lo, hi = corner[(0.0, 0.0)], corner[(1.0, 1.0)]
assert abs((hi.x - lo.x) * PPU - RW) < 1e-3 and abs((hi.z - lo.z) * PPU - RH) < 1e-3, "the ring card isn't its picture's size"


def card_local(u, v):
    """The ring card's own place (Blender units) of a point of its picture (px, y down)."""
    return Vector((lo.x + (hi.x - lo.x) * u / RW, 0.0, hi.z - (hi.z - lo.z) * v / RH))


def ring_middle():
    t = ring.matrix_world.translation
    return np.array([t.x * PPU, RH - t.z * PPU])


sc.frame_set(sc.frame_start)
middle = ring_middle()                                                       # the ring turns round it (canvas px)
sc.frame_set((sc.frame_start + sc.frame_end) // 2)
assert np.allclose(ring_middle(), middle, atol=1e-3), "the ring moves"

# ---------------------------------------------------------------- how far the loop reaches from the ring's middle
ys, xs = np.nonzero(ring_img[..., 3] > 0)
reaches = {"ring": float(np.hypot(xs + 0.5 - middle[0], ys + 0.5 - middle[1]).max()) + math.sqrt(0.5)}
r0 = Rig("BatRig", (middle[0], RH - middle[1]), card_prefixes=("ring",))   # (Spine px round the ring's middle)
assert r0.pieces == [bat, glow] and r0.cards == [ring], "more than the ring and the bat"
meshes = {}
for name, (o, img, (w, h), res) in MESHES.items():
    g, gX, gY = grid_of(o, w, h)
    P0 = positions(r0, o)[:, g]                                              # (frames, rows, columns, 2)
    on = img[np.clip(gY.astype(int), 0, h - 1)][:, np.clip(gX.astype(int), 0, w - 1), 3] > 0
    reaches[name] = float(np.hypot(*P0[:, on].transpose(2, 0, 1)).max())
    meshes[name] = (g, gX, gY, P0, on)
reach = max(reaches.values())
print("the loop reaches %.1f px from the ring's middle (%.1f, %.1f): %s" % (
    reach, middle[0], middle[1], ", ".join("the %s %.1f" % kv for kv in reaches.items())))

# ---------------------------------------------------------------- the still
side = 2 * reach / FILL
left, top, span = still_square(middle, side)
write(STILL, still(clean(first_frame_render(sc)), middle, side))
print("still: square x%d y%d %dpx -> %s %d KB" % (left, top, span, os.path.basename(STILL), os.path.getsize(STILL) // 1024))
shrink_by = SIZE / span                                                      # atlas px per canvas px

# ---------------------------------------------------------------- the skeleton
origin = (left + span / 2, RH - (top + span / 2))
r = Rig("BatRig", origin, card_prefixes=("ring",))
setup, rest_world, bones_json = setup_pose(r, first_frame=True)
shift = np.array(origin) - np.array([middle[0], RH - middle[1]])              # round the square's middle instead
times, samples, alphas, _ = sample(r, True, {})
bones_tl, _ = timelines(r, setup, times, samples, alphas)                    # (the ring's slot just shows it)

# the bat and its glow: quadtree meshes of their pictures, shrunk to the still's density (the glow's to GLOW_RES of it)
regions, skin, kept = {}, {}, {}
for name, (o, img, (w, h), res) in MESHES.items():
    g, gX, gY, P0, on = meshes[name]
    P = P0 - shift
    dens = shrink_by * scale.x * res                                         # atlas px per picture px
    box = crop_of(img, gX, gY, math.ceil(EDGE / dens))
    j0, j1, i0, i1 = box
    px0, px1, py0, py1 = math.floor(gX[i0]), math.ceil(gX[i1]), math.floor(gY[j0]), math.ceil(gY[j1])
    rname = "%s/%s" % (NAME, name)
    regions[rname] = shrink(img[py0:py1, px0:px1].astype(np.float32) / 255, dens)
    show = showing_cells(regions[rname], gX, gY, box, px0, py0)
    pts, tris, worst, cells = quadtree_mesh(P, box, show)
    src = [int(g[j, i]) for j, i in pts]
    uvs = [((gX[i] - px0) / (px1 - px0), (gY[j] - py0) / (py1 - py0)) for j, i in pts]
    skin[name] = {name: mesh_attachment(r, o, rest_world, rname, src, uvs, tris, None, round((px1 - px0) * scale.x),
                                        round((py1 - py0) * scale.x), max_bones=None)}
    kept[name] = (P, pts)
    seam = float(np.hypot(*(P[-1] - P[0])[on].T).max())
    print("%s: crop %dx%d px, %d of %d cells show, quadtree %d cells: %d points (Blender's grid: %d), %d triangles, "
          "worst %.2f px off Blender; last frame to first moves up to %.2f px" % (
              name, px1 - px0, py1 - py0, show.sum(), show.size, cells, len(src), g.size, len(tris) // 3, worst, seam))

# the ring: its picture, cropped to what shows, on its bone
m = math.ceil(EDGE / shrink_by)
ys, xs = np.nonzero(ring_img[..., 3] > 0)
x0, x1, y0, y1 = max(0, xs.min() - m), min(RW, xs.max() + 1 + m), max(0, ys.min() - m), min(RH, ys.max() + 1 + m)
regions["wild/ring"] = shrink(ring_img[y0:y1, x0:x1].astype(np.float32) / 255, shrink_by)
c = card_local((x0 + x1) / 2, (y0 + y1) / 2)
skin["ring"] = {"ring": {"path": "wild/ring", "x": round(c.x * PPU, 3), "y": round(c.z * PPU, 3),
                         "width": int(x1 - x0), "height": int(y1 - y0)}}
print("ring: crop %dx%d px" % (x1 - x0, y1 - y0))

# back to front: the ring, the glow, the bat
slots_json = [{"name": "ring", "bone": "ring", "attachment": "ring"}] + \
             [{"name": name, "bone": "root", "attachment": name} for name in MESHES]
path = os.path.join(OUT, "%s.json" % NAME)
ring_turn = bones_tl["ring"]["rotate"][-1]["value"]                         # (the idle's: -360, clockwise)
ease = lambda u: 4 * u ** 3 if u < 0.5 else 1 - (2 - 2 * u) ** 3 / 2
spin = {"bones": {"ring": {"rotate": [{"time": round(SPIN_SECONDS * k / SPIN_KEYS, 4),
                                       "value": round(ring_turn * ease(k / SPIN_KEYS), 3)} for k in range(SPIN_KEYS + 1)]}}}
fly = {"bones": {}}
for bone, channels in FLY_BONES.items():
    for channel in channels:
        keys = bones_tl[bone][channel]
        beat = [dict(k) for k in keys if k.get("time", 0) < FLY_BEAT - 1e-6]
        for k in beat:                                                       # (the beat, in FLY_SECONDS)
            if "time" in k:
                k["time"] = round(k["time"] * FLY_SECONDS / FLY_BEAT, 4)
        beat.append({**{n: v for n, v in keys[0].items() if n != "time"}, "time": FLY_SECONDS})   # (back on the setup pose)
        fly["bones"].setdefault(bone, {})[channel] = beat
write_skeleton(path, span, bones_json, slots_json, skin, {"idle": {"bones": bones_tl}, "spin": spin, "fly": fly})
print("spin: the ring once round (%g degrees) over %.2f s, %d keys" % (ring_turn, SPIN_SECONDS, SPIN_KEYS + 1))
print("fly: one %.1f s beat of the wings, ears and feet over %.2f s, %d keys" % (
    FLY_BEAT, FLY_SECONDS, sum(len(k) for t in fly["bones"].values() for k in t.values())))
keys = sum(len(k) for t in bones_tl.values() for k in t.values())
print("idle: %.3f s loop, %d keys (the ring: %s); %d bones, %s %d KB" % (
    times[-1], keys, bones_tl["ring"], len(r.names), os.path.basename(path), os.path.getsize(path) // 1024))
write_atlas(regions, OUT, NAME, page_w=PAGE_W)

if CHECK:                                                                    # Blender's places, to check Spine against
    corners = [card_local(u, v) for u, v in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    frames = sorted(set(range(0, len(times) - 1, CHECK_EVERY)) | {len(times) - 2})
    check = {}
    for k in frames:
        sc.frame_set(sc.frame_start + k)
        check[round(k / r.fps, 4)] = {name: [[round(float(v), 3) for v in P[k, j, i]] for j, i in pts]
                                      for name, (P, pts) in kept.items()}
        check[round(k / r.fps, 4)]["ring"] = [[round(float(v), 3) for v in r.px(ring.matrix_world @ co)] for co in corners]
    with open(CHECK, "w") as fh:
        json.dump({NAME: {"idle": check}}, fh)
    print("check data:", CHECK)
