import { Tween } from 'svelte/motion';

import { stateBetDerived } from 'state-shared';

import { BOARD_NUDGE } from './constants';

// The board's nudge as a spin starts (the user, 2026-11-14: "when you spin make the board move slightly
// down and then returning", then "make the board go down as soon as you press spin and make it smooth"):
// the board, its frame and the reels' anticipation columns (BoardContainer, BoardFrame, Anticipation) all
// go down BOARD_NUDGE.distance and come back, as if pressed. boardNudgeY is how far down they are now
// (main layout units).
// - When: the moment Spin is pressed (the UI's `bet` event, Board: nudgeBoardOnPress), not when the round
//   comes back from the RGS; a spin nobody pressed for (autoplay, free spins) nudges as it starts (the
//   reveal handler: nudgeBoardOnSpin), and one that follows a press within pressWindowMs doesn't again.
// - How: one smooth move, `t` (0 to 1) through it at the game's speed: down over its first `down` of it
//   (setting off at once, as pressed, and slowing to a stop: a quarter sine), then back up (easing in
//   and out: a half cosine). No hold at the bottom, no bounce.

const t = new Tween(1);
let lastPress = -Infinity;

const at = (p: number) => {
	const { distance, down } = BOARD_NUDGE;
	if (p >= 1) return 0;
	if (p < down) return distance * Math.sin((Math.PI / 2) * (p / down));
	return (distance * (1 + Math.cos(Math.PI * ((p - down) / (1 - down))))) / 2;
};

export const boardNudgeY = () => at(t.current);

const nudge = () => {
	// (one at a time: a second asked for while one runs would jump)
	if (t.current < 1) return;
	const timeScale = stateBetDerived.timeScale() || 1;
	t.set(0, { duration: 0 });
	t.set(1, { duration: BOARD_NUDGE.durationMs / timeScale });
};

export const nudgeBoardOnPress = () => {
	lastPress = performance.now();
	nudge();
};

export const nudgeBoardOnSpin = () => {
	if (performance.now() - lastPress < BOARD_NUDGE.pressWindowMs) return;
	nudge();
};
