"""Makes the chess pieces' pictures (static/assets/pieces/<colour><piece>.png): the filled chess glyphs of
Segoe UI Symbol (Windows' own font; the conventional shapes, each piece plainly its own), the white pieces
ivory with a dark outline, the black pieces charcoal with a light edge, each on a transparent square.
Without that font (not on Windows) it falls back to DejaVu Sans, which matplotlib ships.

Run from the math-sdk folder (its Python has Pillow and matplotlib):
    .\\env\\Scripts\\python.exe ..\\web-sdk\\apps\\my-chess-game\\art-source\\pieces.py
"""

import os

import matplotlib
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "assets", "pieces")
SEGOE = r"C:\Windows\Fonts\seguisym.ttf"
DEJAVU = os.path.join(matplotlib.get_data_path(), "fonts", "ttf", "DejaVuSans-Bold.ttf")
FONT = SEGOE if os.path.exists(SEGOE) else DEJAVU
SIZE = 256
# the filled (black) glyphs, U+265A to U+265F: king, queen, rook, bishop, knight, pawn
GLYPHS = {"K": "♚", "Q": "♛", "R": "♜", "B": "♝", "N": "♞", "P": "♟"}
COLOURS = {
    "w": {"fill": (246, 240, 226, 255), "outline": (44, 36, 30, 255)},
    "b": {"fill": (46, 42, 48, 255), "outline": (214, 206, 190, 255)},
}
OUTLINE = 7
SHADOW = (0, 0, 0, 110)


def make(colour: str, piece: str) -> Image.Image:
    font = ImageFont.truetype(FONT, int(SIZE * 0.82))
    glyph = GLYPHS[piece]
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    # where the glyph lands, to centre it
    probe = ImageDraw.Draw(image)
    left, top, right, bottom = probe.textbbox((0, 0), glyph, font=font, stroke_width=OUTLINE)
    x = (SIZE - (right - left)) / 2 - left
    y = (SIZE - (bottom - top)) / 2 - top

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text((x, y + SIZE * 0.03), glyph, font=font, fill=SHADOW, stroke_width=OUTLINE, stroke_fill=SHADOW)
    shadow = shadow.filter(ImageFilter.GaussianBlur(SIZE * 0.02))
    image.alpha_composite(shadow)

    draw = ImageDraw.Draw(image)
    colours = COLOURS[colour]
    draw.text((x, y), glyph, font=font, fill=colours["fill"], stroke_width=OUTLINE, stroke_fill=colours["outline"])
    return image


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for colour in COLOURS:
        for piece in GLYPHS:
            make(colour, piece).save(os.path.join(OUT, f"{colour}{piece}.png"))
            print(f"wrote pieces/{colour}{piece}.png")
