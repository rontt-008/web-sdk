"""The tall wild, from the user's bat_ring_to_wild.blend in blender stuff (what it does and how it is built and tuned:
blender stuff/folders/bat_ring_to_wild/README.md): the bat ring (the wild) morphs into the big WILD that fills its reel,
1 cell wide and 4 tall. Its rendered frames (folders/bat_ring_to_wild/frames, 763 x 2668: four cells of 667 px with
SIDE_PAD px of room each side for the bat as it swells and flashes; the ring starts in the reel's middle) become:

  static/assets/symbols/wild-tall.webp                   the WILD at rest, STILL_W x 4 STILL_W (256 x 1024)
  static/assets/sprites/wildMorph/wildMorph.webp + .json  the morph, frames 1 to FINAL - 1 every STEP-th (60 fps / STEP),
                                                         the WILD MORPH_W x 4 MORPH_W (and its room each side), each
                                                         cut to what shows, on one page

Its last frames (FINAL on) are exactly the WILD (between the rooms), so the still takes over from the morph's last frame. The morph is
shrunk more than the still: it is over in 1.4 s, and its frames are most of what it weighs on the graphics card.

And the way back, from the user's wild_to_bat_ring.blend (folders/wild_to_bat_ring, the same size; its first frames are
exactly the WILD, its last exactly the bat ring in the reel's middle, as the morph's first):

  static/assets/sprites/wildUnmorph/wildUnmorph.webp + .json  frames BACK_FROM to its last every STEP-th, packed the same

And the WILD's hit, from the user's wild_bat_hit.blend (folders/wild_bat_hit, the same size): only what changes in each
frame, on the still's grid, to draw over the still (see the end):

  static/assets/sprites/wildHit/wildHit.webp + .json

Run from apps/crystal-hollows (~30 s), after rendering the .blend's frames:
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/wild-tall.py
"""
import os, sys, json, glob
import numpy as np
import OpenImageIO as oiio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_common import APP, read, write

PROJECT = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff", "folders", "bat_ring_to_wild")
FRAMES = os.path.join(PROJECT, "frames", "bat_ring_to_wild_%04d.png")
STILL = os.path.join(APP, "static", "assets", "symbols", "wild-tall.webp")
SPRITES = os.path.join(APP, "static", "assets", "sprites")
BACK = os.path.join(os.path.dirname(PROJECT), "wild_to_bat_ring", "frames", "wild_to_bat_ring_%04d.png")
BACK_FROM = 2        # (its frames 1-2 are the plain WILD: from 2, so that every other frame ends on its last)
STILL_W = 256        # the WILD at rest: 256 x 1024 (the user's size for it)
SIDE_PAD = 48        # px of room each side of the WILD in the frames (rig.py SIDE_PAD)
MORPH_W = 192        # the morph's frames: 192 x 768
STEP = 2             # every other frame: 30 fps
FINAL = 84           # from this frame on, the plain WILD (rig.py FINAL_FRAME)
PAGE_W = 2048
PAD = 2              # px between frames on the page


def shrink(img, w, h):
    """uint8 straight-alpha RGBA shrunk to w x h (premultiplied while resizing); float straight alpha."""
    f = img.astype(np.float32) / 255
    f[..., :3] *= f[..., 3:4]
    buf = oiio.ImageBuf(oiio.ImageSpec(img.shape[1], img.shape[0], 4, oiio.FLOAT))
    buf.set_pixels(oiio.ROI(0, img.shape[1], 0, img.shape[0], 0, 1, 0, 4), f)
    s = np.clip(oiio.ImageBufAlgo.resize(buf, roi=oiio.ROI(0, w, 0, h, 0, 1, 0, 4)).get_pixels(oiio.FLOAT), 0, 1)
    a = s[..., 3:4]
    s[..., :3] = np.where(a > 0, s[..., :3] / np.maximum(a, 1e-6), 0)
    return s


def u8(f):
    return np.clip(np.round(f * 255), 0, 255).astype(np.uint8)


count = len(glob.glob(FRAMES.replace("%04d", "*")))
first = read(FRAMES % 1)
H, W = first.shape[:2]
CELL = H // 4
assert W == CELL + 2 * SIDE_PAD, "expected frames four cells tall with SIDE_PAD each side (got %d x %d)" % (W, H)
assert count >= FINAL, "expected the frames rendered (%d of them)" % count

# ---------------------------------------------------------------- the WILD at rest: its last frame
last = read(FRAMES % count)
assert np.abs(last.astype(int) - read(FRAMES % FINAL).astype(int)).max() <= 2, "the morph's end isn't still"
assert last[:, :SIDE_PAD, 3].max() == 0 and last[:, -SIDE_PAD:, 3].max() == 0, "the WILD reaches into the room"
write(STILL, u8(shrink(last[:, SIDE_PAD:SIDE_PAD + CELL], STILL_W, 4 * STILL_W)))
print("still: %s %dx%d, %d KB" % (os.path.basename(STILL), STILL_W, 4 * STILL_W, os.path.getsize(STILL) // 1024))

# ---------------------------------------------------------------- the morph and the way back: shrunk, cut, packed
mw, mh = int(round(MORPH_W * W / CELL)), 4 * MORPH_W      # (the room each side as well)


def pack(name, images, size=None):
    """The frames (float RGBA, each `size` w x h: by default the paths' frames shrunk to mw x mh), each cut to what shows,
    packed on one page: sprites/<name>/<name>.webp + .json."""
    sw, sh = size or (mw, mh)
    frames = []
    for img in images:
        if isinstance(img, str):
            img = shrink(read(img), sw, sh)
        shows = np.nonzero(u8(img)[..., 3] > 0)
        y0, y1 = max(0, shows[0].min() - 1), min(sh, shows[0].max() + 2)
        x0, x1 = max(0, shows[1].min() - 1), min(sw, shows[1].max() + 2)
        frames.append(("%s_%02d" % (name, len(frames)), img[y0:y1, x0:x1], (int(x0), int(y0))))
    # shelves, tallest first (each frame keeps its place in the animation by name)
    order = sorted(range(len(frames)), key=lambda k: -frames[k][1].shape[0])
    placed, x, y, shelf = {}, PAD, PAD, 0
    for k in order:
        h, w = frames[k][1].shape[:2]
        if x + w + PAD > PAGE_W:
            x, y, shelf = PAD, y + shelf + PAD, 0
        placed[k] = (x, y)
        x, shelf = x + w + PAD, max(shelf, h)
    page_h = y + shelf + PAD
    assert page_h <= 4096, "%s: the page is %d px tall: some graphics cards take no more than 4096" % (name, page_h)
    page = np.zeros((page_h, PAGE_W, 4), np.float32)
    data = {"frames": {}, "animations": {name: []},
            "meta": {"app": "art-source/wild-tall.py", "image": name + ".webp", "format": "RGBA8888",
                     "size": {"w": PAGE_W, "h": page_h}, "scale": "1"}}
    for k, (frame, img, (tx, ty)) in enumerate(frames):
        px, py = placed[k]
        h, w = img.shape[:2]
        page[py:py + h, px:px + w] = img
        data["frames"][frame] = {"frame": {"x": px, "y": py, "w": w, "h": h}, "rotated": False, "trimmed": True,
                                 "spriteSourceSize": {"x": tx, "y": ty, "w": w, "h": h},
                                 "sourceSize": {"w": sw, "h": sh}}
        data["animations"][name].append(frame)
    out = os.path.join(SPRITES, name)
    os.makedirs(out, exist_ok=True)
    write(os.path.join(out, name + ".webp"), u8(page))
    with open(os.path.join(out, name + ".json"), "w", newline="\n") as fh:
        json.dump(data, fh, indent=1)
    print("%s: %d frames at %dx%d, cut to what shows, on one %dx%d page: %d KB (%.1f MB on the graphics card)" % (
        name, len(frames), sw, sh, PAGE_W, page_h, os.path.getsize(os.path.join(out, name + ".webp")) // 1024,
        PAGE_W * page_h * 4 / 1e6))


pack("wildMorph", [FRAMES % f for f in range(1, FINAL, STEP)])

back = len(glob.glob(BACK.replace("%04d", "*")))
assert read(BACK % 1).shape == first.shape, "the way back isn't the morph's size"
assert np.abs(read(BACK % BACK_FROM).astype(int) - last.astype(int)).max() <= 2, "the way back doesn't start on the WILD"
assert np.abs(read(BACK % back).astype(int) - first.astype(int)).max() <= 2, "the way back doesn't end on the bat ring"
assert (back - BACK_FROM) % STEP == 0, "every STEP-th frame from BACK_FROM doesn't end on its last"
pack("wildUnmorph", [BACK % f for f in range(BACK_FROM, back + 1, STEP)])

# ---------------------------------------------------------------- the WILD's hit: only what changes, over the still
# The user's wild_bat_hit.blend (folders/wild_bat_hit, the same size; its frames 1 and 99-108 are exactly the WILD): the
# bat on the WILD crouches, springs up, throws its wings open (glowing, sparkles) and settles. Only the bat and what is
# round it change, so each of its frames HIT_FROM to HIT_TO is kept only where it differs from the WILD (alpha 0
# elsewhere), on the still's own grid (the WILD's 667 px to STILL_W, HIT_ROOM still px of room each side for the wing
# tips), so TallWild draws it over the still and it lines up exactly:
#
#   static/assets/sprites/wildHit/wildHit.webp + .json   every HIT_STEP-th frame, STILL_W + 2 HIT_ROOM x 4 STILL_W, cut
HIT = os.path.join(os.path.dirname(PROJECT), "wild_bat_hit", "frames", "wild_bat_hit_%04d.png")
HIT_FROM, HIT_TO = 2, 98      # (it is already 1.5 times as slow as at first, SLOW in its rig.py: 108 frames, 1.8 s)
HIT_STEP = 2         # every other frame, 30 fps (the game fades each into the next): half the page
HIT_ROOM = 19        # still px each side (SIDE_PAD source px is ~18.4 of them)
HIT_SAME = 1.5 / 255  # premultiplied difference under which a pixel is the WILD's own
HIT_GROW = 2         # px round what changes that is kept too (the shrink spreads a change that far)


def area_taps(n_out, n_in, step, offset):
    """Output px i is the mean of the input over [(i - offset) step, (i + 1 - offset) step): the few input px each
    output px takes (n_out x taps) and how much of each (0 past the input's ends)."""
    a = (np.arange(n_out) - offset) * step
    taps = int(np.ceil(step)) + 1
    j = np.floor(a)[:, None].astype(int) + np.arange(taps)[None, :]
    w = np.clip(np.minimum(a[:, None] + step, j + 1) - np.maximum(a[:, None], j), 0, None) / step
    w[(j < 0) | (j >= n_in)] = 0
    return np.clip(j, 0, n_in - 1), w.astype(np.float32)


STEP_PX = CELL / STILL_W
TAPS_X = area_taps(STILL_W + 2 * HIT_ROOM, W, STEP_PX, HIT_ROOM - SIDE_PAD / STEP_PX)
TAPS_Y = area_taps(4 * STILL_W, H, STEP_PX, 0)


def on_still_grid(img):
    """uint8 straight RGBA hit frame on the still's grid (room each side): float, premultiplied."""
    f = img.astype(np.float32) / 255
    f[..., :3] *= f[..., 3:4]
    (jx, wx), (jy, wy) = TAPS_X, TAPS_Y
    across = (f[:, jx, :] * wx[None, :, :, None]).sum(axis=2)               # (rows, out cols, 4)
    return (across[jy, :, :] * wy[:, :, None, None]).sum(axis=1)             # (out rows, out cols, 4)


def straight(pre):
    a = pre[..., 3:4]
    return np.concatenate([np.where(a > 0, np.clip(pre[..., :3] / np.maximum(a, 1e-6), 0, 1), 0), a], axis=-1)


hits = len(glob.glob(HIT.replace("%04d", "*")))
assert read(HIT % 1).shape == first.shape, "the hit isn't the morph's size"
assert np.abs(read(HIT % 1).astype(int) - last.astype(int)).max() <= 2, "the hit doesn't start on the WILD"
assert hits > HIT_TO and np.abs(read(HIT % (HIT_TO + 1)).astype(int) - last.astype(int)).max() <= 2, \
    "the hit isn't back on the WILD after HIT_TO"
base = on_still_grid(read(HIT % 1))
changed_px = []


def changes(f):
    pre = on_still_grid(read(HIT % f))
    diff = np.abs(pre - base).max(axis=-1) > HIT_SAME
    for _ in range(HIT_GROW):
        diff = diff | np.roll(diff, 1, 0) | np.roll(diff, -1, 0) | np.roll(diff, 1, 1) | np.roll(diff, -1, 1)
    changed_px.append(int(diff.sum()))
    pre[~diff] = 0
    return straight(pre)


assert (HIT_TO - HIT_FROM) % HIT_STEP == 0, "every HIT_STEP-th frame from HIT_FROM doesn't end on HIT_TO"
pack("wildHit", [changes(f) for f in range(HIT_FROM, HIT_TO + 1, HIT_STEP)], size=(STILL_W + 2 * HIT_ROOM, 4 * STILL_W))
print("wildHit: up to %d px of a frame change (of %d)" % (max(changed_px), (STILL_W + 2 * HIT_ROOM) * 4 * STILL_W))
