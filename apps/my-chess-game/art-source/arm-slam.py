"""Packs the arm slamming its fist on the table, as a bonus starts (static/assets/arm-slam/arm-slam-<n>.{webp,json}
and src/game/armSlamAssets.ts), from the user's Blender render: "<blender stuff>/folders/arm_table_slam/frames/
*.png", 53 frames of 1774 x 887 at 30 fps, the same frame as the drawing (art-source/fist.png): the arm comes
down past the frame's top right corner, the fist hits the table on frame 9 where it is in the drawing,
rests, and lifts away; frames 1-4 and 52-53 are empty (left out).

- each frame is trimmed to what's in it (Pixi places it back by its trim), and scaled down: by BLUR for the
  frames the arm swings through (a motion blur), by CLEAR for the ones the fist is on the table. Each
  sheet holds frames of one scale, which it gives as its meta.scale, so Pixi gives every frame the
  drawing's own size (1774 x 887) whatever it was packed at
- the slow rest (HALF_RATE) is kept at every other frame, each shown twice, so 15 a second
- packed into sheets of at most SHEET px a side, with a gap between frames (so they don't bleed into
  each other when drawn smaller), WebP (COMPRESSION)
- src/game/armSlamAssets.ts: the sheets as assets (loaded when wanted, lazy), the frame each texture is
  (all the sheets' textures in turn) and the frames to show, one per 1/30 s

Run from apps/my-chess-game with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\arm-slam.py ["<blender stuff folder>"]
"""

import glob
import json
import math
import os
import sys

import numpy as np
import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "static", "assets", "arm-slam")
MODULE = os.path.join(HERE, "..", "src", "game", "armSlamAssets.ts")
SOURCE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser("~"), "Downloads", "blender stuff")
FRAMES = os.path.join(SOURCE, "folders", "arm_table_slam", "frames")

FIRST, LAST = 5, 51
# the frames the fist is on the table (from the hit until it lifts off), packed sharper
ON_TABLE = range(9, 42)
CLEAR = 0.55
BLUR = 0.4
HALF_RATE = range(19, 37)
SHEET = 4096
GAP = 2
# 90 doesn't break; lower WebP qualities have written all-black sheets through OpenImageIO
COMPRESSION = "webp:90"

UNASSOCIATED = oiio.ImageSpec()
UNASSOCIATED.attribute("oiio:UnassociatedAlpha", 1)


def load(number):
    path = os.path.join(FRAMES, f"arm_table_slam_{number:04d}.png")
    return oiio.ImageBuf(path, 0, 0, UNASSOCIATED).get_pixels(oiio.FLOAT)


def scaled(frame, scale):
    """The frame trimmed to what's in it and scaled: (pixels, x, y) of the trimmed part in the scaled frame."""
    alpha = frame[..., 3]
    ys, xs = np.nonzero(alpha > 0.004)
    h, w = alpha.shape
    x0, y0 = max(xs.min() - 2, 0), max(ys.min() - 2, 0)
    x1, y1 = min(xs.max() + 3, w), min(ys.max() + 3, h)
    # on the scaled frame's whole px, so the trim lines up
    sx0, sy0 = math.floor(x0 * scale), math.floor(y0 * scale)
    sx1, sy1 = math.ceil(x1 * scale), math.ceil(y1 * scale)
    crop = frame[int(sy0 / scale) : min(h, math.ceil(sy1 / scale)), int(sx0 / scale) : min(w, math.ceil(sx1 / scale))]
    premultiplied = np.ascontiguousarray(np.dstack([crop[..., :3] * crop[..., 3:4], crop[..., 3:4]]), np.float32)
    source = oiio.ImageBuf(oiio.ImageSpec(crop.shape[1], crop.shape[0], 4, oiio.FLOAT))
    source.set_pixels(oiio.ROI(), premultiplied)
    width, height = sx1 - sx0, sy1 - sy0
    small = oiio.ImageBufAlgo.resize(source, roi=oiio.ROI(0, width, 0, height, 0, 1, 0, 4)).get_pixels(oiio.FLOAT)
    a = small[..., 3:4]
    rgba = np.clip(np.concatenate([np.where(a > 1e-4, small[..., :3] / np.maximum(a, 1e-4), 0), a], axis=2), 0, 1)
    return rgba, sx0, sy0


def shelves(items):
    """Packs (number, pixels) into sheets, tallest first, left to right in rows: [(width, height, [(number, x, y)])]."""
    sheets, placed = [], []
    x = y = row = width = 0
    for number, pixels in sorted(items, key=lambda item: -item[1].shape[0]):
        h, w = pixels.shape[:2]
        if x + w > SHEET:
            x, y, row = 0, y + row + GAP, 0
        if y + h > SHEET:
            sheets.append((width, y - GAP, placed))
            placed, x, y, row, width = [], 0, 0, 0, 0
        placed.append((number, x, y))
        width = max(width, x + w)
        row = max(row, h)
        x += w + GAP
    sheets.append((width, y + row, placed))
    return sheets


def write_sheet(index, scale, size, placed, pixels, trims, frame_size):
    width, height = size
    sheet = np.zeros((height, width, 4), np.float32)
    atlas = {}
    for number, x, y in sorted(placed):
        frame = pixels[number]
        h, w = frame.shape[:2]
        sheet[y : y + h, x : x + w] = frame
        tx, ty = trims[number]
        atlas[f"arm_{number:03d}"] = {
            "frame": {"x": x, "y": y, "w": w, "h": h},
            "rotated": False,
            "trimmed": True,
            "spriteSourceSize": {"x": tx, "y": ty, "w": w, "h": h},
            "sourceSize": frame_size,
        }
    image = f"arm-slam-{index}.webp"
    spec = oiio.ImageSpec(width, height, 4, oiio.FLOAT)
    spec.attribute("oiio:UnassociatedAlpha", 1)
    spec.attribute("compression", COMPRESSION)
    out = oiio.ImageBuf(spec)
    out.set_pixels(oiio.ROI(), np.ascontiguousarray(sheet))
    assert out.write(os.path.join(OUT, image), oiio.UINT8), out.geterror()
    meta = {"image": image, "format": "RGBA8888", "size": {"w": width, "h": height}, "scale": str(scale)}
    with open(os.path.join(OUT, f"arm-slam-{index}.json"), "w") as file:
        json.dump({"frames": atlas, "meta": meta}, file, indent="\t")
        file.write("\n")
    size_kb = os.path.getsize(os.path.join(OUT, image)) / 1e3
    print(f"arm-slam-{index}: {len(placed)} frames at {scale} in {width}x{height} ({size_kb:.0f} kB)")
    return [number for number, _, _ in sorted(placed)]


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for old in glob.glob(os.path.join(OUT, "arm-slam-*")):
        os.remove(old)
    full_h, full_w = load(FIRST).shape[:2]
    kept = [n for n in range(FIRST, LAST + 1) if n not in HALF_RATE or (n - HALF_RATE.start) % 2 == 0]
    sequence = [n if n not in HALF_RATE else HALF_RATE.start + (n - HALF_RATE.start) // 2 * 2 for n in range(FIRST, LAST + 1)]

    groups = {CLEAR: [n for n in kept if n in ON_TABLE], BLUR: [n for n in kept if n not in ON_TABLE]}
    keys, texture_frames, area = [], [], 0
    for scale, numbers in groups.items():
        pixels, trims = {}, {}
        for number in numbers:
            pixels[number], tx, ty = scaled(load(number), scale)
            trims[number] = (tx, ty)
        frame_size = {"w": round(full_w * scale), "h": round(full_h * scale)}
        for width, height, placed in shelves(list(pixels.items())):
            index = len(keys)
            texture_frames += write_sheet(index, scale, (width, height), placed, pixels, trims, frame_size)
            keys.append(f"armSlam{index}")
            area += width * height

    lines = [
        "// Generated by art-source/arm-slam.py: the arm slamming its fist on the table (FistSlam), from the user's",
        "// Blender render. Don't edit by hand; run the script again.",
        "",
        "export const ARM_SLAM_ASSETS = {",
    ]
    for index, key in enumerate(keys):
        lines += [
            f"\t{key}: {{",
            "\t\ttype: 'spriteSheet',",
            f"\t\tsrc: new URL('../../assets/arm-slam/arm-slam-{index}.json', import.meta.url).href,",
            "\t\tlazy: true,",
            "\t},",
        ]
    lines += [
        "} as const;",
        "",
        "// the sheets' keys; the frame each of their textures is, all the sheets' in turn; the frames to show,",
        "// one each 1/30 s; and the frame's size (each texture is that size, whatever it was packed at)",
        "export const ARM_SLAM = {",
        f"\tkeys: {json.dumps(keys)},",
        f"\ttextureFrames: {json.dumps(texture_frames)},",
        f"\tsequence: {json.dumps(sequence)},",
        f"\tsize: {{ width: {full_w}, height: {full_h} }},",
        "};",
        "",
    ]
    with open(MODULE, "w", newline="\n") as file:
        file.write("\n".join(lines).replace("\"", "'"))
    print(f"{len(texture_frames)} textures, {len(sequence)} steps; sheets {area / 1e6:.1f} Mpx ({area * 4 / 1e6:.0f} MB on the GPU)")
