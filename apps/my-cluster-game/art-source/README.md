# Art sources

Originals of art that is processed before it goes into `static/assets` (not loaded by the game).

- `kettuO.blend` and `kettu.blend`: the fox's animations (scene "Fox Sprite", 24 fps), on a rig of
  pieces cut from `fox-plain.webp`, the still fox without its outline. The idle is kettuO's
  LightBreeze (48 frames, looping); the gust is kettu's WindIdle (72 frames), blended in from the
  idle's first pose over its first 12 frames and back out over its last 12, so the game can switch
  between them without a jump. `fox-sheet.py` renders both and packs them into
  `static/assets/sprites/fox` (run it from apps/my-cluster-game with Blender:
  `blender -b -Y art-source/kettuO.blend -S "Fox Sprite" --python art-source/fox-sheet.py`). Each
  frame has the still fox's 9 px dark brown (#3a1606) outline and soft shadow under the paws (ellipse
  at 470, 985 of fox-plain, radii 470 x 40, blur 16, 45% opacity), and is shrunk to 3/8, so the
  frames are 501 x 402 with the paws 378 px down (see Fox.svelte). It also finds the eyes in every
  frame (their outlines, the fur's colours around them and how they move) and writes them to
  `src/game/foxEyes.ts`, for the blink Fox.svelte draws over them.
- `clouds-1.png`, `clouds-2.png`, `clouds-3.png`: clouds on a see-through background. `sky.py` cuts
  each cloud out on its own (with the wisps near it) into `static/assets/sprites/clouds` (cloud_1 to
  cloud_5), and cuts the tree at the top left of `static/assets/background.webp` out of its sky into
  `static/assets/background-tree.webp` (lossless, so it matches the background exactly), for the
  clouds to drift behind (see Background.svelte and Clouds.svelte). Run it again after changing the
  background or the clouds, from apps/my-cluster-game with the Python that comes with Blender:
  `"<Blender>/5.2/python/bin/python.exe" -I art-source/sky.py`.
- `background-tree-mask.png`: the tree's shape for `sky.py` (white tree, black sky), cut by colour
  from the background: the sky and its painted clouds are muted and light, the leaves saturated,
  the trunk and outlines dark; the tree is what is joined to the top left corner, and a gap in it
  is sky only when bluer than red (so a muted lilac leaf stays tree). It holds as long as the tree
  stays where it is; if the background changes it, cut a new one with
  `sky.py --mask-from static/assets/background.webp`, and check it (if the new sky is saturated or
  dark, or the leaves muted, adjust SKY in `sky.py`).
- `leaf-green.webp`, `leaf-brown.webp`, `leaf-red.webp`, `leaf-yellow.webp`: the low symbols (L1 to
  L4), the user's 1254 x 1254 PNGs with haze under alpha 16 cleared and alpha 240+ made solid
  (the green one mirrored, so its tip points left). `symbol-stills.py` draws the
  game's `static/assets/symbols/leaf-*.webp` from them: their thick drawn outline cut away (from the
  edge in, up to 64 px deep) and drawn again thin, 6 px of the 256 px square (about 2 px on a
  screen where a cell is 85 px), in that leaf's own outline colour (the median of the cut
  outline); the red one keeps 75% of its saturation (LEAF_SATURATION); cropped, scaled (Lanczos, premultiplied) so the longer side, line included, is 86% of
  256 px and centred on a 256 x 256 transparent square, lossless; the game stretches the square to
  fill a cell, so the margin is the gap between symbols.
  They have no Spine: their win is drawn in code (`src/game/motion.ts`).
- `blueberries.webp`, `runestone.webp`, `mushroom.webp`, `acorn.webp`: the high symbols (H1 to H4),
  framed tiles: the user's PNGs (1254 x 1254, the rune stone 1024 x 1024; the acorn and mushroom
  came on black without alpha, so the black joined to their edges is made see-through first) with
  the same clean-up (and specks apart from the tile cleared), lossless. `symbol-stills.py` draws the
  game's `static/assets/symbols/<name>.webp` from them: the tile without its drawn black outline
  (cut away from the edge in to the wood) scaled to
  fill the 256 x 256 square. Run it from apps/my-cluster-game with the Python that comes with Blender:
  `"<Blender>/5.2/python/bin/python.exe" -I art-source/symbol-stills.py [blueberries=<new.png> ...]`.
  The game no longer draws these stills: they set where the idle loops' frames go.
- The high symbols' idle loops: the user's 2D cut-out animations, made in Blender in
  `Downloads/blender stuff/<name>_idle` (blueberry, runestone, mushroom, acorn: the .blend, layers,
  scripts and `export/<name>_idle_sheet.png`, 120 frames of 256 x 256 at 30 fps that loop).
  `symbol-idles.py` draws the game's `static/assets/sprites/symbolIdles/<still>-idle.{webp,json}`
  from those sheets: every frame scaled (about 5%) and moved so the tile's wooden frame is where the
  still's is, so the game draws them at the same size (TILE_SIZE in `src/game/constants.ts`, almost
  as big as a cell); 2 px between frames, WebP (webp:90, about 1.9 MB each). The game plays them in
  every state, a win too, all from one clock (`src/game/idleClock.svelte.ts`), each reel 8 frames
  on from the one left of it. Run it again after changing an animation or a still:
  `"<Blender>/5.2/python/bin/python.exe" -I art-source/symbol-idles.py ["<blender stuff folder>"]`.
- `blueberry_slot.blend`, `stump_slot.blend`, `mushroom_slot.blend`, `acorn_slot.blend` and
  `symbol-sheets.py`: the user's 2D cut-out rigs of the previous high symbols (each has a README
  text inside) and the script that rendered their win animations into sprite sheets; not used since
  the framed tiles replaced them. Don't run `symbol-sheets.py` for the tiles: it would also draw
  the old symbols' stills over the new ones.
- `rune-ladder.webp`: the ladder of branches with maple leaves the four rune boxes sit in, left of
  the board (the user's 1024 x 1536 PNG, see-through outside and in its four compartments; haze
  under alpha 16 cleared, alpha 240+ made solid, cropped to the art with 4 px round it: 606 x 1499,
  lossless). `wood-frames.py rune-ladder` draws `static/assets/rune-ladder.webp` (104 KB) in its own
  colours, and prints the compartments (medians of the branches' inner edges: LADDER_ART in
  `src/components/RuneTablets.svelte`). The game draws it as it is, keeping its shape, standing up
  left of the board, or lying down in the bonus meter's place on phones held upright, with a box in
  each compartment under it.
- `rune-box-frame.webp`: the frame that was round each rune box before the ladder (the user's
  1376 x 768 PNG, cleaned the same way: 1298 x 723); not used now.
- `bonus-meter-frame.webp`: the bonus meter, branches and maple leaves round a bar of planks, with a
  wooden sign over it (the user's 1792 x 534 PNG, see-through outside; cleaned and cropped the same
  way, which moved its pixels -8, 4: 1783 x 541, lossless). `wood-frames.py bonus-meter-frame` draws
  `static/assets/bonus-meter-frame.webp` (85 KB) the same way, but in the art's own colours (VIVID: the
  board's duller look turned its planks grey). It also writes `static/assets/bonus-meter-fill.webp`
  (29 KB): the planks alone, green (their grain and seams kept), found by spreading from the middle of
  the bar up to the branches' and leaves' dark outlines (PLANKS in the script); 1504 x 189, at
  138, 259 in the meter's art. The game draws the meter as it is (it keeps its shape,
  BONUS_METER_ART in `src/game/stateGame.svelte.ts`), the green planks over it, shown from the left
  as far as it is full, and the count on the sign (its middle at 885, 146, measured by hand), in
  `src/components/BonusMeter.svelte`.
- `logo.webp`: the game's name, RuneFall, on a wooden sign with maple leaves and a rune stone (the
  user's 1665 x 945 PNG, see-through round it; cleaned and cropped the same way: 1579 x 849,
  lossless). `wood-frames.py logo` draws `static/assets/logo.webp` (192 KB) in its own colours. The
  game draws it right of the board over the bonus meter (LOGO_ART and the layout in
  `src/game/stateGame.svelte.ts`, `src/components/Logo.svelte`).
- Run `wood-frames.py` from apps/my-cluster-game with the Python that comes with Blender, with the
  frame's name and, for a new one, its PNG:
  `"<Blender>/5.2/python/bin/python.exe" -I art-source/wood-frames.py <rune-ladder|bonus-meter-frame|logo> [<new frame.png>]`.
- `board-frame-plain.webp`: the frame of branches wound with vines and autumn leaves, without its
  outline (the user's 1254 x 1254 PNG, see-through in the middle, haze under alpha 16 cleared, alpha
  240+ made solid, lossless). `board-frame.py` draws `static/assets/board-frame.webp` from it: a
  soft dark brown (#3a1606) shadow (Gaussian blur, sigma 12 px, 8 px down, 55% opacity), padded by
  44 px to 1342 x 1342, all in the board's duller look (LOOK, the same as in `src/game/look.ts`). Run it from apps/my-cluster-game with the Python that
  comes with Blender: `"<Blender>/5.2/python/bin/python.exe" -I
  art-source/board-frame.py [<new frame.png>]` (with a PNG, it cleans that into
  `board-frame-plain.webp` first). The branches' inner edges (the opening) are at 186-1175 x
  234-1148, measured from the middle outwards (leaves and vines reach a little further in), and the
  art reaches 64-1287 x 102-1256, which the script prints (see BOARD_FRAME_ART in
  stateGame.svelte.ts). The opening is a little wider than tall, so the art is scaled evenly to fit
  the board's height, with more room left and right of it. The solid panel behind the symbols is
  drawn in code (BoardFrame.svelte), tucked under the branches.
