"""What the symbols' stills and animations share: how the user's cut-outs (1254 x 1254 pictures, transparent round the
symbol) have their alpha cleaned, the square each still shows of its picture, and the still itself.

- The low symbols, the stone letters: art-source/letters/<letter>-source.png, the same canvas as their land and idle
  .blends in blender stuff (stills: letter-symbols.py, animations: letters-spine.py).
- The premiums: the picture packed in each one's drop .blend in blender stuff (stills and animations: premiums-spine.py).

The cut-out's alpha is cleaned: the faint haze round the symbol (alpha SPECK or less) is cleared, and its insides,
stored a touch see-through (alpha ~252), are made solid (alpha OPAQUE or more), so the board doesn't show through.
The symbols of a set are scaled alike, so they keep the sizes the user drew them at: the widest or tallest of them
fills FILL of the still's square. Each is centred on its own outline.
"""
import os
import numpy as np
import OpenImageIO as oiio

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, "art-source", "letters")
LETTERS = ["a", "k", "q", "j"]
SIZE = 256  # px of each still
FILL = 0.94
SPECK = 8
OPAQUE = 240
QUALITY = 92


def read(path):
    """uint8 RGBA, straight (unassociated) alpha, as stored."""
    config = oiio.ImageSpec()
    config.attribute("oiio:UnassociatedAlpha", 1)
    inp = oiio.ImageInput.open(path, config)
    a = np.asarray(inp.read_image(format=oiio.UINT8)).copy()
    inp.close()
    return a


def write(path, img, quality=QUALITY):
    """uint8 straight-alpha RGBA as a webp."""
    spec = oiio.ImageSpec(img.shape[1], img.shape[0], 4, oiio.UINT8)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    spec.attribute("compression", "webp:%d" % quality)
    out = oiio.ImageOutput.create(path)
    out.open(path, spec)
    out.write_image(np.ascontiguousarray(img))
    out.close()


def clean(img):
    """Clears the haze and makes the insides solid, in place (uint8 RGBA)."""
    alpha = img[..., 3]
    img[alpha <= SPECK] = 0
    img[..., 3][alpha >= OPAQUE] = 255
    return img


def squares_of(pictures):
    """Each cleaned picture's still square: {name: (img, (cx, cy) its middle in source px)}, and the square's side in
    source px (the same for all)."""
    out, sides = {}, []
    for name, img in pictures.items():
        ys, xs = np.where(img[..., 3] > 0)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        out[name] = (img, ((x0 + x1) / 2, (y0 + y1) / 2))
        sides.append(max(x1 - x0, y1 - y0))
    return out, max(sides) / FILL


def squares_each(pictures):
    """Like squares_of, but each picture gets its own square (its widest or tallest side fills FILL of it):
    {name: (img, (cx, cy) its middle, side)}."""
    out = {}
    for name, img in pictures.items():
        one, side = squares_of({name: img})
        out[name] = (img, one[name][1], side)
    return out


def squares():
    """The stone letters' squares_of, from their cleaned sources."""
    return squares_of({letter: clean(read(os.path.join(SRC, "%s-source.png" % letter))) for letter in LETTERS})


def still_square(middle, side):
    """The square a still shows, in whole source px: (left, top, span). Its middle is (left + span / 2, top + span / 2)
    (within half a source px of the symbol's own), where its skeleton has its origin."""
    span = int(round(side))
    return int(round(middle[0] - span / 2)), int(round(middle[1] - span / 2)), span


def still(source, middle, side):
    """The still: the square round its middle, on a transparent canvas where it runs off the source, shrunk to SIZE x
    SIZE (premultiplied while shrinking); uint8 straight-alpha RGBA."""
    img = source.astype(np.float32) / 255
    img[..., :3] *= img[..., 3:4]
    left, top, span = still_square(middle, side)
    canvas = np.zeros((span, span, 4), np.float32)
    sx0, sy0 = max(left, 0), max(top, 0)
    sx1, sy1 = min(left + span, img.shape[1]), min(top + span, img.shape[0])
    canvas[sy0 - top : sy1 - top, sx0 - left : sx1 - left] = img[sy0:sy1, sx0:sx1]
    buf = oiio.ImageBuf(oiio.ImageSpec(span, span, 4, oiio.FLOAT))
    buf.set_pixels(oiio.ROI(0, span, 0, span, 0, 1, 0, 4), canvas)
    small = oiio.ImageBufAlgo.resize(buf, roi=oiio.ROI(0, SIZE, 0, SIZE, 0, 1, 0, 4))
    out = np.clip(small.get_pixels(oiio.FLOAT), 0, 1)
    a = out[..., 3:4]
    out[..., :3] = np.where(a > 0, out[..., :3] / np.maximum(a, 1e-6), 0)
    return np.clip(np.round(out * 255), 0, 255).astype(np.uint8)
