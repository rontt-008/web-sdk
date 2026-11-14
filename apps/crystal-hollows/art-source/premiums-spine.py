"""The premium symbols, from the user's .blends in blender stuff (what they do and how they are built and tuned:
blender stuff/folders/<blend name>_drop, _idle and _hit, README.md):

  land   <blend name>_drop.blend (top level): the symbol drops in from 95 px above, squashes as it hits the ground, its
         parts lagging and bouncing, and settles on the still (54 frames at 60 fps)
  idle   IDLE/<blend name>_idle.blend: a seamless loop starting and ending on the still, the symbol breathing and
         leaning a little while its parts pulse, rock or sway (120 frames at 30 fps)
  hit    <blend name>_hit.blend (top level), when it wins: it crouches, springs up 40 px swelling 8% and leaning over,
         drops back, lands with a squash and settles on the still, its parts knocked about on springs (72 frames at
         60 fps)

  H1 crystal      blue_crystal
  H2 berries      orange_berries
  H3 stalactite   stalactite
  H4 mushroom     red_mushroom

  static/assets/symbols/<name>.webp                     the still, SIZE x SIZE (symbols_common.still)
  static/assets/spines/premiums/premiums.atlas + .webp   one mipmapped page for all four
  static/assets/spines/premiums/<name>.json             each one's skeleton, its land, idle and hit

Each .blend is one picture (symbol.png, packed in it, 1254 x 1254; the drop's and hit's camera canvas is 70 px taller)
on a grid mesh `symbol` of Blender's ~10 px points, weighted to a DropRig: the `drop` bone squashes, leans and lifts the
whole symbol, a bone per part (cap, stem, crystal, berry, leaf, drip...) moves it on its own. The hit's rig has one
more bone, `pop` (the swell and the lean in the air), between `drop` and the parts, and the rest of the picture is
weighted to it instead of to `drop`. So the skeleton has the hit's bones; in the drop and idle `pop` rests on `drop`
(PremiumRig), which moves everything exactly as their own rigs do. A premium's .blends are otherwise the same picture,
mesh, weights and bones (checked here); each animation is sampled from its own .blend, the idle ending with its first
frame again so it loops. That packed picture is the source of
both the still and the animations, so they start and end exactly on the still. Same clean-up as the letters
(symbols_common), but each premium gets its own square (squares_each: its widest or tallest side fills FILL of it), and
the game draws that square at 1 / FILL cells (constants PREMIUM_SIZE), so each one's biggest side is exactly one cell:
any taller and the board's mask would cut the top and bottom rows' and the hidden rows' would show on the board.

How a rig becomes a skeleton is in spine_common.py. Each part is weighted to its bone almost all or nothing, so next to
each other two of Blender's points can move ~30 px apart, and a grid any coarser than Blender's puts those seams ~14 px
off. So the mesh is spine_common's quadtree over Blender's grid, refined against every frame of all three animations.

- `impact` event where the `drop` bone first comes down on the ground (stateGame's landLead starts the land that long
  before the reel hits the bottom of its slide, like the letters').
- Pictures are cropped to what shows and shrunk to the stills' density (SIZE px for the square).

Run from apps/crystal-hollows (~30 s):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" -b --factory-startup --python art-source/premiums-spine.py
  ... -- <check.json>   also writes Blender's own positions of the mesh's points at every CHECK_EVERY-th frame there
"""
import bpy, os, sys, json, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_common import APP, SIZE, clean, squares_each, still, still_square, write
from spine_common import (PPU, EDGE, Rig, image_px, mesh_attachment, setup_pose, sample, timelines, impact, shrink,
                          write_skeleton, write_atlas, grid_of, positions, crop_of, showing_cells, quadtree_mesh)

BLENDS = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff")
PREMIUMS = {                       # best paying first: their .blends' names
    "crystal": "blue_crystal",
    "berries": "orange_berries",
    "stalactite": "stalactite",
    "mushroom": "red_mushroom",
}
ANIMATIONS = {"land": "%s_drop.blend", "idle": os.path.join("IDLE", "%s_idle.blend"), "hit": "%s_hit.blend"}
SKELETON = "hit"     # the .blend whose bones the skeleton has (only the hit's have `pop`)
LOOPING = {"idle"}
STILLS = os.path.join(APP, "static", "assets", "symbols")
OUT = os.path.join(APP, "static", "assets", "spines", "premiums")
NAME = "premiums"
PAGE_W = 512         # the four pictures (each ~250 px tall) fit two rows of a 512 x 512 page, not one of 1024 x 256
CHECK_EVERY = 3
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
CHECK = argv[0] if argv else None


def picture(o):
    """The symbol's picture (cleaned uint8 RGBA, row 0 = top) and size."""
    px, iw, ih = image_px(o)
    return clean(np.clip(np.round(px * 255), 0, 255).astype(np.uint8)), iw, ih


class PremiumRig(Rig):
    """The open .blend's DropRig, posed in the skeleton's bones (`layout`: the hit's names, parents and rest places,
    with `pop` between `drop` and the parts). A bone this .blend doesn't have (the drop's and idle's have no `pop`) stays
    at rest on its parent, so the parts hanging from it there move as they do on `drop` here."""

    def __init__(self, origin, layout=None):
        super().__init__("DropRig", origin)
        own_parent = dict(self.parent)
        if layout:
            self.names, self.parent, self.rest = layout["names"], layout["parent"], layout["rest"]
            for b in self.bones:                                             # its bones hang the same way, past the
                p = self.parent[b.name]                                      # bones it lacks
                while p is not None and p not in own_parent:
                    p = self.parent[p]
                assert p == own_parent[b.name], "bone %s hangs from %s, not %s" % (b.name, own_parent[b.name], p)

    def worlds(self, rest=False):
        own = super().worlds(rest)
        if not hasattr(self, "rest"):
            return own
        out = {}
        for n in self.names[1:]:                                             # parents before children
            if n in own:
                out[n] = own[n]
            else:
                p = self.parent[n]
                out[n] = out[p] @ np.linalg.inv(self.rest[p]) @ self.rest[n]
        return out


def rig_state(r, o):
    """What a premium's .blends must share: the bones (rest places), the picture, and every point of the mesh (its rest
    place and weights, by the skeleton's bone each group moves with: the drop's and idle's `drop` group is the hit's
    `pop`, the bone the rest of the picture hangs from)."""
    me = o.data
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co)
    own = {b.name for b in r.bones}
    weights = {}
    for g in o.vertex_groups:
        name = "pop" if g.name == "drop" and "pop" in r.names and "pop" not in own else g.name
        weights[name] = np.zeros(len(me.vertices))
    names = list(weights)
    for v in me.vertices:
        for g in v.groups:
            weights[names[g.group]][v.index] = g.weight
    rest = Rig.worlds(r, rest=True)
    return {"bones": {b.name: rest[b.name] for b in r.bones}, "picture": picture(o)[0], "points": co,
            "weights": weights}


def same_rig(a, b, what):
    for n, m in b["bones"].items():
        assert n in a["bones"] and np.allclose(a["bones"][n], m, atol=1e-3), "%s: bone %s moved" % (what, n)
    assert np.array_equal(a["picture"], b["picture"]), "%s: another picture" % what
    assert np.allclose(a["points"], b["points"], atol=1e-5), "%s: the mesh is cut differently" % what
    assert a["weights"].keys() == b["weights"].keys(), "%s: other groups %s" % (what, sorted(b["weights"]))
    for g, w in a["weights"].items():
        assert np.allclose(w, b["weights"][g], atol=1e-4), "%s: %s weighted differently" % (what, g)


# ---------------------------------------------------------------- the pictures, their squares and the stills
pictures = {}
for name, stem in PREMIUMS.items():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(BLENDS, ANIMATIONS["land"] % stem))
    pictures[name] = picture(bpy.data.objects["symbol"])[0]
symbols = squares_each(pictures)
os.makedirs(STILLS, exist_ok=True)
for name in PREMIUMS:
    img, middle, side = symbols[name]
    out = still(img, middle, side)
    write(os.path.join(STILLS, "%s.webp" % name), out)
    left, top, span = still_square(middle, side)
    print("%s: square x%d y%d %dpx -> %s.webp %d KB" % (name, left, top, span, name,
                                                         os.path.getsize(os.path.join(STILLS, "%s.webp" % name)) // 1024))

# ---------------------------------------------------------------- the skeletons
regions, check = {}, {}
for name, stem in PREMIUMS.items():
    _, middle, side = symbols[name]
    left, top, span = still_square(middle, side)
    shrink_by = SIZE / span
    # the skeleton: the hit's bones and rest pose
    bpy.ops.wm.open_mainfile(filepath=os.path.join(BLENDS, ANIMATIONS[SKELETON] % stem))
    ih = image_px(bpy.data.objects["symbol"])[2]
    origin = (left + span / 2, ih - (top + span / 2))
    r = PremiumRig(origin)
    layout = {"names": r.names, "parent": r.parent, "rest": r.worlds(rest=True)}
    setup, rest_world, bones_json = setup_pose(r)
    cut = rig_state(r, bpy.data.objects["symbol"])
    # each animation from its own .blend, the skeleton's last (its weights make the mesh)
    sampled = {}
    for anim, pattern in sorted(ANIMATIONS.items(), key=lambda kv: kv[0] == SKELETON):
        bpy.ops.wm.open_mainfile(filepath=os.path.join(BLENDS, pattern % stem))
        o = bpy.data.objects["symbol"]
        img, iw, ih = picture(o)
        assert np.array_equal(img, pictures[name]), "%s %s: another picture" % (name, anim)
        r = PremiumRig(origin, layout)
        assert r.pieces == [o], "%s %s: more than the one mesh" % (name, anim)
        assert all(r.rig.data.bones[g.name].use_deform for g in o.vertex_groups), "%s: a group of no deforming bone" % name
        same_rig(cut, rig_state(r, o), "%s %s" % (name, anim))
        grid, X, Y = grid_of(o, iw, ih)
        P = positions(r, o)[:, grid]                                        # (frames, rows, columns, 2)
        times, samples, alphas, _ = sample(r, anim in LOOPING, {})
        sampled[anim] = (r.fps, times, samples, alphas, P)

    # the mesh, close to Blender at every frame of them all (o, r: the hit's, whose groups are the skeleton's bones)
    box = crop_of(img, X, Y, math.ceil(EDGE / shrink_by))
    j0, j1, i0, i1 = box
    px0, px1, py0, py1 = math.floor(X[i0]), math.ceil(X[i1]), math.floor(Y[j0]), math.ceil(Y[j1])
    region = shrink(img[py0:py1, px0:px1].astype(np.float32) / 255, shrink_by)
    show = showing_cells(region, X, Y, box, px0, py0)
    pts, tris, worst, cells = quadtree_mesh(np.concatenate([s[-1] for s in sampled.values()]), box, show)
    src = [int(grid[j, i]) for j, i in pts]
    uvs = [((X[i] - px0) / (px1 - px0), (Y[j] - py0) / (py1 - py0)) for j, i in pts]
    rname = "%s/symbol" % name
    regions[rname] = region
    skin = {"symbol": {"symbol": mesh_attachment(r, o, rest_world, rname, src, uvs, tris, None, px1 - px0, py1 - py0)}}
    slots_json = [{"name": "symbol", "bone": "root", "attachment": "symbol"}]
    print("  %s: crop %dx%d px, %d of %d cells show, quadtree %d cells: %d points (Blender's grid: %d), %d triangles, "
          "worst %.2f px off Blender" % (name, px1 - px0, py1 - py0, show.sum(), show.size, cells, len(src),
                                         grid.size, len(tris) // 3, worst))

    animations, check[name] = {}, {}
    still_at = np.column_stack([cut["points"].reshape(-1, 3)[src, 0] * PPU - origin[0],
                                cut["points"].reshape(-1, 3)[src, 2] * PPU - origin[1]])
    for anim, (fps, times, samples, alphas, P) in sampled.items():
        bones_tl, _ = timelines(r, setup, times, samples, alphas)
        animations[anim] = {"bones": bones_tl}
        at = np.array([[P[k, j, i] for j, i in pts] for k in (0, len(P) - 1)])
        off = [float(np.hypot(*(at[k] - still_at).T).max()) for k in (0, 1)]
        note = ", starts %.2f px and ends %.2f px from the still" % tuple(off)
        if anim == "land":
            hit = impact(times, samples, setup, "drop")
            animations[anim]["events"] = [({"time": round(hit, 4)} if hit > 0 else {}) | {"name": "impact"}]
            note += ", impact at %.3f s" % hit
        print("%s %s: %.3f s%s%s, %d keys" % (name, anim, times[-1], " loop" if anim in LOOPING else "", note,
                                              sum(len(k) for t in bones_tl.values() for k in t.values())))
        if CHECK:                                                           # Blender's place for the mesh's points
            frames = sorted(set(range(0, len(P), CHECK_EVERY)) | {len(P) - 1})
            check[name][anim] = {round(k / fps, 4): {"symbol": [[round(float(c), 3) for c in P[k, j, i]] for j, i in pts]}
                                 for k in frames}
    path = os.path.join(OUT, "%s.json" % name)
    write_skeleton(path, span, bones_json, slots_json, skin, animations, events=("impact",))
    print("%s: %d bones, %s %d KB" % (name, len(r.names), os.path.basename(path), os.path.getsize(path) // 1024))

write_atlas(regions, OUT, NAME, page_w=PAGE_W)
if CHECK:
    with open(CHECK, "w") as fh:
        json.dump(check, fh)
    print("check data:", CHECK)
