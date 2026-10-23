"""Cuts the sky's layers for Background.svelte.

- static/assets/sprites/clouds: each cloud of clouds-*.png on its own, with the wisps near it, all
  packed into one sheet
- static/assets/background-tree.webp: the tree at the top left of static/assets/background.webp, cut
  out of its sky by background-tree-mask.png, so the clouds can pass behind it

Run from apps/my-cluster-game with the Python that comes with Blender (it has numpy and OpenImageIO):
    "<Blender>/5.2/python/bin/python.exe" -I art-source/sky.py [--mask-from <picture>]
With --mask-from (or without a mask), the mask is cut again, by colour, from that picture (or the
background): one whose sky stands out from the leaves, with the tree in the same place.
"""

import json
import os
import sys
from collections import deque

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'static', 'assets')
CLOUD_SOURCES = ['clouds-1.png', 'clouds-2.png', 'clouds-3.png']

# clouds are found at 1/4 size, where they are this solid
DOWN = 4
SOLID = 0.25
# parts this close (in quarter pixels) are one cloud
GROUP = 3
# a cloud with less solid area than this (in pixels) joins the nearest one
MIN_AREA = 5000
# how far (in quarter pixels) a cloud's soft edge and wisps reach
REACH = 10
# fainter than this is cleared
HAZE = 3 / 255
SHEET_WIDTH = 2048
GAP = 2

TREE_MASK = os.path.join(HERE, 'background-tree-mask.png')
# the tree: the top left of the background, above the hills; its sky is fitted with a smooth surface
# over this much of the picture, and pixels this far from it (in 0-255 RGB) are sky, tree or between
TREE_AREA = {'width': 680, 'height': 300}
FIT_AREA = {'width': 1100, 'height': 300}
FIT_ROWS = 270
SKY_DISTANCE = (14, 30)

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute('oiio:UnassociatedAlpha', 1)


def grow(mask, steps):
    for _ in range(steps):
        grown = mask.copy()
        grown[1:] |= mask[:-1]
        grown[:-1] |= mask[1:]
        grown[:, 1:] |= mask[:, :-1]
        grown[:, :-1] |= mask[:, 1:]
        mask = grown
    return mask


def label(mask):
    labels = np.zeros(mask.shape, np.int32)
    count = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if labels[y0, x0]:
            continue
        count += 1
        labels[y0, x0] = count
        queue = deque([(y0, x0)])
        while queue:
            y, x = queue.popleft()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = count
                    queue.append((ny, nx))
    return labels, count


def nearest(labels, reach):
    """Each cell within reach of a labelled one, labelled as the nearest."""
    out = labels.copy()
    queue = deque((y, x, 0) for y, x in zip(*np.nonzero(labels)))
    while queue:
        y, x, distance = queue.popleft()
        if distance == reach:
            continue
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < out.shape[0] and 0 <= nx < out.shape[1] and not out[ny, nx]:
                out[ny, nx] = out[y, x]
                queue.append((ny, nx, distance + 1))
    return out


def split_clouds(path):
    pixels = oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)
    height, width = pixels.shape[:2]
    pad = ((0, -height % DOWN), (0, -width % DOWN), (0, 0))
    pixels = np.pad(pixels, pad)
    alpha = pixels[..., 3]
    small = alpha.reshape(alpha.shape[0] // DOWN, DOWN, alpha.shape[1] // DOWN, DOWN).max(axis=(1, 3)) > SOLID

    groups, count = label(grow(small, GROUP))
    groups[~small] = 0
    # small clouds are left out here, so their pixels go to the nearest big one
    for k in range(1, count + 1):
        if (groups == k).sum() * DOWN * DOWN < MIN_AREA:
            groups[groups == k] = 0
    owners = nearest(groups, REACH)
    owners = np.repeat(np.repeat(owners, DOWN, axis=0), DOWN, axis=1)

    clouds = []
    for k in sorted(set(np.unique(groups)) - {0}, key=lambda k: np.nonzero(groups == k)[1].min()):
        cloud = pixels.copy()
        cloud[(owners != k) | (alpha < HAZE)] = 0
        ys, xs = np.nonzero(cloud[..., 3] > 0)
        y0, y1 = max(ys.min() - GAP, 0), min(ys.max() + 1 + GAP, cloud.shape[0])
        x0, x1 = max(xs.min() - GAP, 0), min(xs.max() + 1 + GAP, cloud.shape[1])
        clouds.append(cloud[y0:y1, x0:x1])
    return clouds


def bleed(pixels, steps=16):
    """The see-through pixels coloured like the nearest seen ones: lossy WebP blurs the colour under
    them into the soft edges, which black would darken."""
    rgb = pixels[..., :3].copy()
    known = pixels[..., 3] > 0
    for _ in range(steps):
        total = np.zeros_like(rgb)
        count = np.zeros(known.shape, np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            shifted = np.roll(np.roll(known, dy, axis=0), dx, axis=1)
            total += np.roll(np.roll(rgb * known[..., None], dy, axis=0), dx, axis=1)
            count += shifted
        fill = ~known & (count > 0)
        rgb[fill] = total[fill] / count[fill][:, None]
        known = known | fill
    rgb[~known] = rgb[known].mean(axis=0)
    return np.concatenate([rgb, pixels[..., 3:4]], axis=2)


def write(pixels, path, compression='webp:90'):
    """Writes straight-alpha pixels as they are, the colour under see-through ones included."""
    spec = oiio.ImageSpec(pixels.shape[1], pixels.shape[0], 4, oiio.FLOAT)
    spec.attribute('oiio:UnassociatedAlpha', 1)
    spec.attribute('compression', compression)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), np.ascontiguousarray(pixels, dtype=np.float32))
    assert out.write(path, oiio.UINT8), out.geterror()


def write_cloud_sheet(clouds):
    # shelves of clouds, tallest first
    order = sorted(range(len(clouds)), key=lambda i: -clouds[i].shape[0])
    places = {}
    x = y = shelf = 0
    for i in order:
        h, w = clouds[i].shape[:2]
        if x and x + w > SHEET_WIDTH:
            x, y, shelf = 0, y + shelf + GAP, 0
        places[i] = (x, y)
        x += w + GAP
        shelf = max(shelf, h)
    sheet_w = max(places[i][0] + clouds[i].shape[1] for i in places)
    sheet_h = max(places[i][1] + clouds[i].shape[0] for i in places)
    sheet = np.zeros((sheet_h, sheet_w, 4), np.float32)
    frames = {}
    for i, cloud in enumerate(clouds):
        (x, y), (h, w) = places[i], cloud.shape[:2]
        sheet[y : y + h, x : x + w] = cloud
        frames[f'cloud_{i + 1}'] = {
            'frame': {'x': x, 'y': y, 'w': w, 'h': h},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': w, 'h': h},
            'sourceSize': {'w': w, 'h': h},
        }
        print(f'SKY cloud_{i + 1}: {w} x {h}')

    out_dir = os.path.join(ASSETS, 'sprites', 'clouds')
    os.makedirs(out_dir, exist_ok=True)
    write(bleed(sheet), os.path.join(out_dir, 'clouds.webp'))
    meta = {'image': 'clouds.webp', 'format': 'RGBA8888', 'size': {'w': sheet_w, 'h': sheet_h}, 'scale': '1'}
    with open(os.path.join(out_dir, 'clouds.json'), 'w') as file:
        json.dump({'frames': frames, 'meta': meta}, file, indent='\t')
        file.write('\n')
    print(f'SKY cloud sheet {sheet_w} x {sheet_h}')


def read_rgb(path):
    return oiio.ImageBuf(path).get_pixels(oiio.FLOAT)[..., :3]


def cut_tree_mask(picture):
    """How much each pixel of the top left is tree rather than sky, in 0 to 1. Cut by colour, so from
    a picture whose sky stands out from the leaves."""
    area = picture[: FIT_AREA['height'], : FIT_AREA['width']] * 255
    height, width = area.shape[:2]
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    u, v = xs / width, ys / height
    terms = np.stack([u**i * v**j for i in range(5) for j in range(5) if i + j <= 4], axis=-1)

    # the sky as a smooth surface, fitted first to the clear sky right of the tree, then again to
    # everything that looks like sky
    sky_mask = np.zeros((height, width), bool)
    sky_mask[:FIT_ROWS, TREE_AREA['width'] - 40 :] = True
    for _ in range(4):
        sky = np.empty_like(area)
        for c in range(3):
            coefficients, *_ = np.linalg.lstsq(terms[sky_mask][::7], area[..., c][sky_mask][::7], rcond=None)
            sky[..., c] = terms @ coefficients
        distance = np.sqrt(((area - sky) ** 2).sum(axis=2))
        sky_mask = distance < SKY_DISTANCE[0] - 2
        sky_mask[FIT_ROWS:] = False

    lo, hi = SKY_DISTANCE
    return np.clip((distance - lo) / (hi - lo), 0, 1)[: TREE_AREA['height'], : TREE_AREA['width']]


def write_tree():
    """The background's own pixels, see-through where the mask is sky; it keeps the tree's shape over
    changes of the background's colours (the sky behind the tree may be too close to the leaves in
    colour to cut it again)."""
    background = read_rgb(os.path.join(ASSETS, 'background.webp'))
    mask = oiio.ImageBuf(TREE_MASK).get_pixels(oiio.FLOAT)[..., 0]
    height, width = mask.shape
    tree = np.concatenate([background[:height, :width], mask[..., None]], axis=2)
    ys, xs = np.nonzero(mask > 0)
    assert xs.min() == 0 and ys.min() == 0, 'the tree no longer starts at the top left corner'
    # under its see-through pixels, the sky it was cut from; lossless, as it must match the background
    # it is drawn over
    tree = tree[: ys.max() + 1, : xs.max() + 1]
    write(tree, os.path.join(ASSETS, 'background-tree.webp'), 'lossless')
    print(f'SKY tree {tree.shape[1]} x {tree.shape[0]} at the top left')


def write_tree_mask(picture_path):
    mask = cut_tree_mask(read_rgb(picture_path))
    out = oiio.ImageBuf(oiio.ImageSpec(mask.shape[1], mask.shape[0], 1, oiio.UINT8))
    out.set_pixels(oiio.ROI(), np.ascontiguousarray(mask[..., None], dtype=np.float32))
    assert out.write(TREE_MASK), out.geterror()
    print(f'SKY tree mask cut from {picture_path}: check {TREE_MASK}')


if '--mask-from' in sys.argv:
    write_tree_mask(sys.argv[sys.argv.index('--mask-from') + 1])
elif not os.path.exists(TREE_MASK):
    write_tree_mask(os.path.join(ASSETS, 'background.webp'))
write_cloud_sheet([cloud for name in CLOUD_SOURCES for cloud in split_clouds(os.path.join(HERE, name))])
write_tree()
