import _ from 'lodash';

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
	[{ name: 'L1' }, { name: 'H3' }, { name: 'L4' }, { name: 'L1' }, { name: 'H2' }, { name: 'L1' }, { name: 'L2' }],
	[{ name: 'H3' }, { name: 'L1' }, { name: 'L2' }, { name: 'H4' }, { name: 'L4' }, { name: 'L3' }, { name: 'L4' }],
	[{ name: 'H2' }, { name: 'L2' }, { name: 'L4' }, { name: 'H3' }, { name: 'L3' }, { name: 'H2' }, { name: 'H3' }],
	[{ name: 'H4' }, { name: 'H3' }, { name: 'H2' }, { name: 'L3' }, { name: 'L2' }, { name: 'L1' }, { name: 'L4' }],
	[{ name: 'L3' }, { name: 'L4' }, { name: 'H4' }, { name: 'L1' }, { name: 'H4' }, { name: 'L4' }, { name: 'L2' }],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
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

const M_SIZE = 0.3;
const HIGH_SYMBOL_SIZE = 0.9;
const SPECIAL_SYMBOL_SIZE = 1;

const SPIN_OPTIONS_SHARED = {
	reelFallInDelay: 80,
	reelPaddingMultiplierNormal: 1.25,
	reelPaddingMultiplierAnticipated: 18,
	reelFallOutDelay: 145,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 3.5,
	symbolFallInInterval: 30,
	symbolFallInBounceSpeed: 0.15,
	symbolFallInBounceSizeMulti: 0.5,
	symbolFallOutSpeed: 3.5,
	symbolFallOutInterval: 20,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 7,
	symbolFallInInterval: 0,
	symbolFallInBounceSpeed: 0.3,
	symbolFallInBounceSizeMulti: 0.25,
	symbolFallOutSpeed: 7,
	symbolFallOutInterval: 0,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

const explosion = {
	type: 'spine',
	assetKey: 'explosion',
	animationName: 'explosion',
	sizeRatios: { width: 1, height: 1 },
};

// the high symbols, framed tiles playing their idle loops (the user's Blender animations, see
// art-source/symbol-idles.py and SymbolIdle) in every state, a win too: the wood of their frames is
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
// their win is the idle, as its own object: a symbol is done with its win when it gets a new state
// (SymbolIdle), and one that looks the same as before would wait forever
const h1Win = { ...h1Idle };
const h2Win = { ...h2Idle };
const h3Win = { ...h3Idle };
const h4Win = { ...h4Idle };
const h5Static = { type: 'sprite', assetKey: 'h5.webp', sizeRatios: { width: 1, height: 1 } };

// the low symbols are leaves, with no Spine: they flutter when they win (see motion.ts)
const l1Static = { type: 'sprite', assetKey: 'leafGreen', sizeRatios: { width: 1, height: 1 } };
const l2Static = { type: 'sprite', assetKey: 'leafBrown', sizeRatios: { width: 1, height: 1 } };
const l3Static = { type: 'sprite', assetKey: 'leafRed', sizeRatios: { width: 1, height: 1 } };
const l4Static = { type: 'sprite', assetKey: 'leafYellow', sizeRatios: { width: 1, height: 1 } };

const sStatic = { type: 'sprite', assetKey: 's.png', sizeRatios: { width: 1.243, height: 1.243 } };
const wStatic = { type: 'sprite', assetKey: 'w.png', sizeRatios: { width: 1.12, height: 1.12 } };

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

const wSizeRatios = { width: 1.5 * 0.9, height: SPECIAL_SYMBOL_SIZE * 1.15 };
const sSizeRatios = { width: 2.5, height: SPECIAL_SYMBOL_SIZE * 2.3 };

export const SYMBOL_INFO_MAP = {
	H1: {
		explosion,
		win: h1Win,
		postWinStatic: h1Idle,
		static: h1Idle,
		spin: h1Idle,
		land: h1Idle,
	},
	H2: {
		explosion,
		win: h2Win,
		postWinStatic: h2Idle,
		static: h2Idle,
		spin: h2Idle,
		land: h2Idle,
	},
	H3: {
		explosion,
		win: h3Win,
		postWinStatic: h3Idle,
		static: h3Idle,
		spin: h3Idle,
		land: h3Idle,
	},
	H4: {
		explosion,
		win: h4Win,
		postWinStatic: h4Idle,
		static: h4Idle,
		spin: h4Idle,
		land: h4Idle,
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
		win: { ...l1Static, motion: 'flutter' },
		postWinStatic: l1Static,
		static: l1Static,
		spin: l1Static,
		land: l1Static,
	},
	L2: {
		explosion,
		win: { ...l2Static, motion: 'flutter' },
		postWinStatic: l2Static,
		static: l2Static,
		spin: l2Static,
		land: l2Static,
	},
	L3: {
		explosion,
		win: { ...l3Static, motion: 'flutter' },
		postWinStatic: l3Static,
		static: l3Static,
		spin: l3Static,
		land: l3Static,
	},
	L4: {
		explosion,
		win: { ...l4Static, motion: 'flutter' },
		postWinStatic: l4Static,
		static: l4Static,
		spin: l4Static,
		land: l4Static,
	},
	W: {
		explosion,
		postWinStatic: {
			type: 'sprite',
			assetKey: 'explodedW.png',
			sizeRatios: { width: 0.85, height: 0.85 },
		},
		static: wStatic,
		spin: wStatic,
		win: { type: 'spine', assetKey: 'W', animationName: 'wild_dynamite', sizeRatios: wSizeRatios },
		land: {
			type: 'spine',
			assetKey: 'W',
			animationName: 'wild_dynamite_land',
			sizeRatios: wSizeRatios,
		},
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
