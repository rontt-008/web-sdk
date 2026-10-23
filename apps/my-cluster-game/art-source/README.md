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
- `background-tree-mask.png`: the tree's shape for `sky.py` (white tree and hills, black sky), cut
  by colour from the background. It holds as long as the tree stays where it is; if the background
  changes it, cut a new one with `sky.py --mask-from static/assets/background.webp`, and check it
  (a sky too close to the leaves in colour cuts badly: then cut it from a version of the picture
  whose sky is unlike the leaves).
- `board-frame-plain.webp`: the wooden frame without its outline (from the user's PNG, haze under
  alpha 16 cleared, alpha 240+ made solid). `static/assets/board-frame.webp` is the original PNG with
  the same clean-up, a 5 px dark brown (#3a1606) outline and a soft shadow (12 px blur, 8 px down,
  55% opacity), padded by 44 px to 1342 x 1342, which moves its opening to 187-1156 x 192-1146 (see
  BOARD_FRAME_ART in stateGame.svelte.ts). The solid panel behind the symbols is drawn in code
  (BoardFrame.svelte), not in the art.
