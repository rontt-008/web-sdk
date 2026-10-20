# Art sources

Originals of art that is processed before it goes into `static/assets` (not loaded by the game).

- `fox-plain.webp`: the fox without its outline. `static/assets/fox.webp` is this with a 9 px dark
  brown (#3a1606) outline and a soft shadow under the paws (ellipse at 470, 985, radii 470 x 40, blur
  16, 45% opacity), padded by 13 px, so its paws are 1008 px down a 1251 x 1078 image (see Fox.svelte).
- `board-frame-plain.webp`: the wooden frame without its outline (from the user's PNG, haze under
  alpha 16 cleared, alpha 240+ made solid). `static/assets/board-frame.webp` is the original PNG with
  the same clean-up, a 5 px dark brown (#3a1606) outline and a soft shadow (12 px blur, 8 px down,
  55% opacity), padded by 44 px to 1342 x 1342, which moves its opening to 187-1156 x 192-1146 (see
  BOARD_FRAME_ART in stateGame.svelte.ts). The solid panel behind the symbols is drawn in code
  (BoardFrame.svelte), not in the art.
