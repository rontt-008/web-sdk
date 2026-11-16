import _ from 'lodash';
import { Tween } from 'svelte/motion';
import { sineInOut } from 'svelte/easing';

import { stateBetDerived } from 'state-shared';

import { BOARD_DIMENSIONS, TALL_WILD } from './constants';
import { hoverStickyBat, landStickyBat, type StickyBat } from './stickyBats.svelte';
import type { ReelSymbol } from './stateGame.svelte';

// The tall wild: when a bat ring (W) lands, once its reel has stopped, the ring glides to the middle of
// the reel and morphs into the big WILD that fills it, 1 cell wide and 4 tall (TALL_WILD, drawn by
// TallWild), which stays till the reel drops its next set and falls out with it. The reel's symbols under it
// fade as the WILD opens over them (the ring at once). The reveal waits for it before the wins, which
// are the book's: it only shows the WILD.
// In the bonus, once its free spin is done (its wins shown), it turns back into the ring (tallWildsBack):
// the WILD closes into the reel's middle and becomes the ring (the user's wild_to_bat_ring.blend), the
// symbols it covered showing again as its stones pass them (the ring that landed stays hidden). The
// bat then stays, hovering there, a sticky bat (stickyBats): as the next free spin's reels spin it
// flutters round the board, and once its new reel stops it lands on one of its symbols, covering it as a
// ring would, and does the tall wild from there too, and so on till the bonus ends.

export type TallWild = {
	// the reel's 4 rows as they were when it stopped (the ring among them, if one landed)
	covered: ReelSymbol[];
	// the ring that landed and glides and morphs (of several in the reel, the one nearest its middle),
	// and its row; for a sticky bat, the symbol it lands on (hidden once it is on it)
	ring: ReelSymbol;
	ringRow: number;
	// the sticky bat that flew in to make it (stickyBats)
	bat: StickyBat | undefined;
	// how much the symbol a sticky bat comes down on still shows, 1 to 0: it fades out under the bat as it
	// eases down onto it, gone as it lands (it used to vanish all at once then; the user, 2026-11-14: "when
	// the bat flies to a spot and the symbol dissapears the whole thing smoother")
	ringFade: Tween<number>;
	// in a free spin: it turns back into the ring when the spin is done (tallWildsBack)
	inBonus: boolean;
	glide: Tween<number>; // 0 to 1: the ring (or sticky bat) gliding to the middle
	morph: Tween<number>; // its frames, 0 to TALL_WILD.frames
	unmorph: Tween<number>; // the way back's frames, 0 to TALL_WILD.back.frames
	// the WILD's hit (its bat reacting as the symbols it covers win): its frames, 0 to TALL_WILD.hit.frames,
	// while it plays (hitTallWild)
	hit: Tween<number>;
	hitting: Promise<void> | undefined;
	// its multiplier (TALL_WILD.multiplier; drawn by WildMultiplier): from the start (x2), or its sticky
	// bat's, doubling once in its spin if it is in a win (as its first hit plays; doubled: it has); pop: 0
	// to 1 as it pops on doubling. (A tall wild is a spin's: each spin's WILD is a new one.)
	multiplier: number;
	doubled: boolean;
	pop: Tween<number>;
	// hold: the ring that landed (or the sticky bat on its symbol) spinning in its cell; arrive: a sticky
	// bat still swooping down onto it; glide: flying to the middle (the skeleton's `fly`); gone: turned back
	// into the ring, which hovers as a sticky bat
	phase: 'hold' | 'arrive' | 'glide' | 'morph' | 'still' | 'unmorph' | 'gone';
	settled: Promise<void>;
};

export const stateTallWilds = $state({ reels: [] as (TallWild | undefined)[] });

const timeScale = () => stateBetDerived.timeScale() || 1;
// how long (ms) something of the tall wild's own timing takes: at its pace, at the game's speed
const paced = (ms: number) => (ms * TALL_WILD.pace) / timeScale();
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// A ring that landed spins once in its cell first (its land: the wild's `spin`, which ends on the still
// the glide starts from): till it has (at most a few seconds, should it never start).
const spun = async (ring: ReelSymbol) => {
	const until = performance.now() + 4000;
	while (ring.symbolState === 'land' && performance.now() < until) await nextFrame();
};

const run = async (tallWild: TallWild, settle: () => void) => {
	if (tallWild.bat) {
		// a sticky bat: on its symbol, it spins once there (StickyBats plays the `spin`), as a ring that
		// landed does
		await tallWild.bat.landed;
		tallWild.phase = 'hold';
		await new Promise((resolve) => setTimeout(resolve, TALL_WILD.spinMs / timeScale()));
	} else {
		await spun(tallWild.ring);
	}
	// then it flies to the middle, beating its wings once (the skeleton's `fly`, as long as the glide),
	// easing in and out gently
	tallWild.phase = 'glide';
	await tallWild.glide.set(1, { duration: paced(TALL_WILD.glideMs), easing: sineInOut });
	tallWild.phase = 'morph';
	await tallWild.morph.set(TALL_WILD.frames, {
		duration: paced((TALL_WILD.frames / TALL_WILD.fps) * 1000),
	});
	tallWild.phase = 'still';
	settle();
};

// A reel's symbols (padding rows included) have all dropped in, with a ring among them, or with a sticky
// bat going to it, which lands on one of them. (Once a reel's drop.)
export const startTallWild = (
	reelIndex: number,
	reelSymbols: ReelSymbol[],
	inBonus: boolean,
	bat?: StickyBat,
) => {
	const covered = reelSymbols.slice(1, 1 + BOARD_DIMENSIONS.y);
	const middle = (covered.length - 1) / 2;
	const rows = _.range(covered.length).filter((row) => covered[row].rawSymbol.name === 'W');
	if (!bat && !rows.length) return;
	const ringRow = bat
		? landStickyBat(bat, covered)
		: (_.minBy(rows, (row) => Math.abs(row - middle)) ?? rows[0]);
	let settle = () => {};
	const settled = new Promise<void>((resolve) => (settle = resolve));
	const tallWild: TallWild = $state({
		covered,
		ring: covered[ringRow],
		ringRow,
		bat,
		ringFade: new Tween(1),
		inBonus,
		glide: new Tween(0),
		morph: new Tween(0),
		unmorph: new Tween(0),
		hit: new Tween(0),
		hitting: undefined,
		multiplier: bat?.multiplier ?? TALL_WILD.multiplier.start,
		doubled: false,
		pop: new Tween(0),
		phase: bat ? 'arrive' : 'hold',
		settled,
	});
	stateTallWilds.reels[reelIndex] = tallWild;
	if (bat) {
		// its symbol fades out over the last part of the bat's descent (bat.approachMs, at the game's
		// speed), easing in and out, gone as the bat lands on it
		const descent = bat.approachMs / timeScale();
		const from = TALL_WILD.sticky.coverFadeFrom;
		tallWild.ringFade.set(0, { delay: descent * from, duration: descent * (1 - from), easing: sineInOut });
	}
	run(tallWild, settle);
};

// The WILD is in a win: its multiplier doubles (and its sticky bat's, which keeps it), popping; only
// once in its spin (the user, 2026-11-13: "make the wild multiplier double only once per spin if it
// hits"; it used to double with every winning line it was in).
const double = (tallWild: TallWild) => {
	if (tallWild.doubled) return;
	tallWild.doubled = true;
	tallWild.multiplier *= 2;
	if (tallWild.bat) tallWild.bat.multiplier = tallWild.multiplier;
	tallWild.pop.set(0, { duration: 0 });
	tallWild.pop.set(1, { duration: TALL_WILD.multiplier.popMs / timeScale() });
};

// The symbols a WILD at rest covers win (ReelSymbol; the wins are shown a line at a time, and a line has
// one symbol on each reel): its bat reacts (the hit, drawn over it by TallWild; every winning line), and
// on its first win in the spin its multiplier doubles as it springs; done when it has. While it plays,
// another win on it waits for the same one.
export const hitTallWild = (reelIndex: number) => {
	const tallWild = stateTallWilds.reels[reelIndex];
	if (!tallWild || tallWild.phase !== 'still') return Promise.resolve();
	if (tallWild.hitting) return tallWild.hitting;
	const { frames, fps } = TALL_WILD.hit;
	const duration = ((frames / fps) * 1000) / timeScale();
	tallWild.hit.set(0, { duration: 0 });
	tallWild.hitting = Promise.all([
		tallWild.hit.set(frames, { duration }),
		new Promise((resolve) => setTimeout(resolve, duration * TALL_WILD.multiplier.at)).then(() =>
			double(tallWild),
		),
	]).then(() => {
		tallWild.hitting = undefined;
	});
	return tallWild.hitting;
};

// a reel symbol is under a WILD at rest (so its wins are the WILD's: hitTallWild)
export const underTallWild = (reelIndex: number, reelSymbol: ReelSymbol) => {
	const tallWild = stateTallWilds.reels[reelIndex];
	return !!tallWild && tallWild.phase === 'still' && tallWild.covered.includes(reelSymbol);
};

// every tall wild started has turned into the WILD
export const tallWildsSettled = () =>
	Promise.all(stateTallWilds.reels.map((tallWild) => tallWild?.settled));

// A reel's symbols have fallen out of the board (the next drop): its tall wild, which fell with them,
// is let go. (The reel keeps the same symbols, given the next set, so it would cover those.)
export const releaseTallWild = (reelIndex: number) => {
	const tallWild = stateTallWilds.reels[reelIndex];
	if (tallWild && (tallWild.phase === 'still' || tallWild.phase === 'gone')) {
		stateTallWilds.reels[reelIndex] = undefined;
	}
};

// A tall wild's way back to the ring (see the top): the closing, frame by frame; then the bat hovers
// there as a sticky bat.
const back = async (reelIndex: number, tallWild: TallWild) => {
	tallWild.phase = 'unmorph';
	await tallWild.unmorph.set(TALL_WILD.back.frames, {
		duration: paced((TALL_WILD.back.frames / TALL_WILD.fps) * 1000),
	});
	hoverStickyBat(reelIndex, tallWild.bat, tallWild.multiplier);
	tallWild.phase = 'gone';
};

// A free spin is done: its tall wilds turn back into the ring (all at once); done when they have.
export const tallWildsBack = () =>
	Promise.all(
		stateTallWilds.reels.map((tallWild, reelIndex) =>
			tallWild?.inBonus && tallWild.phase === 'still' ? back(reelIndex, tallWild) : undefined,
		),
	);

// The morph's frame at 60 fps (as in the .blend) where the WILD's opening edge, going out from the
// middle, is `cells` from it on one side or the other (OPEN eases out, cubic).
const openFrame = (cells: number, up: boolean) => {
	const { from, to, top, bottom } = TALL_WILD.open;
	const p = Math.min(1, cells / (up ? top : bottom));
	return from + (to - from) * (1 - Math.cbrt(1 - p));
};

// The way back's frame at 60 fps (as in its .blend) where the closing stones' edge, coming in to the
// middle, is `cells` from it (OPEN there eases in, cubic).
const closeFrame = (cells: number, up: boolean) => {
	const { top, bottom } = TALL_WILD.open;
	const { from, to } = TALL_WILD.back.close;
	const p = Math.min(1, cells / (up ? top : bottom));
	return from + (to - from) * Math.cbrt(1 - p);
};

// How much a reel symbol shows: 1, unless a tall wild covers it: the ring that landed not at all once it
// glides (it became the WILD, then the sticky bat), a symbol a sticky bat lands on fading out under it as
// it comes down (ringFade), the others fading as the opening passes from their middle to their far edge,
// and on the way back showing again as the closing passes from their far edge to their middle.
export const coverAlpha = (reelIndex: number, reelSymbol: ReelSymbol) => {
	const tallWild = stateTallWilds.reels[reelIndex];
	if (!tallWild || !tallWild.covered.includes(reelSymbol)) return 1;
	if (reelSymbol === tallWild.ring) {
		// (a ring that landed shows as it spins)
		if (tallWild.bat) return tallWild.ringFade.current;
		return tallWild.phase === 'hold' ? 1 : 0;
	}
	if (tallWild.phase === 'still') return 0;
	if (['hold', 'arrive', 'glide', 'gone'].includes(tallWild.phase)) return 1;
	const row = tallWild.covered.indexOf(reelSymbol);
	const offset = row + 0.5 - BOARD_DIMENSIONS.y / 2; // cells from the reel's middle
	const up = offset < 0;
	if (tallWild.phase === 'unmorph') {
		const start = closeFrame(Math.abs(offset) + 0.5, up);
		const end = closeFrame(Math.abs(offset), up);
		const frame = TALL_WILD.back.from + tallWild.unmorph.current * (60 / TALL_WILD.fps);
		return Math.min(1, Math.max(0, (frame - start) / Math.max(1, end - start)));
	}
	const start = openFrame(Math.abs(offset), up);
	const end = openFrame(Math.abs(offset) + 0.5, up);
	const frame = 1 + tallWild.morph.current * (60 / TALL_WILD.fps);
	return 1 - Math.min(1, Math.max(0, (frame - start) / Math.max(1, end - start)));
};
