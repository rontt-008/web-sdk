"""Makes the board's picture (static/assets/board.webp) from the user's board (art-source/board.png, 1254 px
square, its eight by eight squares covering all of it under a thin dark edge): scaled to 1024 px so each
square is exactly 128 px, as a WebP.

Run with Blender's own Python (it has numpy and OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\board.py
"""

import os

import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "board.png")
OUT = os.path.join(HERE, "..", "static", "assets", "board.webp")
SIZE = 1024

source = oiio.ImageBuf(SOURCE)
board = oiio.ImageBufAlgo.resize(source, roi=oiio.ROI(0, SIZE, 0, SIZE, 0, 1, 0, 3))
board.specmod().attribute("Compression", "webp:90")
if not board.write(OUT):
    raise SystemExit(board.geterror())
print(f"wrote {os.path.relpath(OUT, HERE)}: {os.path.getsize(OUT) / 1e3:.0f} kB, {SIZE}x{SIZE}")
