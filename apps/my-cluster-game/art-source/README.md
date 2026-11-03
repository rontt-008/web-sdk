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
  They have no Spine: their win is the user's hit, below.
- The leaves' hits: the user's animations, made in Blender, `Downloads/blender stuff/leaf_<colour>_hit.blend`
  (its frames, scripts and README in `blender stuff/folders/leaf_<colour>_hit`): 90 frames of
  1600 x 1600 at 60 fps (1.5 s), the leaf at its art's 1254 px in the middle, coming up toward you
  about 22% and settling back, first and last frames at rest. `leaf-hits.py` makes each frame as the
  leaf's still is (`symbol-stills.py`'s own functions: the green one mirrored, the thick outline cut
  away, as much deeper as the leaf has grown, and drawn again thin, the red one less saturated) and
  moves and scales them all as the still's art (from the first frame) onto a 320 px square, 1.25
  times the still's, so the leaf has room to grow: `static/assets/sprites/symbolHits/leaf-<colour>-hit.{webp,json}`
  (2 px between frames, webp:90, about 1 MB each). Its first frame lies on the still (the game
  draws the square 1.25 times a cell, centred on it, and plays it at 90 fps, 1 s, as the user asked
  for it faster: LEAF_HIT_FRAME_RATE in `src/game/constants.ts`). Run it again after changing an animation or a
  still (about 8 minutes): `"<Blender>/5.2/python/bin/python.exe" -I art-source/leaf-hits.py ["<blender stuff folder>"]`.
- `blueberries.webp`, `runestone.webp`, `mushroom.webp`, `acorn.webp`: the high symbols (H1 to H4),
  framed tiles: the user's PNGs (1254 x 1254, the rune stone 1024 x 1024; the acorn and mushroom
  came on black without alpha, so the black joined to their edges is made see-through first) with
  the same clean-up (and specks apart from the tile cleared), lossless. `symbol-stills.py` draws the
  game's `static/assets/symbols/<name>.webp` from them: the tile without its drawn black outline
  (cut away from the edge in to the wood) scaled to
  fill the 256 x 256 square. Run it from apps/my-cluster-game with the Python that comes with Blender:
  `"<Blender>/5.2/python/bin/python.exe" -I art-source/symbol-stills.py [blueberries=<new.png> ...]`.
  The game no longer draws these stills: they set where the idle loops' frames go.
- `wild.webp`: the wild (W), a stone tile with glowing runes and WILD on it in a frame with rocks on
  its corners (the user's 1237 x 1271 PNG, see-through round it), cleaned and drawn by
  `symbol-stills.py` like the tiles (`wild=<new.png>`), into `static/assets/symbols/wild.webp`,
  which sets where its idle's frames go. Its idle is the user's Blender animation of the whole
  symbol, its letters bobbing and rocking and its runes floating with their glow breathing
  (`Downloads/blender stuff/IDLE/wild_symbol_idle.blend`, its frames, scripts and README in
  `blender stuff/folders/wild_symbol_idle`; `wild_idle` there is the same with only the letters and
  runes): 120 frames of 256 x 263 at 30 fps that loop. Its hit is `blender stuff/wild_hit.blend`
  (`folders/wild_hit`; named without "symbol", HITS in the script): 60 frames at 60 fps, the whole
  symbol bouncing once with its letters in a wave, rendered with the idle's camera, starting and
  ending at rest. `symbol-animations.py` draws them into `static/assets/sprites/symbolIdles/wild-idle`
  and `symbolHits/wild-hit` `.{webp,json}` like the tiles', but on 288 px squares (16 px of room round
  the still's 256, ROOM in the script, as the hit swells past it; 2.4 and 1.5 MB). The game plays the
  idle in every state but a win and the hit on a win, drawn 1.08 cells for the still's square
  (WILD_SIZE and WILD_SHEET in `src/game/constants.ts`, so its frame matches the tiles'), settling as
  it lands.
- The high symbols' idle loops and hits: the user's 2D cut-out animations, made in Blender in
  `Downloads/blender stuff/folders/<name>_idle` and `<name>_hit` (blueberry, runestone, mushroom,
  acorn: layers, scripts and `export/<name>_<kind>_sheet.png`; the idles are 120 frames of 256 x 256
  at 30 fps that loop, the hits 60 frames at 60 fps played once, starting and ending on the tile at
  rest; the hits' .blend files are at the top of `blender stuff`, the idles' in `blender stuff/IDLE`).
  `symbol-animations.py` draws the game's `static/assets/sprites/symbolIdles/<still>-idle.{webp,json}`
  and `symbolHits/<still>-hit.{webp,json}` from those sheets: every frame scaled (about 5%) and moved
  so the tile's wooden frame is where the still's is (the hit is rendered with the idle's camera, so
  both get the same fit), so the game draws them at the same size (TILE_SIZE in
  `src/game/constants.ts`, almost as big as a cell); 2 px between frames, WebP (webp:90, about 1.9 MB
  an idle, 1 MB a hit). The game plays the idles in every state but a win, all from one clock
  (`src/game/idleClock.svelte.ts`), each reel 8 frames on from the one left of it; a win plays the
  hit once (`SymbolHit.svelte`), fading in over the idle in its first 0.1 s and back out to it in its
  last, so it doesn't jump from wherever the loop is. Run it again after changing an animation or a
  still (it also looks for the folders straight in `blender stuff`):
  `"<Blender>/5.2/python/bin/python.exe" -I art-source/symbol-animations.py ["<blender stuff folder>"]`.
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
- `screen-panel.webp`: the panel of the free spins' intro and end screens, a board of planks in a
  frame of branches with maple leaves (the user's 1536 x 1024 PNG, see-through round it; cleaned and
  cropped the same way: 1415 x 932, the planks about 116-1290 x 128-815, lossless).
  `wood-frames.py screen-panel` draws `static/assets/screen-panel.webp` (148 KB) in its own colours.
  `src/components/FreeSpinAnimation.svelte` draws it in place of the sample's purple panel, on the
  panel's Spine bone, with the words and number scaled to sit on its planks.
- `bonus-meter-frame.webp`: the bonus meter, branches and maple leaves round a bar of planks, with a
  wooden sign over it (the user's 1792 x 534 PNG, see-through outside; cleaned and cropped the same
  way, which moved its pixels -8, 4: 1783 x 541, lossless). `wood-frames.py bonus-meter-frame` draws
  `static/assets/bonus-meter-frame.webp` (85 KB) the same way, but in the art's own colours (VIVID: the
  board's duller look turned its planks grey). It also writes `static/assets/bonus-meter-fill.webp`
  (29 KB): the planks alone, green (their grain and seams kept), found by spreading from the middle of
  the bar up to the branches' and leaves' dark outlines (PLANKS in the script); 1504 x 189, at
  138, 259 in the meter's art; and `bonus-meter-fill-super.webp` (30 KB), the same planks orange.
  The game draws the meter as it is (it keeps its shape, BONUS_METER_ART in
  `src/game/stateGame.svelte.ts`), its bar running from 0 to the super bonus's 50: the green planks
  over it from the left as far as it is full, up to a mark at the bonus's 35 (70% of the bar), and
  after the mark the super bonus's zone, the orange planks faint with SUPER on them, filling orange
  on to 50; and the count on the sign (its middle at 885, 146, measured by hand), in
  `src/components/BonusMeter.svelte`.
- `logo.webp`: the game's name, RuneFall, on a wooden sign with maple leaves and a rune stone (the
  user's 1665 x 945 PNG, see-through round it; cleaned and cropped the same way: 1579 x 849,
  lossless), as one picture; the game no longer draws it, as its letters move now (below).
- The logo's idle: the user's Blender animation of it, `Downloads/blender stuff/runefall_idle.blend`
  (its layers, layout.json and scripts in `blender stuff/folders/runefall_idle`): the sign with the
  letters painted out, and its 8 letters, each bobbing 9 px, rocking 2 degrees and swelling 2.5% on
  its own timing, a 4 s loop (120 frames at 30 fps). `logo-idle.py`, run in Blender with that .blend
  open, cuts the sign (cropped like `logo.webp`, so still 1579 x 849: LOGO_ART in
  `src/game/stateGame.svelte.ts`) and the letters (each cropped to itself) into
  `static/assets/sprites/logo/logo-idle.{webp,json}` (16 px apart, as the game mipmaps it; 222 KB),
  and samples each letter's pose in every frame from the .blend into `src/game/logoIdle.ts`.
  `src/components/Logo.svelte` draws the sign and moves the letters on it from those numbers (in
  between frames too), so they stay sharp at any size, right of the board over the bonus meter.
  Run it again after changing the animation:
  `"<Blender>/blender.exe" -b --disable-autoexec "<blender stuff>/runefall_idle.blend" --python-exit-code 1 --python art-source/logo-idle.py`.
- Run `wood-frames.py` from apps/my-cluster-game with the Python that comes with Blender, with the
  frame's name and, for a new one, its PNG:
  `"<Blender>/5.2/python/bin/python.exe" -I art-source/wood-frames.py <rune-ladder|bonus-meter-frame> [<new frame.png>]`.
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
- `symbolrune.png`, `symbolrune2.png`: the rune symbols F (Fehu) and I (Ingwaz), the user's 1254 x 1254
  PNGs. The game loads them as `static/assets/symbols/symbolrune.webp` and `symbolrune2.webp`: resized
  to 512 x 512 (Lanczos, alpha premultiplied) and saved as WebP (quality 90, about 70 KB each); the
  frame measurements in `src/game/constants.ts` (FEHU_FRAME, INGWAZ_FRAME) are shares of the art, so
  they hold for both sizes.
- `fehu_land.blend`, `ingwaz_land.blend`: the user's Blender files of the rune symbols' land
  animations (moved here from `static`, where the build shipped them); `rune-lands.py` makes their
  sprite sheets.
