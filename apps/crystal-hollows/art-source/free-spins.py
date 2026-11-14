"""The free spins symbol (S, the scatter): the user's FS rock and its two animations, free_spin_drop.blend and
free_spin_activate.blend in blender stuff (what they do and how they're built: blender stuff/folders/free_spin_drop/
README.md, folders/free_spin_activate/README.md). Their rendered frames become:

  static/assets/symbols/free-spins.webp                            the symbol at rest (the drop's last frame, which is
                                                                   the plain artwork), STILL px square
  static/assets/sprites/freeSpinsDrop/freeSpinsDrop.webp + .json   the drop (its land: it falls in, thumps down on frame
                                                                   7, 0.1 s, as the letters and premiums do, bounces once,
                                                                   the F and S burst up and shine)
  static/assets/sprites/freeSpinsActivate/... .webp + .json        the activation (its win: what the scatters play when they
                                                                   trigger the free spins: charge, pop, rays and ring,
                                                                   float, settle)

Both are played at 30 fps (their frames every STEP-th of 60, each fading into the next in the game, SymbolSheet), each
frame cut to what shows and packed on one page, at SCALE (2/11: 200 px a cell, the cell at 1080p, the rock a cell tall).
They have shader effects (glow, flash, shine, rays, a shockwave) that aren't moved pieces, so they're frames, not Spine.
The frames' boxes (sourceSize) are centred on the artwork's middle, so the game draws each centred on the symbol's place:
- the drop's frames are 1254 x 1324, the artwork in their bottom 1254 x 1254 (70 px of room on top for the fall): padded
  7 px on top (to 1331, a multiple of 11) and given a box 1408 tall, its middle the artwork's;
- the activation's are 1654 x 1654, the artwork in their middle: cut 2 px each side (nothing there) to 1650.
It prints the sizes the game draws them at (constants freeSpins(): cells, the rock's tallest side one cell).

Run from apps/crystal-hollows (~1 min), after rendering the .blends' frames:
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/free-spins.py
"""
import os, sys, json, glob
import numpy as np
import OpenImageIO as oiio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from symbols_common import APP, read, write

FOLDERS = os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff", "folders")
DROP = os.path.join(FOLDERS, "free_spin_drop", "frames", "free_spin_drop_%04d.png")
ACTIVATE = os.path.join(FOLDERS, "free_spin_activate", "frames", "free_spin_activate_%04d.png")
STILL = os.path.join(APP, "static", "assets", "symbols", "free-spins.webp")
SPRITES = os.path.join(APP, "static", "assets", "sprites")
ART = 1254           # the artwork's square, px
TOP = 70             # the drop's room above it
DROP_PAD = 7         # px added on top of the drop's frames (1331 = 121 x 11)
ACTIVATE_CUT = 2     # px cut off each side of the activation's frames (1650 = 150 x 11)
SCALE = (2, 11)      # the frames' scale (as a fraction, so the padded and cut frames come out whole)
STILL_PX = 256       # the symbol at rest
STEP = 2             # every other frame: 30 fps
PLAIN_ALPHA = 128    # the rock: what is at least this opaque (its soft edge and haze left out)
HAZE = 3             # alpha (of 255) at most this, after shrinking, is cleared (the renders' faint haze)
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
    s[s[..., 3] * 255 <= HAZE] = 0
    return s


def u8(f):
    return np.clip(np.round(f * 255), 0, 255).astype(np.uint8)


def scaled(px):
    n, d = SCALE
    assert px * n % d == 0, "%d px doesn't scale to whole px" % px
    return px * n // d


def pack(name, images, box_w, box_h, offset_y=0):
    """The frames (float RGBA, all the same size), each cut to what shows, packed on one page: sprites/<name>/<name>.webp
    + .json, each frame's box box_w x box_h with the frame offset_y px down in it."""
    frames = []
    for img in images:
        shows = np.nonzero(u8(img)[..., 3] > 0)
        h, w = img.shape[:2]
        y0, y1 = max(0, shows[0].min() - 1), min(h, shows[0].max() + 2)
        x0, x1 = max(0, shows[1].min() - 1), min(w, shows[1].max() + 2)
        frames.append(("%s_%02d" % (name, len(frames)), img[y0:y1, x0:x1], (int(x0), int(y0) + offset_y)))
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
            "meta": {"app": "art-source/free-spins.py", "image": name + ".webp", "format": "RGBA8888",
                     "size": {"w": PAGE_W, "h": page_h}, "scale": "1"}}
    for k, (frame, img, (tx, ty)) in enumerate(frames):
        px, py = placed[k]
        h, w = img.shape[:2]
        page[py:py + h, px:px + w] = img
        data["frames"][frame] = {"frame": {"x": px, "y": py, "w": w, "h": h}, "rotated": False, "trimmed": True,
                                 "spriteSourceSize": {"x": tx, "y": ty, "w": w, "h": h},
                                 "sourceSize": {"w": box_w, "h": box_h}}
        data["animations"][name].append(frame)
    out = os.path.join(SPRITES, name)
    os.makedirs(out, exist_ok=True)
    write(os.path.join(out, name + ".webp"), u8(page))
    with open(os.path.join(out, name + ".json"), "w", newline="\n") as fh:
        json.dump(data, fh, indent=1)
    print("%s: %d frames in a %dx%d box, cut to what shows, on one %dx%d page: %d KB (%.1f MB on the graphics card)" % (
        name, len(frames), box_w, box_h, PAGE_W, page_h, os.path.getsize(os.path.join(out, name + ".webp")) // 1024,
        PAGE_W * page_h * 4 / 1e6))


def frames_of(pattern):
    """How many frames it has, and the ones played: every STEP-th from 1, and its last (the plain artwork; the twinkles
    fade out till then)."""
    count = len(glob.glob(pattern.replace("%04d", "*")))
    assert count > STEP, "expected the frames rendered (%s)" % pattern
    played = list(range(1, count + 1, STEP))
    return count, played if played[-1] == count else played + [count]


# ---------------------------------------------------------------- the symbol at rest: the drop's last frame
drop_count, drop_frames = frames_of(DROP)
last = read(DROP % drop_count)
assert last.shape[:2] == (ART + TOP, ART), "expected the drop's frames %d x %d (got %s)" % (ART, ART + TOP, last.shape)
assert last[:TOP, :, 3].max() == 0, "the drop's last frame isn't the plain artwork (something above it)"
plain = last[TOP:]
assert np.abs(read(DROP % drop_frames[-1]).astype(int) - last.astype(int)).max() <= 2, "the drop's last frame played isn't the plain artwork"
write(STILL, u8(shrink(plain, STILL_PX, STILL_PX)))
ys, xs = np.nonzero(plain[..., 3] >= PLAIN_ALPHA)
rock = max(xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min())
print("still: %s %dx%d, %d KB; the rock %d x %d px of the %d px artwork" % (
    os.path.basename(STILL), STILL_PX, STILL_PX, os.path.getsize(STILL) // 1024,
    xs.max() + 1 - xs.min(), ys.max() + 1 - ys.min(), ART))

# ---------------------------------------------------------------- the drop: padded on top, its box centred on the art
drop = []
for f in drop_frames:
    img = read(DROP % f)
    padded = np.zeros((img.shape[0] + DROP_PAD, img.shape[1], 4), np.uint8)
    padded[DROP_PAD:] = img
    drop.append(shrink(padded, scaled(ART), scaled(padded.shape[0])))
drop_box = 2 * (DROP_PAD + TOP + ART // 2)  # 1408: its middle the artwork's
pack("freeSpinsDrop", drop, scaled(ART), scaled(drop_box))

# ---------------------------------------------------------------- the activation: cut round, its box its own (centred)
activate_count, activate_frames = frames_of(ACTIVATE)
first = read(ACTIVATE % 1)
side = first.shape[0]
o = (side - ART) // 2
assert first.shape[:2] == (side, side) and side - 2 * o == ART, "expected square frames, the artwork in the middle"
for f in (1, activate_frames[-1], activate_count):
    a = read(ACTIVATE % f)
    # (two renders, so a few of 255 off at most)
    diff = np.abs(a[o:o + ART, o:o + ART].astype(int) - plain.astype(int)).max()
    assert diff <= 4, "the activation's frame %d isn't the plain artwork (off by %d)" % (f, diff)
c = ACTIVATE_CUT
activate = []
for f in activate_frames:
    img = read(ACTIVATE % f)
    for edge in (img[:c], img[-c:], img[:, :c], img[:, -c:]):
        assert edge[..., 3].max() == 0, "something shows in the %d px cut off frame %d" % (c, f)
    activate.append(shrink(img[c:-c, c:-c], scaled(side - 2 * c), scaled(side - 2 * c)))
pack("freeSpinsActivate", activate, scaled(side - 2 * c), scaled(side - 2 * c))

# ---------------------------------------------------------------- what the game draws them at
print("constants FREE_SPINS (cells, the rock's tallest side one cell): rock %d px; still %.4f; drop %.4f x %.4f; activate %.4f" % (
    rock, ART / rock, ART / rock, drop_box / rock, (side - 2 * c) / rock))
print("frames: drop %d (of %d), activate %d (of %d), at %d fps" % (len(drop), drop_count, len(activate), activate_count, 60 // STEP))
