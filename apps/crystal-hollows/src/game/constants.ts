import _ from 'lodash';
import { quadIn } from 'svelte/easing';

import type { RawSymbol, SymbolState } from './types';

// The board's cells fill the frame's panel, a few units from its walls (FRAME_MARGIN in stateGame;
// the frame is as big as it was round 120-unit cells with roomier margins): 4 rows of SYMBOL_SIZE (a
// cell's height, which the symbols are sized by) and 5 reels of REEL_WIDTH apart (the panel is wider
// than 5:4, so the reels spread out to its side walls).
export const SYMBOL_SIZE = 123;
export const REEL_WIDTH = 128;

// initial board: 5 reels of 4 rows, padded top and bottom
export const INITIAL_BOARD: RawSymbol[][] = [
	[
		{
			name: 'L2',
		},
		{
			name: 'L1',
		},
		{
			name: 'L4',
		},
		{
			name: 'H2',
		},
		{
			name: 'L3',
		},
		{
			name: 'L1',
		},
	],
	[
		{
			name: 'H1',
		},
		{
			name: 'L4',
		},
		{
			name: 'L2',
		},
		{
			name: 'H3',
		},
		{
			name: 'H4',
		},
		{
			name: 'L4',
		},
	],
	[
		{
			name: 'L3',
		},
		{
			name: 'L1',
		},
		{
			name: 'L3',
		},
		{
			name: 'H4',
		},
		{
			name: 'L2',
		},
		{
			name: 'L4',
		},
	],
	[
		{
			name: 'H4',
		},
		{
			name: 'H3',
		},
		{
			name: 'L4',
		},
		{
			name: 'L4',
		},
		{
			name: 'L2',
		},
		{
			name: 'L1',
		},
	],
	[
		{
			name: 'H3',
		},
		{
			name: 'L3',
		},
		{
			name: 'L3',
		},
		{
			name: 'H1',
		},
		{
			name: 'L4',
		},
		{
			name: 'H1',
		},
	],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: REEL_WIDTH * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

export const BACKGROUND_RATIO = 2039 / 1000;
export const PORTRAIT_BACKGROUND_RATIO = 1242 / 2208;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'H5'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

// The logo: the user's title (IDLE/crystal_hollows_title_idle.blend, 2026-11-14: cracked stone letters
// with a black outline, no plaque; it replaced their plaque logos) as Spine (art-source/logo-spine.py),
// its letters floating, a 4 s loop. What shows of it over its loop, in its skeleton's px (its middle, the
// 2000 x 668 canvas's, at 0, 0; measured from the .blend's rendered frames): `width` px wide, its middle
// right of the canvas's by shiftX, from `above` px above the middle to `below` below it. Drawn at the top
// left on wide screens (stateGame logoLayout, Logo) and big on the start screen (LoadingScreen).
export const LOGO_ART = {
	width: 1669,
	shiftX: 17.5,
	above: 273,
	below: 326,
};

// The board's nudge as Spin is pressed (boardNudge.svelte.ts): down `distance` (units, about 8% of a
// cell) and back in one smooth move of durationMs (at the game's speed), the first `down` of it going
// down; a spin's own start doesn't nudge again within pressWindowMs of a press.
export const BOARD_NUDGE = { distance: 10, durationMs: 420, down: 0.3, pressWindowMs: 3000 };

// The slight tumble as a symbol lands as its still (the letters and premiums; landPose.svelte.ts,
// ReelSymbol): squashing up to `squash` (of its height) onto its base (pivot: cells below its middle, its
// base) as it hits, the width the other way by `widen` of that, then a slight stretch back and a smaller
// squash (cycles 3 half-waves, dying away by `decay`), over durationMs at the game's speed.
export const LAND_POSE = {
	durationMs: 450,
	squash: 0.12,
	cycles: 3,
	decay: 3.5,
	widen: 0.5,
	pivot: 0.42,
};

// The reels drop (utils-slots createReelForCascading, since 2026-11-12; they used to spin): a spin's
// symbols fall out of the board, reel after reel (reelFallOutDelay ms apart, bottom row first,
// symbolFallOutInterval ms apart), and the new set drops in, reel after reel (reelFallInDelay x its
// padding), bottom row first (symbolFallInInterval ms apart), falling from rest and speeding up as if
// dropped (quadIn) into their places with no bounce of their own (the free spins symbol's drop thumps
// and bounces as it hits, landLead in stateGame; the letters' and premiums' land animations did too
// till 2026-11-13, when the user had them taken out). Speeds in px/ms (on average). An
// anticipated reel waits longer before its symbols drop (reelPaddingMultiplierAnticipated).
// The normal drop is SPIN_PACE times as slow as it first was (the user, 2026-11-12: "make ... the spins
// slower"); turbo's is as it was.
const SPIN_PACE = 1.5;
const SPIN_OPTIONS_SHARED = {
	reelPaddingMultiplierNormal: 1.25,
	reelPaddingMultiplierAnticipated: 6,
	symbolFallInBounceSpeed: 0.15,
	symbolFallInBounceSizeMulti: 0,
	symbolFallInEasing: quadIn,
	symbolFallOutEasing: quadIn,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	reelFallOutDelay: 60 * SPIN_PACE,
	reelFallInDelay: 90 * SPIN_PACE,
	symbolFallOutSpeed: 3.2 / SPIN_PACE,
	symbolFallOutInterval: 20 * SPIN_PACE,
	symbolFallInSpeed: 2.6 / SPIN_PACE,
	symbolFallInInterval: 40 * SPIN_PACE,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	reelFallOutDelay: 60,
	reelFallInDelay: 90,
	symbolFallOutSpeed: 6,
	symbolFallOutInterval: 0,
	symbolFallInSpeed: 5,
	symbolFallInInterval: 10,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

// The sample's (Mining Mayhem) win, land, spin and explosion animations were removed: a symbol is its
// still unless the user's own animations are below (the letters' lands and idles, the premiums'
// drops, idles and hits, the wild's idle). A win is shown by SymbolWin's pulse unless the symbol has its
// own (the premiums' hits).
const still = (assetKey: string, size: number) =>
	({ type: 'sprite', assetKey, sizeRatios: { width: size, height: size } }) as const;

const allStates = <T>(info: T) => ({
	static: info,
	spin: info,
	land: info,
	win: info,
	postWinStatic: info,
	explosion: info,
});

// A stone letter: its still, and its skeleton (the user's IDLE/<letter>_idle.blend and <letter>_hit.blend
// as Spine, art-source/letters-spine.py), whose bounds are the still's square, so it is sized like the
// still: LETTER_SIZE cells, times its own `scale` (LETTER_SCALE).
// The four stills share one scale (letter-symbols.py: the biggest outline fills 0.94 of the square), so
// as drawn in the art the A came out biggest and the narrow J smallest (the user, 2026-11-14: "make all
// the symbols the same size the A is kinda large and J looks kinda small"). LETTER_SCALE evens them out:
// each letter's look of size, the mean of its height and the square root of its area (alpha > 128 in its
// 256 px still: A 198 px / 167, K 191 / 170, Q 186 / 165, J 180 / 144), against the four's average, so
// the A shrinks a little and the J grows; the A, the widest, still fits a cell's width (REEL_WIDTH).
// - landing and spinning: the still (and the slight squash as it lands, LAND_POSE). (Its land, the user's
//   <letter>_land.blend, a thump and bounce as it dropped in, was taken out with the premiums', 2026-11-13.)
// - at rest (static, and after a win): its idle, a 4 s loop starting on the still, so it follows on
//   from the still with no jump. `loop`: it keeps going, at its own pace (not sped up in turbo).
// - win: its hit (2026-11-13, the premiums' hit), instead of SymbolWin's pulse: it crouches, springs up
//   swelling and leaning, lands with a squash and settles on the still, its moss and grass reacting.
//   `play`: the win is done when it ends.
const LETTER_SIZE = 1.06;
const LETTER_SCALE = { A: 0.96, K: 0.97, Q: 1.0, J: 1.08 };
const letter = (stillKey: string, spineKey: string, scale: number) => {
	const size = LETTER_SIZE * scale;
	const spine = {
		type: 'spine',
		assetKey: spineKey,
		sizeRatios: { width: size, height: size },
	} as const;
	const idle = { ...spine, animationName: 'idle', loop: true } as const;
	return {
		...allStates(still(stillKey, size)),
		win: { ...spine, animationName: 'hit', play: true } as const,
		static: idle,
		postWinStatic: idle,
	};
};

// A premium: its still, and its skeleton (the user's IDLE/<name>_idle.blend and <name>_hit.blend as
// Spine, art-source/premiums-spine.py), sized like the still as the letters' are, but bigger: each
// fills 0.94 of its own square (not one shared scale), drawn at PREMIUM_SIZE, so its widest or
// tallest side is exactly one cell (taller would be cut by the board's mask in the top and bottom rows).
// - landing and spinning: the still. (Its land, the user's <name>_drop.blend, a squash and bounce as it
//   dropped in, is still in its skeleton but not played: taken out with the letters', 2026-11-13.)
// - at rest (static, and after a win): its idle, a 4 s loop starting on the still, so it follows on
//   from the still with no jump. `loop`: it keeps going, at its own pace (not sped up in turbo).
// - win: its hit (<name>_hit.blend), instead of SymbolWin's pulse: it crouches, springs up swelling and
//   leaning, lands with a squash and settles on the still. `play`: the win is done when it ends.
const PREMIUM_SIZE = 1 / 0.94;
const premium = (stillKey: string, spineKey: string) => {
	const spine = {
		type: 'spine',
		assetKey: spineKey,
		sizeRatios: { width: PREMIUM_SIZE, height: PREMIUM_SIZE },
	} as const;
	const idle = { ...spine, animationName: 'idle', loop: true } as const;
	return {
		...allStates(still(stillKey, PREMIUM_SIZE)),
		win: { ...spine, animationName: 'hit', play: true } as const,
		static: idle,
		postWinStatic: idle,
	};
};

// The wild: the crystal bat hovering in the thorn ring as it turns (the user's IDLE/bat_ring_idle.blend as
// Spine, art-source/wild-spine.py). Its still is the loop's first frame; its skeleton's bounds are the
// still's square, so it is sized like the still. That square is round everything the loop reaches (the
// ring's leaves and thorns as it turns), which fills 0.94 of it, drawn at WILD_SIZE: that circle is 1.25
// cells across, so the ring's band and the bat are about a cell wide and the leaves reach past it. So it
// is one of the OVERSIZE_SYMBOLS.
// - at rest (static, and after a win): its idle, a 12 s loop starting on the still (the ring turns once
//   round, the bat's wings beat 8 times). `loop`: it keeps going, at its own pace.
// - land: its spin (the user, 2026-11-12): once its reel is at rest the thorn ring spins once round,
//   easing in and out (1.1 s at the game's speed), ending on the still; a ring on the board then glides
//   on into its tall wild (tallWilds waits for the spin). `play`: done when it ends.
// - spinning and winning (SymbolWin's pulse): the still.
export const WILD_SIZE = 1.25 / 0.94;
const wild = () => {
	const spine = {
		type: 'spine',
		assetKey: 'wild',
		sizeRatios: { width: WILD_SIZE, height: WILD_SIZE },
	} as const;
	const idle = { ...spine, animationName: 'idle', loop: true } as const;
	return {
		...allStates(still('symbolWild', WILD_SIZE)),
		land: { ...spine, animationName: 'spin', play: true } as const,
		static: idle,
		postWinStatic: idle,
	};
};

// The free spins symbol (S, the scatter): the user's FS rock (2026-11-13), its still and two animations
// rendered in Blender as frames (free_spin_drop.blend, free_spin_activate.blend; art-source/free-spins.py
// makes the still and the sheets: they have glows, flashes, shines, rays and a shockwave, not moved
// pieces, so frames rather than Spine). Sized as the premiums are: the rock's tallest side (1102 px of
// its 1254 px artwork) one cell. The sheets' frames are boxes centred on the artwork's middle, so they
// are drawn centred on the symbol's place, at their boxes' sizes (FREE_SPINS, cells, printed by
// free-spins.py), at 30 fps, each frame fading into the next (SymbolSheet).
// - land: its drop: it falls in as its reel comes down, thumps down on its 4th frame (impactMs, 0.1 s:
//   stateGame's landLead starts it that early), bounces once, its F and S burst up and land back, a
//   shine sweeps over them (1.2 s), ending on the still. `play`: done when it ends.
// - win: its activation, which is what the scatters play as the free spins trigger (freeSpinTrigger
//   shows them winning): it charges, pops up swelling with a flash, a shockwave and rays, floats
//   pulsing and settles (2 s), ending on the still. Drawn over the board's mask as wins are, so its rays
//   aren't cut. `play`: the trigger waits for it.
// - otherwise: the still.
export const FREE_SPINS = {
	still: 1254 / 1102,
	drop: { width: 1254 / 1102, height: 1408 / 1102 },
	activate: 1650 / 1102,
	fps: 30,
	// its drop's impact: frame 7 of 60 a second (free_spin_drop's README)
	impactMs: 100,
};
const freeSpins = () => {
	const sheet = (assetKey: string, sizeRatios: { width: number; height: number }) =>
		({ type: 'spriteSheet', assetKey, sizeRatios, fps: FREE_SPINS.fps, play: true }) as const;
	return {
		...allStates(still('symbolFreeSpins', FREE_SPINS.still)),
		land: sheet('freeSpinsDrop', FREE_SPINS.drop),
		win: sheet('freeSpinsActivate', {
			width: FREE_SPINS.activate,
			height: FREE_SPINS.activate,
		}),
	};
};

// The tall wild (tallWilds.svelte.ts, TallWild): the bat ring morphing into the big WILD that fills its reel,
// 1 cell wide and 4 tall (the user's bat_ring_to_wild.blend, 4 cells of 667 px, its frames exported by
// art-source/wild-tall.py: the .blend's frames 1-83 every other one, so 30 fps). Since 2026-11-12 the WILD in it
// fills the reel's width (its stones and the bat's wings reach to within about 5 px of the cell's sides;
// before, it was only about 3/4 of it). In the .blend:
// - the frames have 48 px of room each side of the WILD (763 px wide) for the bat as it swells and flashes, so
//   the morph's frames are frameWidth cells wide, the WILD's cell in their middle;
// - the ring starts in the reel's middle, drawn with the ring's 1254 px canvas a cell (667 px) wide, so the
//   wild's still (its square: 1180 px of that canvas) is ringSize cells there;
// - the WILD opens (rig.py OPEN, cubic out) over frames open.from to open.to (60 fps), its top and bottom
//   edges going from the middle out to open.top / open.bottom cells from it.
// The way back, in the bonus (the user's wild_to_bat_ring.blend, the same size, exported by wild-tall.py
// too): its frames back.from to its last (100) every other one, so back.frames at the same 30 fps; its
// stones close (OPEN, cubic in) over frames back.close.from to back.close.to, from open.top / open.bottom
// cells to the middle.
// The glide, the morph and the way back play pace times as slow as their own timing: 1, their own speed
// (it was 1.5 for a while; the user, 2026-11-12: "make the bat wild animations faster i dont like it when
// its slower"). Each frame fades into the next (TallWild), so a slower pace would stay smooth.
// The glide (the bat flying to the reel's middle; made smoother 2026-11-12): glideMs x pace, as long as the
// wild skeleton's `fly` (art-source/wild-spine.py FLY_SECONDS: one beat of its wings, ending on the morph's
// first pose), which the bat plays as it goes. Before it, a ring that lands or a sticky bat that comes down
// spins once in its cell (the skeleton's `spin`, spinMs at the game's speed: wild-spine.py SPIN_SECONDS).
export const TALL_WILD = {
	fps: 30,
	frames: 42,
	glideMs: 500,
	pace: 1,
	spinMs: 750,
	// the WILD's hit, when the symbols it covers win (the user's wild_bat_hit.blend, exported by
	// wild-tall.py: its frames 2-98 every other one, each only what changes, on the still's grid with
	// `room` of its width each side), each frame fading into the next, drawn over the WILD at rest; the win
	// waits for it. Its .blend is 1.5 times as slow as its own quick timing (SLOW in its rig.py), so it plays
	// 1.5 times as fast as its frames were made (45 fps, ~1.1 s), its quick timing.
	hit: { frames: 49, fps: 45, room: 19 / 256 },
	frameWidth: (667 + 2 * 48) / 667,
	ringSize: 1180 / 1254,
	back: { from: 2, frames: 50, close: { from: 14, to: 38 } },
	// in the bonus the bat then stays (stickyBats): hovering in the reel's middle as the ring (ringSize);
	// as the next free spin's reels spin it takes off, growing to WILD_SIZE over growMs, and flutters
	// round the board (a smooth path through random waypoints, one every segmentMs, each up to reach
	// cells from the last and then pulled `homing` of the way to the cell it is going to), leaning (tilt,
	// radians) into its flight; once its new reel stops it eases onto its cell from the way it was flying,
	// slowing to a stop, in about the time it takes to stop from `cruise` (cells/s, about its wander's
	// speed) over the distance left, approachMs to approachMaxMs (2026-11-13: it used to dash there in a
	// fixed 380 ms from wherever it was); it spins there (spinMs) and flies to the middle as a ring that
	// landed does; when the bonus ends it rises and fades away over leaveMs
	sticky: {
		growMs: 300,
		segmentMs: 420,
		reach: { x: 1.6, y: 1.3 },
		homing: 0.45,
		tilt: 0.3,
		cruise: 3,
		approachMs: 380,
		approachMaxMs: 1000,
		// the symbol it comes down on fades out from this far into its descent, gone as it lands
		// (tallWilds ringFade; it used to vanish as the bat landed)
		coverFadeFrom: 0.4,
		leaveMs: 450,
	},
	open: { from: 29, to: 58, top: (1334 - 134) / 667, bottom: (2540 - 1334) / 667 },
	// The WILD's multiplier (2026-11-13, the user: "add a multiplier to the wilds ... everytime a wild
	// connects the multiplier doubles"; they chose: start x2, and in the bonus the sticky bat keeps it from
	// spin to spin till the bonus ends; it doubles once in a spin if the WILD is in a win, however many
	// lines: "double only once per spin if it hits", the same day, after per line). WildMultiplier writes it in
	// the logo's lettering in the WILD's empty cave between the stalactites and the bat: its middle y of
	// the WILD's height from its top, fontSize cells, no wider than maxWidth of the WILD (long numbers
	// get smaller). It doubles `at` of the way into the WILD's hit (as the bat springs), popping up
	// popScale bigger and back over popMs. It fades in over the morph's frames fadeIn (the cave opened)
	// and out over the way back's first fadeOut frames (before its stones close). Visual only for now:
	// the wins are the books' (the real math will have to multiply them).
	multiplier: {
		start: 2,
		// (smaller since 2026-11-13, the user: "make the multiplier smaller"; was 0.54)
		y: 0.275,
		fontSize: 0.4,
		maxWidth: 0.72,
		at: 0.35,
		popMs: 450,
		popScale: 0.45,
		fadeIn: { from: 32, to: 42 },
		fadeOut: 6,
	},
};

// Symbols bigger than their cell: once their reel is at rest they are drawn over the board's mask (on the
// layer winning symbols use), so the top and bottom rows' aren't cut at the board's edge, and over their
// neighbours. While their reel moves they are their still, under the mask (ReelSymbol).
export const OVERSIZE_SYMBOLS: string[] = ['W'];

export const SYMBOL_INFO_MAP = {
	// the user's premiums, best paying first (art-source/premiums-spine.py), dropping in, idling, hitting
	H1: premium('symbolCrystal', 'premiumCrystal'),
	H2: premium('symbolBerries', 'premiumBerries'),
	H3: premium('symbolStalactite', 'premiumStalactite'),
	H4: premium('symbolMushroom', 'premiumMushroom'),
	// not in the paytable (the sample's); the Mining Mayhem still
	H5: allStates(still('h5.webp', 1)),
	// the user's stone letters, best paying first (art-source/letter-symbols.py), landing and idling
	L1: letter('symbolA', 'letterA', LETTER_SCALE.A),
	L2: letter('symbolK', 'letterK', LETTER_SCALE.K),
	L3: letter('symbolQ', 'letterQ', LETTER_SCALE.Q),
	L4: letter('symbolJ', 'letterJ', LETTER_SCALE.J),
	// (no L5: the sample's blue gem was removed; four letters are the lows)
	// the user's bat in the thorn ring, idling
	W: wild(),
	// the user's FS rock, dropping in, and activating as the free spins trigger
	S: freeSpins(),
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
