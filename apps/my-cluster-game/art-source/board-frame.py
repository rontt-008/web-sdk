"""Draws the board frame for BoardFrame.svelte.

- art-source/board-frame-plain.webp: the user's PNG, given as an argument, cleaned up (haze under
  alpha 16 cleared, alpha 240+ made solid), lossless; without an argument, the one already there
- static/assets/board-frame.webp: that with a soft dark brown shadow, padded so the shadow fits, in
  the board's duller, a little greyer look (LOOK)

It prints how far the art reaches, in the padded art's pixels: BOARD_FRAME_ART.visible in
stateGame.svelte.ts. The opening (the inner edges of the wood, where the board goes) is measured
separately and padded by PAD.

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/board-frame.py [<frame.png>]
"""

import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
PLAIN = os.path.join(HERE, 'board-frame-plain.webp')
OUT = os.path.join(HERE, '..', 'static', 'assets', 'board-frame.webp')

HAZE = 16 / 255
SOLID = 240 / 255
SHADOW_COLOUR = np.array([0x3A, 0x16, 0x06], np.float32) / 255
SHADOW = {'sigma': 12, 'down': 8, 'opacity': 0.55}
PAD = 44
# the same look as LOOK in src/game/look.ts (the fox and the board's panel have it too): colours
# keep this share of their saturation, then are mixed this much with mid grey
LOOK = {'saturation': 0.6, 'grey': 0.08}
LUMINANCE = np.array([0.2126, 0.7152, 0.0722], np.float32)

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def read(path):
    pixels = oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)
    assert pixels.shape[2] == 4, f'{path} has no alpha'
    return pixels


def write(pixels, path, compression):
    spec = oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', compression)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), np.ascontiguousarray(pixels, dtype=np.float32))
    assert out.write(path, oiio.UINT8), out.geterror()


def clean(pixels):
    pixels = pixels.copy()
    alpha = pixels[..., 3]
    alpha[alpha < HAZE] = 0
    alpha[alpha >= SOLID] = 1
    pixels[alpha == 0, :3] = 0
    return pixels


def blur(alpha, sigma):
    reach = int(np.ceil(sigma * 3))
    kernel = np.exp(-0.5 * (np.arange(-reach, reach + 1) / sigma) ** 2)
    kernel /= kernel.sum()
    for axis in (0, 1):
        blurred = np.zeros_like(alpha)
        for offset, weight in zip(range(-reach, reach + 1), kernel):
            blurred += np.roll(alpha, offset, axis=axis) * weight
        alpha = blurred
    return alpha


def look(rgb):
    luminance = (rgb @ LUMINANCE)[..., None]
    kept = luminance + LOOK['saturation'] * (rgb - luminance)
    return kept * (1 - LOOK['grey']) + 0.5 * LOOK['grey']


def over(front, back):
    """Straight-alpha front over back."""
    fa, ba = front[..., 3:], back[..., 3:]
    alpha = fa + ba * (1 - fa)
    rgb = (front[..., :3] * fa + back[..., :3] * ba * (1 - fa)) / np.maximum(alpha, 1e-6)
    return np.concatenate([rgb, alpha], axis=2)


if len(sys.argv) > 1:
    write(clean(read(sys.argv[1])), PLAIN, 'lossless')

art = np.pad(read(PLAIN), ((PAD, PAD), (PAD, PAD), (0, 0)))
shadow = np.roll(blur(art[..., 3], SHADOW['sigma']), SHADOW['down'], axis=0) * SHADOW['opacity']
behind = np.empty_like(art)
behind[..., :3] = SHADOW_COLOUR
behind[..., 3] = shadow
frame = over(art, behind)
# lossy WebP blurs the colour under see-through pixels into the soft edges: make it the shadow's
frame[frame[..., 3] == 0, :3] = SHADOW_COLOUR
frame[..., :3] = look(frame[..., :3])
write(frame, OUT, 'webp:90')

ys, xs = np.nonzero(art[..., 3] > HAZE)
print(f'size {frame.shape[1]} x {frame.shape[0]}')
print(f'visible: left {xs.min()}, top {ys.min()}, right {xs.max() + 1}, bottom {ys.max() + 1}')
