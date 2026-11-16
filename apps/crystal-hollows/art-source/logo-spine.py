"""The Crystal Hollows logo (Logo.svelte), from the user's IDLE/crystal_hollows_title_idle.blend in blender stuff (what it
does and how it is built and tuned: blender stuff/folders/crystal_hollows_title_idle/README.md; the title on its own, cracked stone letters with no plaque, since 2026-11-14: it replaced crystal_hollows_logo2_idle.blend, which had replaced crystal_hollows_logo_idle.blend): the `plaque` (here the black silhouette of the letters' outline), still,
and its 14 letters, each floating on its own (bobbing, swaying, tilting and breathing round its middle), a seamless 4 s
loop. As a Spine 4.2 skeleton, so the game draws the pieces and moves them rather than holding 120 frames:

  static/assets/spines/logo/logo.json            the skeleton: 1 unit = 1 px of the 2000 x 667 logo, its middle at 0, 0;
                                                 the plaque on the root, each letter on a bone of its own; `idle`, the loop
  static/assets/spines/logo/logo.atlas + .webp   one mipmapped page: the plaque and the letters at SCALE of their size

In the .blend each piece is a flat card (a quad of its picture, 1 Blender unit = 100 px) seen by an orthographic camera
over the logo; the letters are keyed every frame on location, rotation (round the camera's axis) and scale. Here a
piece's bone is its card's object (where it is, how it is turned and scaled), and its picture is the part of the card's
image its UVs show, as big as the card. The setup pose is the first frame; the keys (every frame, thinned where a
straight line stays within TOL of them) are offsets from it, and the loop ends with the first frame again one frame after
the last, as Blender loops it. Drawn back to front as in the .blend (the HOLLOWS row is in front of the CRYSTAL row).

Run from apps/crystal-hollows (~10 s):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/blender.exe" -b --factory-startup --python art-source/logo-spine.py
"""
import bpy, os, sys, json, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spine_common import SPINE_VERSION, PPU, image_px, rdp, shrink, write_atlas

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLEND = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff", "IDLE", "crystal_hollows_title_idle.blend")
OUT = os.path.join(APP, "static", "assets", "spines", "logo")
NAME = "logo"
SCALE = 0.32         # the atlas's density: the game draws the logo ~450 px wide at most (the plaque here: 640 px)
PAGE_W = 1024
TOL = {"translate": 0.15, "rotate": 0.02, "scale": 0.0003}   # px, degrees, scale: how far a thinned key line may stray

bpy.ops.wm.open_mainfile(filepath=BLEND)
sc = bpy.context.scene
cam = sc.camera
W, H = sc.render.resolution_x, sc.render.resolution_y
assert cam.data.type == "ORTHO" and abs(cam.data.ortho_scale * PPU - W) < 0.5, "expected an orthographic camera 1 unit = 100 px"
CX, CZ = cam.location.x, cam.location.z                                    # the logo's middle (Blender units)
FPS, F0, F1 = sc.render.fps, sc.frame_start, sc.frame_end


def card(o):
    """The card's quad in its object's own space (px, y up) and the part of its image it shows (px, row 0 = top)."""
    vs = np.array([(v.co.x, v.co.z) for v in o.data.vertices]) * PPU
    uvs = np.array([d.uv[:] for d in o.data.uv_layers.active.data])
    img, iw, ih = image_px(o)
    u0, u1 = uvs[:, 0].min(), uvs[:, 0].max()
    v0, v1 = uvs[:, 1].min(), uvs[:, 1].max()
    crop = img[int(round((1 - v1) * ih)):int(round((1 - v0) * ih)), int(round(u0 * iw)):int(round(u1 * iw))]
    lo, hi = vs.min(axis=0), vs.max(axis=0)
    return {"x": float((lo[0] + hi[0]) / 2), "y": float((lo[1] + hi[1]) / 2),
            "width": float(hi[0] - lo[0]), "height": float(hi[1] - lo[1])}, crop


def pose(o):
    """The object's place (px from the logo's middle, y up), turn (degrees, anticlockwise on screen) and scale."""
    return [(o.location.x - CX) * PPU, (o.location.z - CZ) * PPU, -math.degrees(o.rotation_euler.y), o.scale.x, o.scale.z]


pieces = [o for o in bpy.data.objects if o.type == "MESH" and (o.name == "plaque" or o.name.startswith("letter_"))]
# back to front: farthest from the camera (largest y; the camera looks along +y from in front) first
pieces.sort(key=lambda o: -o.location.y)
letters = [o for o in pieces if o.name != "plaque"]
assert len(letters) == 14 and pieces[0].name == "plaque", "expected the plaque behind 14 letters"

# sample every frame, then the first again one frame after the last (the loop's end)
frames = list(range(F0, F1 + 1))
samples = {o.name: [] for o in letters}
for f in frames:
    sc.frame_set(f)
    for o in letters:
        samples[o.name].append(pose(o))
for o in letters:
    samples[o.name].append(samples[o.name][0])
times = np.array([(f - F0) / FPS for f in frames] + [(F1 + 1 - F0) / FPS])

sc.frame_set(F0)
bones, slots, skin, regions, anim = [{"name": "root"}], [], {}, {}, {}
for o in pieces:
    att, crop = card(o)
    region = "%s/%s" % (NAME, o.name)
    regions[region] = shrink(crop, SCALE)
    if o.name == "plaque":
        x, y, rot, sx, sy = pose(o)
        assert abs(x) < 0.5 and abs(y) < 0.5 and abs(rot) < 1e-6, "expected the plaque in the middle, unturned"
        slots.append({"name": o.name, "bone": "root", "attachment": o.name})
    else:
        x, y, rot, sx, sy = samples[o.name][0]
        bones.append({"name": o.name, "parent": "root", "x": round(x, 3), "y": round(y, 3), "rotation": round(rot, 4),
                      "scaleX": round(sx, 5), "scaleY": round(sy, 5)})
        slots.append({"name": o.name, "bone": o.name, "attachment": o.name})
        s = np.array(samples[o.name])
        rel = {"translate": s[:, 0:2] - s[0, 0:2], "rotate": s[:, 2:3] - s[0, 2], "scale": s[:, 3:5] / s[0, 3:5]}
        tl = {}
        for channel, vals in rel.items():
            keep = rdp(times, vals, TOL[channel])
            keys = []
            for i in keep:
                k = {} if i == 0 else {"time": round(float(times[i]), 4)}
                if channel == "rotate":
                    k["value"] = round(float(vals[i, 0]), 4)
                else:
                    k["x"], k["y"] = round(float(vals[i, 0]), 4 if channel == "translate" else 6), \
                        round(float(vals[i, 1]), 4 if channel == "translate" else 6)
                keys.append(k)
            tl[channel] = keys
        anim[o.name] = tl
    skin[o.name] = {o.name: {"path": region, **{k: round(v, 3) for k, v in att.items()}}}
    print("%-10s card %4.0f x %3.0f px at (%6.1f, %6.1f), picture %d x %d px" % (
        o.name, att["width"], att["height"], att["x"], att["y"], crop.shape[1], crop.shape[0]))

data = {
    "skeleton": {"spine": SPINE_VERSION, "x": -W / 2, "y": -H / 2, "width": W, "height": H, "fps": FPS,
                 "images": "./images/", "audio": ""},
    "bones": bones,
    "slots": slots,
    "skins": [{"name": "default", "attachments": skin}],
    "animations": {"idle": {"bones": anim}},
}
os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, NAME + ".json")
with open(path, "w", newline="\n") as fh:
    json.dump(data, fh, separators=(",", ":"))
keys = sum(len(k) for t in anim.values() for k in t.values())
print("idle: %.2f s loop (%d frames at %d fps), %d keys for %d letters; %s %d KB" % (
    times[-1], len(frames), FPS, keys, len(letters), os.path.basename(path), os.path.getsize(path) // 1024))
write_atlas(regions, OUT, NAME, page_w=PAGE_W)
