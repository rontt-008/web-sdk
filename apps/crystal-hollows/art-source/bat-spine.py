"""The crystal bat hovering right of the board (Bat.svelte): the user's bat_attack.blend, already exported to Spine 4.2
by its own scripts (blender stuff/folders/bat_attack/scripts/verify_spine.py -> folders/bat_attack/spine), copied into
the game with its atlas made smaller:

  static/assets/spines/bat/bat.json    the skeleton, as exported (bones, weighted meshes, keys), with its `fly` loop and
                                       its `attack` (played as the free spins trigger); its `backflip` left out
  static/assets/spines/bat/bat.atlas   the atlas, its regions at SCALE and mipmapped (filter MipMapLinearLinear)
  static/assets/spines/bat/bat.webp    its page

That export is the whole bat (since 2026-11-13): bat_fly.blend's fixed cut (folders/bat_fly), with the eyes and the
mouth cut out of the head as parts of their own (for the attack's glare and roar; as drawn in `fly`), on
bat_backflip.blend's rig (bones all off the root, keyed where they are on screen), with all three of its animations.
`attack` (1.8 s: rears back flushing red, quivers, lunges at the viewer, snaps, recovers, blinks) and `backflip` start
and end exactly on `fly`'s first frame. The backflip is left out: the user had it taken off the game the same day.

The export's page is 2048 x 1024 at the art's full size (1536 x 1024 canvas), but the game draws the bat about 450
units wide (under a third of the art's size), so each region is cut out of it, shrunk to SCALE (premultiplied, so the
transparent edges don't darken) and packed again with PAD px between them (room for the smaller mip levels). The
regions are untrimmed and unrotated, and the meshes' UVs are fractions of their region, so the skeleton is unchanged.

Rerun after the bat is exported again (from apps/crystal-hollows):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/bat-spine.py
"""
import os
import json
import numpy as np
import OpenImageIO as oiio

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff", "folders", "bat_attack", "spine")
ANIMATIONS = ["fly", "attack"]  # (its `backflip` left out)
OUT = os.path.join(APP, "static", "assets", "spines", "bat")
SCALE = 0.75
PAD = 8
PAGE_WIDTH = 1024
QUALITY = 92


def parse_atlas(path):
    """The export's atlas: one page, regions with only `bounds` (no rotation, trimming or offsets)."""
    lines = [line.rstrip("\n") for line in open(path, encoding="utf-8")]
    page, regions, current = None, {}, None
    for line in lines:
        if not line.strip():
            continue
        if page is None:
            page = line.strip()
            continue
        if line.startswith("\t") or ":" in line:
            key, value = [part.strip() for part in line.split(":", 1)]
            if current is None:
                assert key in ("size", "filter", "format", "repeat", "pma"), key
                assert not (key == "pma" and value == "true"), "premultiplied pages are not handled"
            else:
                assert key == "bounds", "region %s has %s, which is not handled" % (current, key)
                regions[current] = [int(v) for v in value.split(",")]
        else:
            current = line.strip()
    return page, regions


def read(path):
    config = oiio.ImageSpec()
    config.attribute("oiio:UnassociatedAlpha", 1)
    return oiio.ImageBuf(path, 0, 0, config)


page_name, regions = parse_atlas(os.path.join(SRC, "bat.atlas"))
page = read(os.path.join(SRC, page_name))
page = oiio.ImageBufAlgo.premult(page)

# each region on its own, shrunk
shrunk = {}
for name, (x, y, w, h) in regions.items():
    cut = oiio.ImageBufAlgo.cut(page, oiio.ROI(x, x + w, y, y + h))
    size = (max(1, round(w * SCALE)), max(1, round(h * SCALE)))
    small = oiio.ImageBufAlgo.resize(cut, roi=oiio.ROI(0, size[0], 0, size[1], 0, 1, 0, 4))
    shrunk[name] = np.clip(small.get_pixels(oiio.FLOAT), 0, 1)

# packed in rows, tallest first; the room left at a row's end and under the shorter regions in it (free, rectangles
# x, y, w, h, each with PAD on its right and bottom) taken first by regions that fit, so the small ones (the eyes, the
# mouth) fill gaps instead of starting a row of their own
placed, free, x, y, row = {}, [], PAD, PAD, 0
for name in sorted(shrunk, key=lambda n: -shrunk[n].shape[0]):
    h, w = shrunk[name].shape[:2]
    gap = next((r for r in free if w + PAD <= r[2] and h + PAD <= r[3]), None)
    if gap:
        free.remove(gap)
        gx, gy, gw, gh = gap
        placed[name] = (gx, gy, w, h)
        free += [(gx + w + PAD, gy, gw - w - PAD, h + PAD), (gx, gy + h + PAD, gw, gh - h - PAD)]
        continue
    if x + w + PAD > PAGE_WIDTH:
        free.append((x, y, PAGE_WIDTH - x, row + PAD))
        x, y, row = PAD, y + row + PAD, 0
    placed[name] = (x, y, w, h)
    if row and h < row:
        free.append((x, y + h + PAD, w + PAD, row - h))
    x, row = x + w + PAD, max(row, h)
height = 1 << int(np.ceil(np.log2(max(py + ph for _, py, _, ph in placed.values()) + PAD)))

atlas = np.zeros((height, PAGE_WIDTH, 4), np.float32)
for name, (x, y, w, h) in placed.items():
    atlas[y : y + h, x : x + w] = shrunk[name]
# back to straight alpha, as the page is stored (Pixi premultiplies it again as it uploads it)
alpha = atlas[..., 3:4]
atlas[..., :3] = np.where(alpha > 0, atlas[..., :3] / np.maximum(alpha, 1e-6), 0)
atlas = np.clip(np.round(atlas * 255), 0, 255).astype(np.uint8)

os.makedirs(OUT, exist_ok=True)
webp = os.path.join(OUT, "bat.webp")
spec = oiio.ImageSpec(PAGE_WIDTH, height, 4, oiio.UINT8)
spec.attribute("oiio:UnassociatedAlpha", 1)
spec.attribute("compression", "webp:%d" % QUALITY)
out = oiio.ImageOutput.create(webp)
out.open(webp, spec)
out.write_image(atlas)
out.close()

with open(os.path.join(OUT, "bat.atlas"), "w", encoding="utf-8", newline="\n") as f:
    f.write("bat.webp\n\tsize: %d, %d\n\tfilter: MipMapLinearLinear, Linear\n" % (PAGE_WIDTH, height))
    for name in regions:
        f.write("%s\n\tbounds: %d, %d, %d, %d\n" % ((name,) + placed[name]))

# the skeleton as exported, with only the animations the game plays
with open(os.path.join(SRC, "bat.json"), encoding="utf-8") as f:
    skeleton = json.load(f)
assert set(ANIMATIONS) <= set(skeleton["animations"]), "expected %s in the export" % ANIMATIONS
skeleton["animations"] = {name: skeleton["animations"][name] for name in ANIMATIONS}
with open(os.path.join(OUT, "bat.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(skeleton, f, separators=(",", ":"))

for name in regions:
    print("%-13s %4dx%-4d -> %3dx%-3d at %d,%d" % ((name, *regions[name][2:]) + placed[name][2:] + placed[name][:2]))
print("page %dx%d (%.1f MB on the graphics card with its mipmaps), bat.webp %d KB, bat.json %d KB" % (
    PAGE_WIDTH, height, PAGE_WIDTH * height * 4 * 4 / 3 / 1e6,
    os.path.getsize(webp) // 1024, os.path.getsize(os.path.join(OUT, "bat.json")) // 1024))
