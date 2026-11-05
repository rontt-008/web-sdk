"""Packs the table pieces' animations (static/assets/table-pieces/<piece>-anim.{webp,json}) from the user's
Blender renders: "<blender stuff>/folders/<animation>/frames/*.png", 30 fps, the fist landing on the table on
frame 4 in all three, so they play in step:
- chess_king_table_hit: the king hops and rocks back to where it stood
- chess_pawn_table_hit: the pawn hops, bounces once more and settles
- chess_rook_fall: the rook is knocked over and lies on its side (the still frames at its end are dropped:
  the game holds the last one)

Each is cropped to what moves in it (all its frames together), scaled so the standing piece is DENSITY px
for each unit of its height on the table (HEIGHTS, as in Background.svelte's TABLE_PIECES), and packed
into one sheet with a gap between frames (so they don't bleed into each other when drawn smaller). It
prints, for the game, where the standing piece's foot is in a frame (its anchor, 0-1) and the standing
piece's height in px, so the animation lines up with the still picture of it.

Run from apps/my-chess-game with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\table-piece-anims.py ["<blender stuff folder>"]
"""

import glob
import json
import math
import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "static", "assets", "table-pieces")
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff")
ANIMATIONS = {"king": "chess_king_table_hit", "pawn": "chess_pawn_table_hit", "rook": "chess_rook_fall"}
HEIGHTS = {"king": 140, "pawn": 92, "rook": 108}
DENSITY = 1.75
GAP = 2
# 90 doesn't break; lower WebP qualities have written all-black sheets through OpenImageIO
COMPRESSION = "webp:90"

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute("oiio:UnassociatedAlpha", 1)


def bbox(alpha):
    ys, xs = np.nonzero(alpha > 0.02)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def read_frames(folder):
    files = sorted(glob.glob(os.path.join(SOURCE, "folders", folder, "frames", "*.png")))
    if not files:
        raise SystemExit(f"no frames in {os.path.join(SOURCE, 'folders', folder, 'frames')}")
    frames = [oiio.ImageBuf(file, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT) for file in files]
    # the still frames at the end (the game holds the last): only the first of them kept
    while len(frames) > 1 and np.abs(frames[-1] - frames[-2]).max() < 1e-3:
        frames.pop()
    return frames


def resize(frame, width, height):
    premultiplied = np.ascontiguousarray(np.dstack([frame[..., :3] * frame[..., 3:4], frame[..., 3:4]]), np.float32)
    source = oiio.ImageBuf(oiio.ImageSpec(frame.shape[1], frame.shape[0], 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), premultiplied)
    small = oiio.ImageBufAlgo.resize(source, roi=oiio.ROI(0, width, 0, height, 0, 1, 0, 4)).get_pixels(oiio.FLOAT)
    a = small[..., 3:4]
    return np.clip(np.concatenate([np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0), a], axis=2), 0, 1)


def pack(piece, folder):
    frames = read_frames(folder)
    # the standing piece (frame 1): its foot (the middle of its base) and its height
    x0, y0, x1, y1 = bbox(frames[0][..., 3])
    foot = ((x0 + x1) / 2, y1)
    scale = DENSITY * HEIGHTS[piece] / (y1 - y0)
    # what moves, in all the frames together, with a pixel to spare
    boxes = [bbox(frame[..., 3]) for frame in frames]
    h, w = frames[0].shape[:2]
    ux0, uy0 = max(min(b[0] for b in boxes) - 2, 0), max(min(b[1] for b in boxes) - 2, 0)
    ux1, uy1 = min(max(b[2] for b in boxes) + 2, w), min(max(b[3] for b in boxes) + 2, h)
    width, height = math.ceil((ux1 - ux0) * scale), math.ceil((uy1 - uy0) * scale)
    small = [resize(frame[uy0:uy1, ux0:ux1], width, height) for frame in frames]

    # packed about square
    columns = max(1, round(math.sqrt(len(small) * height / width)))
    rows = -(-len(small) // columns)
    sheet = np.zeros((rows * height + (rows - 1) * GAP, columns * width + (columns - 1) * GAP, 4), np.float32)
    atlas = {}
    for i, frame in enumerate(small):
        x = (i % columns) * (width + GAP)
        y = (i // columns) * (height + GAP)
        sheet[y : y + height, x : x + width] = frame
        atlas[f"{piece}_{i:03d}"] = {
            "frame": {"x": x, "y": y, "w": width, "h": height},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": width, "h": height},
            "sourceSize": {"w": width, "h": height},
        }

    os.makedirs(OUT, exist_ok=True)
    image = f"{piece}-anim.webp"
    spec = oiio.ImageSpec(sheet.shape[1], sheet.shape[0], 4, oiio.FLOAT)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    spec.attribute("compression", COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), np.ascontiguousarray(sheet))
    assert out.write(os.path.join(OUT, image), oiio.UINT8), out.geterror()
    meta = {"image": image, "format": "RGBA8888", "size": {"w": sheet.shape[1], "h": sheet.shape[0]}, "scale": "1"}
    with open(os.path.join(OUT, f"{piece}-anim.json"), "w") as file:
        json.dump({"frames": atlas, "meta": meta}, file, indent="\t")
        file.write("\n")

    anchor = ((foot[0] - ux0) * scale / width, (foot[1] - uy0) * scale / height)
    # the last frame's piece, from the foot, in units on the table (for the rook lying down)
    lx0, ly0, lx1, ly1 = boxes[-1]
    last = [round((v - f) * scale / DENSITY, 1) for v, f in ((lx0, foot[0]), (lx1, foot[0]), (ly0, foot[1]), (ly1, foot[1]))]
    size = os.path.getsize(os.path.join(OUT, image)) / 1e3
    print(
        f"{piece}: {len(small)} frames of {width}x{height} in a {sheet.shape[1]}x{sheet.shape[0]} sheet ({size:.0f} kB); "
        f"anchor {{ x: {anchor[0]:.4f}, y: {anchor[1]:.4f} }}, standing {(y1 - y0) * scale:.1f} px; "
        f"last frame from the foot (units): left {last[0]}, right {last[1]}, top {last[2]}, bottom {last[3]}"
    )


if __name__ == "__main__":
    for piece, folder in ANIMATIONS.items():
        pack(piece, folder)
