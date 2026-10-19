import _ from 'lodash';

import type { BonusType, RawSymbol, SymbolName, SymbolState } from './types';

// row height
export const SYMBOL_SIZE = 120;
// reels are wider than the rows are tall, so the big wild art (about 1:2.5) is barely
// squashed to fill a reel 4 rows tall
export const REEL_WIDTH = SYMBOL_SIZE * 1.3;

export const REEL_PADDING = 0.5;

// initial board (padded top and bottom)
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
			name: 'L5',
		},
		{
			name: 'L2',
		},
		{
			name: 'H3',
		},
		{
			name: 'H2',
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
			name: 'L5',
		},
		{
			name: 'L3',
		},
		{
			name: 'H4',
		},
		{
			name: 'L1',
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
			name: 'L5',
		},
		{
			name: 'H1',
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
			name: 'L2',
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

// board-frame.png is 1174x772; the inner wooden panel (where the reels sit) was measured from the
// image, and it is stretched to wrap the board with some wood (padding) around the reels
export const BOARD_FRAME = {
	image: { width: 1174, height: 772 },
	inner: { x: 140, y: 135, width: 881, height: 530 },
	padding: SYMBOL_SIZE * 0.1,
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

export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4'];
// the cats; they jiggle as their reel lands (see ReelSymbol)
export const CAT_SYMBOLS: SymbolName[] = ['H1', 'H2', 'H3', 'H4'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: 0.15,
	reelSpinSpeedBeforeBounce: 4,
	reelPaddingMultiplierNormal: 1.2,
	reelPaddingMultiplierAnticipated: 10,
	reelSpinDelay: 145,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 2.4,
	reelSpinSpeed: 3.6,
	reelBounceSizeMulti: 0.3,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 5,
	reelSpinSpeed: 5,
	reelBounceSizeMulti: 0.05,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

// The symbol art is cropped to its edges, so size each image by its area (wide and tall art then
// look equally big) and cap its width and height so it stays inside the cell. The width cap is
// against the reel width, so wide art can use the extra room of the wide reels.
const SYMBOL_ART_SIZE = 1.05;
const SYMBOL_ART_MAX_HEIGHT = 0.96;
const SYMBOL_ART_MAX_WIDTH = (0.9 * REEL_WIDTH) / SYMBOL_SIZE;
// widened a little to suit the wide reels (round art can opt out, see sStatic)
const SYMBOL_ART_STRETCH_X = 1.1;
// The sizes of the symbol images (and of the cat and its rock under the logo) and of their soft
// shadow images (`<key>Shadow`): the same art blurred, with padding around it, so it shares the
// art's centre and scale.
export const SYMBOL_IMAGES = {
	logoCat: { image: [470, 555], shadow: [554, 639] },
	logoRock: { image: [560, 335], shadow: [660, 435] },
	symbolH1: { image: [277, 290], shadow: [329, 342] },
	symbolH2: { image: [329, 288], shadow: [387, 346] },
	symbolH3: { image: [296, 223], shadow: [348, 275] },
	symbolH4: { image: [240, 282], shadow: [292, 334] },
	symbolL1: { image: [562, 419], shadow: [662, 519] },
	symbolL2: { image: [339, 265], shadow: [403, 329] },
	symbolL3: { image: [306, 256], shadow: [364, 314] },
	symbolL4: { image: [676, 403], shadow: [800, 527] },
	symbolL5: { image: [474, 325], shadow: [562, 413] },
	symbolS: { image: [512, 423], shadow: [604, 515] },
	symbolW: { image: [512, 493], shadow: [604, 585] },
} as const satisfies Record<
	string,
	{ image: readonly [number, number]; shadow: readonly [number, number] }
>;
export type SymbolImageKey = keyof typeof SYMBOL_IMAGES;

// `size` scales a symbol that looks too big or small next to the others.
const symbolArt = (assetKey: SymbolImageKey, stretchX = SYMBOL_ART_STRETCH_X, size = 1) => {
	const {
		image: [imageWidth, imageHeight],
		shadow: [shadowWidth, shadowHeight],
	} = SYMBOL_IMAGES[assetKey];
	const scale =
		size *
		Math.min(
			SYMBOL_ART_SIZE / Math.sqrt(imageWidth * imageHeight),
			SYMBOL_ART_MAX_HEIGHT / imageHeight,
			SYMBOL_ART_MAX_WIDTH / (imageWidth * stretchX),
		);
	return {
		type: 'sprite',
		assetKey,
		sizeRatios: { width: imageWidth * scale * stretchX, height: imageHeight * scale },
		shadow: {
			assetKey: `${assetKey}Shadow`,
			sizeRatios: {
				width: shadowWidth * scale * stretchX,
				height: shadowHeight * scale,
			},
		},
	};
};

const h1Static = symbolArt('symbolH1');
const h2Static = symbolArt('symbolH2');
const h3Static = symbolArt('symbolH3');
const h4Static = symbolArt('symbolH4');

const l1Static = symbolArt('symbolL1');
// the collar
const l2Static = symbolArt('symbolL2', SYMBOL_ART_STRETCH_X, 0.9);
// the paw
const l3Static = symbolArt('symbolL3', SYMBOL_ART_STRETCH_X, 0.85);
const l4Static = symbolArt('symbolL4');
// the bowl
const l5Static = symbolArt('symbolL5', SYMBOL_ART_STRETCH_X, 0.9);

// not widened: the round badge looks squashed when stretched
const sStatic = symbolArt('symbolS', 1);
const wStatic = symbolArt('symbolW');

// A reel that lands any W is drawn as one big wild, stretched over the whole reel.
export const BIG_WILD_INFO = {
	type: 'sprite',
	assetKey: 'bigWild',
	sizeRatios: { width: REEL_WIDTH / SYMBOL_SIZE, height: BOARD_DIMENSIONS.y },
	winPulseScale: 1.05,
} as const;
// its multiplier sits on the water strip, centred 88.1% of the way down the art
export const BIG_WILD_MULTIPLIER = {
	y: (0.881 - 0.5) * BOARD_DIMENSIONS.y * SYMBOL_SIZE,
	fontSize: SYMBOL_SIZE * 0.4,
	maxWidth: REEL_WIDTH * 0.6,
};

export const SYMBOL_INFO_MAP = {
	// sprite symbols in the 'win' state get a pulse animation in Symbol.svelte
	H1: {
		win: h1Static,
		postWinStatic: h1Static,
		static: h1Static,
		spin: h1Static,
		land: h1Static,
	},
	H2: {
		win: h2Static,
		postWinStatic: h2Static,
		static: h2Static,
		spin: h2Static,
		land: h2Static,
	},
	H3: {
		win: h3Static,
		postWinStatic: h3Static,
		static: h3Static,
		spin: h3Static,
		land: h3Static,
	},
	H4: {
		win: h4Static,
		postWinStatic: h4Static,
		static: h4Static,
		spin: h4Static,
		land: h4Static,
	},
	L1: {
		win: l1Static,
		postWinStatic: l1Static,
		static: l1Static,
		spin: l1Static,
		land: l1Static,
	},
	L2: {
		win: l2Static,
		postWinStatic: l2Static,
		static: l2Static,
		spin: l2Static,
		land: l2Static,
	},
	L3: {
		win: l3Static,
		postWinStatic: l3Static,
		static: l3Static,
		spin: l3Static,
		land: l3Static,
	},
	L4: {
		win: l4Static,
		postWinStatic: l4Static,
		static: l4Static,
		spin: l4Static,
		land: l4Static,
	},
	L5: {
		win: l5Static,
		postWinStatic: l5Static,
		static: l5Static,
		spin: l5Static,
		land: l5Static,
	},
	W: {
		win: wStatic,
		postWinStatic: wStatic,
		static: wStatic,
		spin: wStatic,
		land: wStatic,
	},
	S: {
		win: sStatic,
		postWinStatic: sStatic,
		static: sStatic,
		spin: sStatic,
		land: sStatic,
	},
} as const;

// The number of FS symbols that trigger free spins picks the bonus (see getBonusType).
export const BONUS_SCATTER_COUNT: Record<BonusType, number> = { normal: 3, super: 4, mythic: 5 };
// shown before "FREE SPINS" on the intro and the free spin counter; the normal bonus has none
export const BONUS_NAME: Record<BonusType, string | undefined> = {
	normal: undefined,
	super: 'SUPER',
	mythic: 'MYTHIC',
};
// how the bonus works, under its name on the intro
export const BONUS_DESCRIPTION: Record<BonusType, string | undefined> = {
	normal: 'When a wild lands, it has a chance to shoot out extra wilds.',
	super: 'Big wilds stay and move one reel left every spin, until they leave the reels.',
	mythic: 'Big wilds stay and move one reel left every spin, doubling their multiplier each time.',
};
// For the pay table; they must match the math. Free spins for 3, 4 and 5 FS symbols, and the spins
// 2 to 5 FS symbols add during free spins (the math's freespin_triggers).
export const FREE_SPINS_AWARDED: Record<number, number> = { 3: 8, 4: 12, 5: 15 };
export const FREE_SPINS_ADDED: Record<number, number> = { 2: 3, 3: 5, 4: 8, 5: 12 };
// the multipliers a wild can carry in free spins (the math's mult_values for the free game)
export const FREE_SPIN_WILD_MULTIPLIERS = [2, 3, 4, 5, 10, 20, 50, 75, 100, 150, 200];
// the multipliers a wild can carry in the feature spin (the math's feature_wild_multipliers)
export const FEATURE_SPIN_WILD_MULTIPLIERS = [2, 3, 4, 5, 10, 20, 50, 100];

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
