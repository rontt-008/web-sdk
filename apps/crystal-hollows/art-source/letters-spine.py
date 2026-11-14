"""The low symbols' animations, exported from the user's .blends in blender stuff as Spine 4.2: one skeleton per stone
letter with two animations (what they do and how they are built and tuned: blender stuff/folders/<letter>_idle and
<letter>_hit, README.md):

  idle   IDLE/<letter>_idle.blend: a seamless loop starting and ending on the still, the letter breathing and leaning a
         little while its moss and the grass sway (120 frames at 30 fps)
  hit    <letter>_hit.blend (top level), when it wins (2026-11-13): the premiums' hit, it crouches, springs up 40 px
         swelling 8% and leaning over, lands with a squash and settles, its moss and grass reacting (72 frames at 60 fps)

  static/assets/spines/letters/letters.atlas + .webp   one page for all four, mipmapped
  static/assets/spines/letters/<letter>.json           each letter's skeleton, its idle and its hit

(Their land, <letter>_land.blend, is no longer exported: the user had the letters' and premiums' lands taken out of the
game on 2026-11-13, the same day the hits came.)

How a rig becomes a skeleton is in spine_common.py. Here:
- The .blends are the same cut (the parts, their pictures and points) on the same rig, checked here, but the hit's rig
  has one more bone, `pop` (the swell and the lean in the air), between `letter` and the moss bones, and the letter
  is weighted to it instead of to `letter`. So the skeleton is built from the hit's .blend; in the idle `pop` rests on
  `letter` (LetterRig), and the idle's `letter` weights are checked against the hit's `pop` ones.
- Bones: the LetterRig bones, under a Spine `root` at the middle of the letter's still (symbols_common.still_square).
- The letter and its grass tufts are weighted meshes on Blender's own grid points, every GRID_PX px of them. Their
  pictures get the stills' alpha clean-up (symbols_common.clean), so at rest they look like the still.
- Pictures are shrunk to the stills' density (SIZE px for the square), so the animations are as sharp as the still.

Run from apps/crystal-hollows (~20 s):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" -b --factory-startup --python art-source/letters-spine.py
  ... -- <check.json>   also writes Blender's own positions at every CHECK_EVERY-th frame there, to check the export
"""
import bpy, os, sys, json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_common import APP, LETTERS, SIZE, clean, squares, still_square
from spine_common import (PPU, Rig, image_px, mesh_points, mesh_attachment, weights_of, setup_pose, sample, timelines,
                          shrink, write_skeleton, write_atlas)

BLENDS = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff")
ANIMATIONS = {"idle": os.path.join("IDLE", "%s_idle.blend"), "hit": "%s_hit.blend"}
SKELETON = "hit"     # the .blend whose bones the skeleton has (only the hit's have `pop`)
LOOPING = {"idle"}
OUT = os.path.join(APP, "static", "assets", "spines", "letters")
NAME = "letters"
GRID_PX = 24         # the meshes' points: Blender's 12 px grid thinned to about this
CHECK_EVERY = 3      # frames between the frames written for the check (and the last)
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
CHECK = argv[0] if argv else None

letters, side = squares()


class LetterRig(Rig):
    """The open .blend's LetterRig, posed in the skeleton's bones (`layout`: the hit's names, parents and rest places,
    with `pop` between `letter` and the moss bones). A bone this .blend doesn't have (the idle's has no `pop`) stays at
    rest on its parent, so the parts hanging from it there move as they do on `letter` here."""

    def __init__(self, origin, layout=None):
        super().__init__("LetterRig", origin)
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


def letter_rig(letter, layout=None):
    """The open .blend's LetterRig, its origin the middle of the letter's still. (The hit's canvas has room on top, the
    picture in its bottom part, where the idle's has it: so the picture's height, not the canvas's.)"""
    sc = bpy.context.scene
    W, H = sc.render.resolution_x, sc.render.resolution_y
    ph, pw = letters[letter][0].shape[:2]
    assert W == pw and H >= ph, "%s: the .blend is not on the letter's canvas" % letter
    left, top, span = still_square(letters[letter][1], side)
    r = LetterRig((left + span / 2, ph - (top + span / 2)), layout)
    r.span = span
    return r


def snapshot(r):
    """What must be the same in the .blends: the bones' rest places (its own bones), and each part's picture, points
    and weights (by the skeleton's bone each group moves with: the idle's `letter` group is the hit's `pop`, the bone
    the letter hangs from)."""
    rest = Rig.worlds(r, rest=True)
    own = {b.name for b in r.bones}
    rename = {"letter": "pop"} if "pop" in r.names and "pop" not in own else {}
    out = {"bones": {b.name: rest[b.name] for b in r.bones}, "pieces": {}}
    for o in r.pieces:
        src, uvs, tris, hull, grid = mesh_points(o, GRID_PX)
        pts = np.array([r.px(o.matrix_world @ o.data.vertices[s].co) for s in src])
        ws = [sorted((rename.get(b, b), w) for b, w in weights_of(o, s)) for s in src]
        out["pieces"][o.name] = (image_px(o)[0], pts, ws, grid)
    return out


def same(a, b, what):
    for n, m in b["bones"].items():
        assert n in a["bones"] and np.allclose(a["bones"][n], m, atol=1e-3), "%s: bone %s moved" % (what, n)
    assert a["pieces"].keys() == b["pieces"].keys(), "%s: other parts %s" % (what, sorted(b["pieces"]))
    for n, (img, pts, ws, grid) in a["pieces"].items():
        img2, pts2, ws2, grid2 = b["pieces"][n]
        assert grid == grid2 and np.array_equal(img, img2), "%s: part %s is cut differently" % (what, n)
        assert np.allclose(pts, pts2, atol=1e-3), "%s: part %s has other points" % (what, n)
        for w1, w2 in zip(ws, ws2):
            assert [k for k, _ in w1] == [k for k, _ in w2] and np.allclose([x for _, x in w1], [x for _, x in w2],
                                                                             atol=1e-4), "%s: %s weighted differently" % (what, n)


regions = {}         # atlas name -> picture (shrunk)
check = {}
for letter in LETTERS:
    # ------------------------------------------------------------ the skeleton, from the hit's .blend
    bpy.ops.wm.open_mainfile(filepath=os.path.join(BLENDS, ANIMATIONS[SKELETON] % letter))
    r = letter_rig(letter)
    layout = {"names": r.names, "parent": r.parent, "rest": r.worlds(rest=True)}
    shrink_by = SIZE / r.span
    setup, rest_world, bones_json = setup_pose(r)

    slots_json, skin, check_points = [], {}, {}
    for o in sorted(r.pieces + r.cards, key=lambda o: -o.matrix_world.translation.y):   # further (larger y) first
        px, iw, ih = image_px(o)
        region = "%s/%s" % (letter, o.name)
        if o in r.cards:                                                     # a square card its picture's size,
            co = [v.co for v in o.data.vertices]                             # centred on its origin
            assert iw == ih and abs((max(c.x for c in co) - min(c.x for c in co)) * PPU - iw) < 0.01, o.name
            regions[region] = shrink(px, shrink_by)
            slots_json.append({"name": o.name, "bone": o.name})
            skin[o.name] = {o.name: {"path": region, "width": iw, "height": ih}}
            check_points[o.name] = ("card", [c.copy() for c in co])
            continue
        regions[region] = shrink(clean(np.clip(np.round(px * 255), 0, 255).astype(np.uint8)).astype(np.float32) / 255, shrink_by)
        src, uvs, tris, hull, (nx, ny) = mesh_points(o, GRID_PX)
        slots_json.append({"name": o.name, "bone": "root", "attachment": o.name})
        skin[o.name] = {o.name: mesh_attachment(r, o, rest_world, region, src, uvs, tris, hull, iw, ih)}
        check_points[o.name] = ("mesh", src)
        print("  %s %-8s %4dx%-4d grid %dx%d = %d points" % (letter, o.name, iw, ih, nx, ny, len(src)))
    cut = snapshot(r)

    # ------------------------------------------------------------ each animation, from its own .blend
    animations, check[letter] = {}, {}
    for anim, path in ANIMATIONS.items():
        bpy.ops.wm.open_mainfile(filepath=os.path.join(BLENDS, path % letter))
        r2 = letter_rig(letter, layout)
        if anim != SKELETON:
            assert not r2.cards, "%s %s: has cards %s" % (letter, anim, [o.name for o in r2.cards])
            same(cut, snapshot(r2), "%s %s" % (letter, anim))
        times, samples, alphas, check[letter][anim] = sample(r2, anim in LOOPING, check_points,
                                                             CHECK_EVERY if CHECK else None)
        bones_tl, slots_tl = timelines(r2, setup, times, samples, alphas)
        animations[anim] = {"bones": bones_tl}
        if slots_tl:
            animations[anim]["slots"] = slots_tl
        print("%s %s: %.3f s%s, %d keys" % (letter, anim, times[-1], " loop" if anim in LOOPING else "",
                                            sum(len(k) for t in bones_tl.values() for k in t.values())))

    path = os.path.join(OUT, "%s.json" % letter)
    write_skeleton(path, r.span, bones_json, slots_json, skin, animations)
    print("%s: %d bones, %d slots, %s %d KB" % (letter, len(r.names), len(slots_json), os.path.basename(path),
                                                os.path.getsize(path) // 1024))

write_atlas(regions, OUT, NAME)
if CHECK:
    with open(CHECK, "w") as fh:
        json.dump(check, fh)
    print("check data:", CHECK)
