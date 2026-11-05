"""Makes the background's picture (static/assets/table.webp) from the user's wooden table with the lamp and
the book (art-source/table.png, 1731 x 909): the same size, as a WebP.

Run with Blender's own Python (it has OpenImageIO):
    & "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\5.2\\python\\bin\\python.exe" -I art-source\\table.py
"""

import os

import OpenImageIO as oiio

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "table.png")
OUT = os.path.join(HERE, "..", "static", "assets", "table.webp")

source = oiio.ImageBuf(SOURCE)
table = oiio.ImageBufAlgo.channels(source, (0, 1, 2))
table.specmod().attribute("Compression", "webp:88")
if not table.write(OUT):
    raise SystemExit(table.geterror())
spec = table.spec()
print(f"wrote {os.path.relpath(OUT, HERE)}: {os.path.getsize(OUT) / 1e3:.0f} kB, {spec.width}x{spec.height}")
