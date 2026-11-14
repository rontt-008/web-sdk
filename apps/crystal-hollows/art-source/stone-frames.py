"""The user's stone frames round dark blue panels (pictures sent in chat, transparent outside), cut to what is drawn,
made smaller and saved:

  static/assets/free-spins-sign.webp   the free spins sign (FreeSpinCounter; art-source/free-spins-sign-source.png,
                                       2026-11-13: blue stones with green moss), SIGN_WIDTH px wide
  static/assets/info-card.webp         the start screen's info card (LoadingScreen, InfoCard; art-source/
                                       info-card-source.png, 2026-11-14: a tall card of blue stones), CARD_WIDTH px wide

For each it prints its size and its panel's rectangle as fractions of it (the `inner` in the component that draws it):
the inside edge of the panel's dark outline, found by scanning out from the middle along many rows and columns (the
median, so a stone poking in here or there doesn't count). (This was free-spins-sign.py, for the sign alone.)

Run with Blender's Python (numpy + OpenImageIO):
  "C:/Program Files (x86)/Steam/steamapps/common/Blender/5.2/python/bin/python.exe" -I art-source/stone-frames.py
"""
import os
import numpy as np
import OpenImageIO as oiio

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(APP, "art-source")
ASSETS = os.path.join(APP, "static", "assets")
PAD = 2  # px of transparency kept round the cut, so the edge pixels filter cleanly
SPECK = 4  # alpha this low or lower is leftover haze round the cut-out: cleared
FRAMES = [
    # source, saved as, width (px): about its size on a 1440p screen
    ("free-spins-sign-source.png", "free-spins-sign.webp", 720),
    ("info-card-source.png", "info-card.webp", 620),
]


def read(path):
    config = oiio.ImageSpec()
    config.attribute("oiio:UnassociatedAlpha", 1)
    inp = oiio.ImageInput.open(path, config)
    a = np.asarray(inp.read_image(format=oiio.UINT8)).copy()
    inp.close()
    return a


def first_dark(line, start, step):
    i = start
    while 0 <= i < len(line) and line[i] >= 35:
        i += step
    return i


def cut_frame(source, saved, width):
    img = read(os.path.join(ART, source))
    img[img[..., 3] <= SPECK] = 0
    ys, xs = np.where(img[..., 3] > 0)
    x0, y0 = max(xs.min() - PAD, 0), max(ys.min() - PAD, 0)
    x1, y1 = min(xs.max() + 1 + PAD, img.shape[1]), min(ys.max() + 1 + PAD, img.shape[0])
    cut = np.ascontiguousarray(img[y0:y1, x0:x1])
    H, W = cut.shape[:2]

    # the panel: from the middle outwards to the first dark pixel of its outline
    lum = cut[..., 0] * 0.3 + cut[..., 1] * 0.5 + cut[..., 2] * 0.2
    cx, cy = W // 2, H // 2
    rows = range(int(H * 0.3), int(H * 0.7), 4)
    cols = range(int(W * 0.3), int(W * 0.7), 4)
    left = int(np.median([first_dark(lum[y], cx, -1) for y in rows])) + 1
    right = int(np.median([first_dark(lum[y], cx, 1) for y in rows]))
    top = int(np.median([first_dark(lum[:, x], cy, -1) for x in cols])) + 1
    bottom = int(np.median([first_dark(lum[:, x], cy, 1) for x in cols]))

    # smaller (premultiplied while resizing, so the edges don't darken)
    height = round(H * width / W)
    f = cut.astype(np.float32) / 255
    f[..., :3] *= f[..., 3:4]
    buf = oiio.ImageBuf(oiio.ImageSpec(W, H, 4, oiio.FLOAT))
    buf.set_pixels(oiio.ROI(0, W, 0, H, 0, 1, 0, 4), f)
    s = np.clip(oiio.ImageBufAlgo.resize(buf, roi=oiio.ROI(0, width, 0, height, 0, 1, 0, 4)).get_pixels(oiio.FLOAT), 0, 1)
    a = s[..., 3:4]
    s[..., :3] = np.where(a > 0, s[..., :3] / np.maximum(a, 1e-6), 0)
    small = np.clip(np.round(s * 255), 0, 255).astype(np.uint8)

    out = os.path.join(ASSETS, saved)
    spec = oiio.ImageSpec(width, height, 4, oiio.UINT8)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    spec.attribute("compression", "webp:92")
    o = oiio.ImageOutput.create(out)
    o.open(out, spec)
    o.write_image(small)
    o.close()

    print("%s: cut %dx%d (x %d y %d of %dx%d), saved %s %dx%d: %d KB" % (
        source, W, H, x0, y0, img.shape[1], img.shape[0], saved, width, height, os.path.getsize(out) // 1024))
    print("  aspect (height / width) %.4f" % (H / W))
    print("  inner: x %.4f y %.4f width %.4f height %.4f (px %d %d %d %d)" % (
        left / W, top / H, (right - left) / W, (bottom - top) / H, left, top, right - left, bottom - top))


for frame in FRAMES:
    cut_frame(*frame)
