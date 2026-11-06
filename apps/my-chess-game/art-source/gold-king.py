"""Makes the SUPER BONUS's golden king (static/assets/pieces/gK.webp) from the white king (wK.webp, made by
pieces.py): each pixel's lightness picks its colour between a deep brown (the drawing's black lines) and gold
(its white body), the gold a little brighter at the top and deeper at the foot so it reads as metal; the
outline and transparency are kept as they are, so it stands and sizes exactly like the other pieces.

Run from the game's folder with any Python that has Pillow (the math-sdk's env has it):
    ..\\..\\..\\math-sdk\\env\\Scripts\\python.exe art-source\\gold-king.py
"""

import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PIECES = os.path.join(HERE, "..", "static", "assets", "pieces")

# the lines' brown, and the body's gold at the top and at the foot (0-255 RGB)
LINE = np.array([58, 34, 4], dtype=np.float32)
GOLD_TOP = np.array([255, 226, 120], dtype=np.float32)
GOLD_FOOT = np.array([214, 150, 28], dtype=np.float32)


def main():
    king = np.asarray(Image.open(os.path.join(PIECES, "wK.webp")).convert("RGBA"), dtype=np.float32)
    rgb, alpha = king[..., :3], king[..., 3:]
    # how light each pixel is: 0 the lines, 1 the body
    light = (rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32) / 255.0)[..., None]
    # the gold from the top of the picture to its foot
    height = king.shape[0]
    down = (np.arange(height, dtype=np.float32) / (height - 1))[:, None, None]
    gold = GOLD_TOP * (1 - down) + GOLD_FOOT * down
    out = LINE * (1 - light) + gold * light
    image = np.concatenate([np.clip(out, 0, 255), alpha], axis=-1).astype(np.uint8)
    path = os.path.join(PIECES, "gK.webp")
    Image.fromarray(image, "RGBA").save(path, lossless=True)
    print("wrote", os.path.normpath(path))


if __name__ == "__main__":
    main()
