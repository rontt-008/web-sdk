"""Cuts where the lake in static/assets/background.webp may move, for Water.svelte.

- static/assets/background-water.png: over the lake's part of the background (AREA), how much each
  pixel ripples, 0 to 1 (grey): 1 on the open water, 0 on the far shore, the bushes and stones in
  front and the ground, fading over a few px between them, so the edges never move and bushes
  never wobble.

The water: pixels smooth across (its streaks run sideways; a bush's leaves change every few px) and
not a warm leaf colour (blue well under green) that is textured or dark, joined to the open lake;
parts it surrounds (reflections, specks) are water too, and so is the band of tree reflections
under the far shore (FAR_BAND, which bushes don't reach). Above the far shore (SHORE, a line along
the sand) nothing moves, and the ripples come in over RAMP px below it.

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/water.py
Run it again if the background changes (and check AREA, SHORE and FAR_BAND still fit it).
"""

import os
from collections import deque

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'static', 'assets')

# the lake's box in the background's px (AREA in src/components/Water.svelte has the same)
AREA = {'x': 360, 'y': 520, 'width': 1312, 'height': 225}
# the far shore's sand, from left to right (x, y): the near land's ends at x 1080, and past it the
# water reaches the hills' shore
SHORE = [(360, 540), (1074, 540), (1086, 528), (1240, 527), (1300, 532), (1420, 533), (1500, 540), (1672, 541)]
RAMP = 15
# the reflections under the far shore, all water, between the bushes at the left and right
FAR_BAND = {'left': 575, 'right': 1380, 'bottom': 612}
# where the open lake is for sure, to start from
CORE = {'left': 640, 'right': 1300, 'top': 545, 'bottom': 640}
# smooth across: the mean change across 3 px (7 x 7 px round each), under this
SMOOTH = 0.04
# a warm leaf colour: blue under this share of green; textured (the mean change across and down)
# over this, or dark (its brightest channel) under this
WARM = 0.78
TEXTURED = 0.05
DARK = 0.55
# how far in from the water's edge the ripples are whole (px), shrunk first so they never reach it
EDGE = {'shrink': 2, 'fade': 5}


def box(values, radius):
    """The mean over a (2 radius + 1) square round each pixel."""
    padded = np.pad(values, (radius + 1, radius), mode='edge')
    total = np.cumsum(np.cumsum(padded, 0), 1)
    size = 2 * radius + 1
    return (total[size:, size:] - total[:-size, size:] - total[size:, :-size] + total[:-size, :-size]) / size**2


def spread(start, allowed):
    """Every pixel of `allowed` joined (side by side) to one of `start`."""
    reached = start & allowed
    queue = deque(zip(*np.nonzero(reached)))
    height, width = allowed.shape
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < height and 0 <= nx < width and allowed[ny, nx] and not reached[ny, nx]:
                reached[ny, nx] = True
                queue.append((ny, nx))
    return reached


def shrink(mask, steps):
    for _ in range(steps):
        mask = mask & np.roll(mask, 1, 0) & np.roll(mask, -1, 0) & np.roll(mask, 1, 1) & np.roll(mask, -1, 1)
    return mask


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


picture = oiio.ImageBuf(os.path.join(ASSETS, 'background.webp')).get_pixels(oiio.FLOAT)[..., :3]
x0, y0 = AREA['x'], AREA['y']
lake = picture[y0 : y0 + AREA['height'], x0 : x0 + AREA['width']]
height, width = lake.shape[:2]
ys, xs = np.mgrid[0:height, 0:width]

across = np.abs(lake[:, 2:] - lake[:, :-2]).max(axis=2)
across = np.pad(across, ((0, 0), (1, 1)), mode='edge')
down = np.abs(lake[2:] - lake[:-2]).max(axis=2)
down = np.pad(down, ((1, 1), (0, 0)), mode='edge')
across, down = box(across, 3), box(down, 3)
warm = lake[..., 2] < WARM * lake[..., 1]
leafy = warm & ((across + down > TEXTURED) | (lake.max(axis=2) < DARK))
shore = np.interp(xs + x0, [x for x, _ in SHORE], [y for _, y in SHORE]) - y0
below_shore = ys > shore + 1

core = np.zeros((height, width), bool)
core[CORE['top'] - y0 : CORE['bottom'] - y0, CORE['left'] - x0 : CORE['right'] - x0] = True
water = spread(core, (across < SMOOTH) & ~leafy & below_shore)
# what it surrounds: everything else not joined to the ground (the bottom edge, or the sides low down),
# a thread a pixel thin (a streak) not joining it
ground = np.zeros_like(water)
ground[-1] = True
ground[height // 2 :, [0, -1]] = True
water |= ~spread(ground, shrink(~water, 1)) & below_shore
band = (xs + x0 >= FAR_BAND['left']) & (xs + x0 <= FAR_BAND['right']) & (ys + y0 <= FAR_BAND['bottom'])
water |= band & below_shore

ripple = box(box(shrink(water, EDGE['shrink']).astype(np.float64), EDGE['fade'] // 2), EDGE['fade'] // 2)
ripple = np.clip(ripple * water * smoothstep(shore + 1, shore + RAMP, ys), 0, 1)

out = oiio.ImageBuf(oiio.ImageSpec(width, height, 1, oiio.UINT8))
out.set_pixels(oiio.ROI(), np.ascontiguousarray(ripple[..., None].astype(np.float32)))
path = os.path.join(ASSETS, 'background-water.png')
assert out.write(path, oiio.UINT8), out.geterror()
print(f'{path}: {width} x {height}, {water.mean():.0%} water, {os.path.getsize(path) / 1024:.0f} KB')
