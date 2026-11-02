import _ from 'lodash';
import { quadIn, quadOut } from 'svelte/easing';

import type { RawSymbol, SymbolState } from './types';

// the 5x5 board as big as the 6x6 one was (6 x 93), so it fills the same frame
export const SYMBOL_SIZE = 112;
// the 6x6 board's symbol size, which the things around the board (the fox, the win amounts and
// counters, the frame's margin) are sized in, so they kept their sizes when the symbols grew
export const LAYOUT_UNIT = 93;

// symbols in the middle of their column, so the lines between the reels (BoardFrame) fall in the
// gaps between them
export const REEL_PADDING = 0.5;

// initial board (padded top and bottom)
export const INITIAL_BOARD: RawSymbol[][] = [
	[
		{ name: 'L1' },
		{ name: 'H3' },
		{ name: 'L4' },
		{ name: 'L1' },
		{ name: 'H2' },
		{ name: 'L1' },
		{ name: 'L2' },
	],
	[
		{ name: 'H3' },
		{ name: 'L1' },
		{ name: 'L2' },
		{ name: 'H4' },
		{ name: 'L4' },
		{ name: 'L3' },
		{ name: 'L4' },
	],
	[
		{ name: 'H2' },
		{ name: 'L2' },
		{ name: 'L4' },
		{ name: 'H3' },
		{ name: 'L3' },
		{ name: 'H2' },
		{ name: 'H3' },
	],
	[
		{ name: 'H4' },
		{ name: 'H3' },
		{ name: 'H2' },
		{ name: 'L3' },
		{ name: 'L2' },
		{ name: 'L1' },
		{ name: 'L4' },
	],
	[
		{ name: 'L3' },
		{ name: 'L4' },
		{ name: 'H4' },
		{ name: 'L1' },
		{ name: 'H4' },
		{ name: 'L4' },
		{ name: 'L2' },
	],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

// symbols in a base game spin's clusters, all its tumbles together, that start the free spins (the
// bar right of the board counts them, see BonusMeter); the same as in scripts/generate-5x5-books.mjs
export const BONUS_TRIGGER = 35;
// and 50 or more start the super bonus instead: the same, its powers bigger (BONUS_POWERS in runes.ts)
export const SUPER_TRIGGER = 50;
// the free spins either gives, and the power spins after them (one more with Ingwaz's power); the
// same as FREE_SPINS and POWER_SPINS in scripts/generate-5x5-books.mjs, for the game rules
export const FREE_SPINS_AWARDED = 10;
export const POWER_SPINS = 2;

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
// the leaves
export const LOW_SYMBOLS = ['L1', 'L2', 'L3', 'L4'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const M_SIZE = 0.3;
const HIGH_SYMBOL_SIZE = 0.9;
const SPECIAL_SYMBOL_SIZE = 1;

const SPIN_OPTIONS_SHARED = {
	reelFallInDelay: 80,
	reelPaddingMultiplierNormal: 1.25,
	reelPaddingMultiplierAnticipated: 18,
	reelFallOutDelay: 145,
};

// The symbols fall out of the board as if dropped, from rest and speeding up (quadIn), and into it
// softly, lowest first: in at speed from above the board, slowing to a stop right in their cells
// (quadOut), with no bounce, then settling a touch (their 'land' motion, landPose).
export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 2.1,
	symbolFallInInterval: 30,
	symbolFallInBounceSpeed: 0.15,
	symbolFallInBounceSizeMulti: 0,
	symbolFallInEasing: quadOut,
	symbolFallOutSpeed: 3.2,
	symbolFallOutInterval: 20,
	symbolFallOutEasing: quadIn,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 4.4,
	symbolFallInInterval: 0,
	symbolFallInBounceSpeed: 0.3,
	symbolFallInBounceSizeMulti: 0,
	symbolFallInEasing: quadOut,
	symbolFallOutSpeed: 6,
	symbolFallOutInterval: 0,
	symbolFallOutEasing: quadIn,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

// a winning symbol going when the board tumbles (its 'explosion' state): no explosion (the user took
// the sample's off), it just fades out as it is (SymbolVanish); those that flew to the bonus meter as
// souls are gone already
const explosion = { type: 'vanish', assetKey: '', sizeRatios: { width: 1, height: 1 } };

// the high symbols, framed tiles playing their idle loops (the user's Blender animations, see
// art-source/symbol-animations.py and SymbolIdle) in every state but a win, which plays their hit
// once (SymbolHit, blended in from the idle and back out to it): the wood of their frames is
// about 239 x 228 of their 256 x 256 square (the vines' leaves reach out past it), drawn 93.5% of a
// cell both ways, so neighbouring frames are a few pixels apart; a little taller than the art, as
// the frames are a little wider than tall
const TILE_FRAME = { width: 239 / 256, height: 228 / 256 };
const TILE_FILL = 0.935;
const TILE_SIZE = { width: TILE_FILL / TILE_FRAME.width, height: TILE_FILL / TILE_FRAME.height };
// a little see-through, so the rune behind them shows through (see SymbolIdle)
export const TILE_ALPHA = 0.95;
const h1Idle = { type: 'idle', assetKey: 'blueberriesIdle', sizeRatios: TILE_SIZE };
const h2Idle = { type: 'idle', assetKey: 'runestoneIdle', sizeRatios: TILE_SIZE };
const h3Idle = { type: 'idle', assetKey: 'mushroomIdle', sizeRatios: TILE_SIZE };
const h4Idle = { type: 'idle', assetKey: 'acornIdle', sizeRatios: TILE_SIZE };
// landing on a spin or a tumble, the tile settles softly into its cell (motion.ts landPose), its
// idle playing on
const h1Land = { ...h1Idle, motion: 'land' as const };
const h2Land = { ...h2Idle, motion: 'land' as const };
const h3Land = { ...h3Idle, motion: 'land' as const };
const h4Land = { ...h4Idle, motion: 'land' as const };
// idleKey: the idle loop the hit blends from and back to
const TILE_HIT = { type: 'hit', sizeRatios: TILE_SIZE };
const h1Win = { ...TILE_HIT, assetKey: 'blueberriesHit', idleKey: 'blueberriesIdle' };
const h2Win = { ...TILE_HIT, assetKey: 'runestoneHit', idleKey: 'runestoneIdle' };
const h3Win = { ...TILE_HIT, assetKey: 'mushroomHit', idleKey: 'mushroomIdle' };
const h4Win = { ...TILE_HIT, assetKey: 'acornHit', idleKey: 'acornIdle' };
const h5Static = { type: 'sprite', assetKey: 'h5.webp', sizeRatios: { width: 1, height: 1 } };

// the low symbols are leaves, with no Spine; when they win they play the user's hit once (its 90
// frames made at 60 a second, played at LEAF_HIT_FRAME_RATE so it takes 1 s, as long as the tiles'
// hits: the user asked for it faster; art-source/leaf-hits.py, SymbolSpriteSheet), its square 1.25
// times the still's so the leaf can come up toward you, centred on the cell, its first and last
// frames on the still
const l1Static = { type: 'sprite', assetKey: 'leafGreen', sizeRatios: { width: 1, height: 1 } };
const l2Static = { type: 'sprite', assetKey: 'leafBrown', sizeRatios: { width: 1, height: 1 } };
const l3Static = { type: 'sprite', assetKey: 'leafRed', sizeRatios: { width: 1, height: 1 } };
const l4Static = { type: 'sprite', assetKey: 'leafYellow', sizeRatios: { width: 1, height: 1 } };
// landing, they settle as the tiles do
const l1Land = { ...l1Static, motion: 'land' as const };
const l2Land = { ...l2Static, motion: 'land' as const };
const l3Land = { ...l3Static, motion: 'land' as const };
const l4Land = { ...l4Static, motion: 'land' as const };
const LEAF_HIT_FRAME_RATE = 90;
const LEAF_HIT = {
	type: 'spriteSheet',
	sizeRatios: { width: 1.25, height: 1.25 },
	frameRate: LEAF_HIT_FRAME_RATE,
};
const l1Win = { ...LEAF_HIT, assetKey: 'leafGreenHit' };
const l2Win = { ...LEAF_HIT, assetKey: 'leafBrownHit' };
const l3Win = { ...LEAF_HIT, assetKey: 'leafRedHit' };
const l4Win = { ...LEAF_HIT, assetKey: 'leafYellowHit' };

// the Fehu symbol (F), the user's stone-framed tile, its frame as big as the high symbols' wooden
// ones (TILE_FILL of a cell); its frame is about 1151 x 1149 of its 1254 x 1254 image, the rest
// see-through, so the image is drawn that much bigger. It never wins (it is collected as it lands,
// see the fehuSymbols book event), and settles as it lands.
const FEHU_FRAME = { width: 1151 / 1254, height: 1149 / 1254 };
const fStatic = {
	type: 'sprite',
	assetKey: 'fehuSymbol',
	sizeRatios: { width: TILE_FILL / FEHU_FRAME.width, height: TILE_FILL / FEHU_FRAME.height },
};
const fLand = { ...fStatic, motion: 'land' as const };
// the Ingwaz symbol (I), the same: its frame about 1139 x 1141 of its 1254 x 1254 image (see the
// ingwazSymbols book event)
const INGWAZ_FRAME = { width: 1139 / 1254, height: 1141 / 1254 };
const iStatic = {
	type: 'sprite',
	assetKey: 'ingwazSymbol',
	sizeRatios: { width: TILE_FILL / INGWAZ_FRAME.width, height: TILE_FILL / INGWAZ_FRAME.height },
};
const iLand = { ...iStatic, motion: 'land' as const };

const sStatic = { type: 'sprite', assetKey: 's.png', sizeRatios: { width: 1.243, height: 1.243 } };
// the wild, the user's stone tile, as the high symbols are: its idle loop (its letters and runes
// moving) in every state but a win, which plays its hit once (it bounces, its letters in a wave),
// both the user's Blender animations (art-source/symbol-animations.py); its frame is about 85% of
// the art (the rocks on its corners reach further), so drawn 1.08 cells its frame is about as big
// as their wooden ones, the rocks reaching a little past the cell; it settles as it lands, as they do.
// Its frames have room round the still's 256 px square (16 px each side, ROOM in the script) for
// its hit to swell into, so they are drawn that much bigger.
const WILD_SHEET = 288 / 256;
const WILD_SIZE = { width: 1.08 * WILD_SHEET, height: 1.08 * WILD_SHEET };
const wStatic = { type: 'idle', assetKey: 'wildIdle', sizeRatios: WILD_SIZE };
const wLand = { ...wStatic, motion: 'land' as const };
const wWin = { type: 'hit', assetKey: 'wildHit', idleKey: 'wildIdle', sizeRatios: WILD_SIZE };

const m2Static = {
	type: 'sprite',
	assetKey: 'm1_2x.png',
	sizeRatios: { width: 0.88, height: 0.88 },
};
const m4Static = {
	type: 'sprite',
	assetKey: 'm1_4x.png',
	sizeRatios: { width: 0.88, height: 0.88 },
};
const m5Static = { type: 'sprite', assetKey: 'm2_5x.png', sizeRatios: { width: 1, height: 1 } };
const m7Static = { type: 'sprite', assetKey: 'm2_7x.png', sizeRatios: { width: 1, height: 1 } };
const m10Static = { type: 'sprite', assetKey: 'm3_10x.png', sizeRatios: { width: 1, height: 1 } };

const sSizeRatios = { width: 2.5, height: SPECIAL_SYMBOL_SIZE * 2.3 };

export const SYMBOL_INFO_MAP = {
	H1: {
		explosion,
		win: h1Win,
		postWinStatic: h1Idle,
		static: h1Idle,
		spin: h1Idle,
		land: h1Land,
	},
	H2: {
		explosion,
		win: h2Win,
		postWinStatic: h2Idle,
		static: h2Idle,
		spin: h2Idle,
		land: h2Land,
	},
	H3: {
		explosion,
		win: h3Win,
		postWinStatic: h3Idle,
		static: h3Idle,
		spin: h3Idle,
		land: h3Land,
	},
	H4: {
		explosion,
		win: h4Win,
		postWinStatic: h4Idle,
		static: h4Idle,
		spin: h4Idle,
		land: h4Land,
	},
	H5: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'H5',
			animationName: 'h5',
			sizeRatios: { width: 0.5 * 0.9, height: HIGH_SYMBOL_SIZE * 0.53 },
		},
		postWinStatic: h5Static,
		static: h5Static,
		spin: h5Static,
		land: h5Static,
	},
	L1: {
		explosion,
		win: l1Win,
		postWinStatic: l1Static,
		static: l1Static,
		spin: l1Static,
		land: l1Land,
	},
	L2: {
		explosion,
		win: l2Win,
		postWinStatic: l2Static,
		static: l2Static,
		spin: l2Static,
		land: l2Land,
	},
	L3: {
		explosion,
		win: l3Win,
		postWinStatic: l3Static,
		static: l3Static,
		spin: l3Static,
		land: l3Land,
	},
	L4: {
		explosion,
		win: l4Win,
		postWinStatic: l4Static,
		static: l4Static,
		spin: l4Static,
		land: l4Land,
	},
	W: {
		explosion,
		postWinStatic: wStatic,
		static: wStatic,
		spin: wStatic,
		win: wWin,
		land: wLand,
	},
	F: {
		explosion,
		postWinStatic: fStatic,
		static: fStatic,
		spin: fStatic,
		win: fStatic,
		land: fLand,
	},
	I: {
		explosion,
		postWinStatic: iStatic,
		static: iStatic,
		spin: iStatic,
		win: iStatic,
		land: iLand,
	},
	S: {
		explosion,
		postWinStatic: sStatic,
		static: sStatic,
		spin: {
			type: 'spine',
			assetKey: 'S',
			animationName: 'scatter_spin',
			sizeRatios: sSizeRatios,
		},
		win: { type: 'spine', assetKey: 'S', animationName: 'scatter_win', sizeRatios: sSizeRatios },
		land: {
			type: 'spine',
			assetKey: 'S',
			animationName: 'scatter_land',
			sizeRatios: sSizeRatios,
		},
	},
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
