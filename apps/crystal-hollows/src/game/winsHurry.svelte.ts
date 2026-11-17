import type { Tween } from 'svelte/motion';

import { stateBetDerived } from 'state-shared';

// The wins hurried (the user, 2026-11-17: "when a get a hit and the wins are showing make it if you
// click it it goes fast"): while a spin's line wins are showing (bookEventHandlerMap's winInfo), a
// click or tap anywhere on the game, Space or Spin (WinsHurry) plays the rest of them WINS_HURRY times
// as fast, on top of turbo, the line showing too (its animations follow winTimeScale as they go:
// playAt, the symbols' skeletons). The next spin's wins play at the game's speed again.
export const WINS_HURRY = 4;

export const stateWinsHurry = $state({ showing: false, hurried: false });

export const winsShowing = (showing: boolean) => {
	stateWinsHurry.showing = showing;
	stateWinsHurry.hurried = false;
};

export const hurryWins = () => {
	if (stateWinsHurry.showing) stateWinsHurry.hurried = true;
};

// how much faster than the game's speed the wins play: WINS_HURRY once hurried, else 1
export const hurryScale = () => (stateWinsHurry.hurried ? WINS_HURRY : 1);

// the speed the wins play at: the game's (2 in turbo), hurried or not
export const winTimeScale = () => (stateBetDerived.timeScale() || 1) * hurryScale();

// A tween run from where it is to `to` over `ms` (at speed 1), frame by frame at winTimeScale, so it
// speeds up as it goes once the wins are hurried (a tween's own duration is fixed when it starts);
// `onprogress` gets how far it has got (0-1) each frame. Done when it gets there.
export const playAt = (
	tween: Tween<number>,
	to: number,
	ms: number,
	{
		easing = (p: number) => p,
		onprogress,
	}: { easing?: (p: number) => number; onprogress?: (p: number) => void } = {},
) =>
	new Promise<void>((resolve) => {
		const from = tween.current;
		let p = 0;
		let last = performance.now();
		const step = (now: number) => {
			p = Math.min(1, p + (Math.max(0, now - last) * winTimeScale()) / Math.max(1, ms));
			last = now;
			tween.set(from + (to - from) * easing(p), { duration: 0 });
			onprogress?.(p);
			if (p < 1) requestAnimationFrame(step);
			else resolve();
		};
		requestAnimationFrame(step);
	});
