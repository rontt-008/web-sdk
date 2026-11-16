import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet, stateBetDerived } from 'state-shared';
import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { GameType, RawSymbol, SymbolState } from './types';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import { PICTURE } from './caveWater';
import { startTallWild } from './tallWilds.svelte';
import { stickyBatOn } from './stickyBats.svelte';
import { symbolLanded } from './landPose.svelte';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
	FREE_SPINS,
	LOGO_ART,
} from './constants';

// (symbolIndex: as the reels number them, 1 to BOARD_DIMENSIONS.y the board's rows, 0 and the last the
// padding rows above and below it)
const onSymbolLand = ({ rawSymbol, symbolIndex }: { rawSymbol: RawSymbol; symbolIndex: number }) => {
	if (rawSymbol.name === 'S') {
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()],
		});
	}

	if (rawSymbol.name === 'W') {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: 'sfx_multiplier_landing',
		});
		// a bat ring dropping onto the board: the bat right of the board attacks, as it does when the free
		// spins trigger (Bat; the user, 2026-11-14: "when a bat symbol spawn/ tumbles in make the bat do the
		// bonus animation"); several in one drop, one attack (BatSpine)
		if (symbolIndex >= 1 && symbolIndex <= BOARD_DIMENSIONS.y) {
			eventEmitter.broadcast({ type: 'batAttack' });
		}
	}
};

// The free spins symbol's drop falls in before it hits the ground (art-source/free-spins.py): each
// symbol goes to 'land' this long (ms) before it reaches its place as it drops in, so the drop hits as
// it arrives: FREE_SPINS.impactMs, at the game's speed (turbo plays it faster). (The other symbols land
// as their stills, so for them it makes no difference. The letters' and premiums' lands, which hit at
// the same 0.1 s, were taken out on 2026-11-13; this read their skeletons' `impact` event till then.)
const landLead = () => FREE_SPINS.impactMs / stateBetDerived.timeScale();

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	// the reels drop their symbols in, rather than spinning (SPIN_OPTIONS)
	const reel = createReelForCascading({
		reelIndex,
		symbolHeight: SYMBOL_SIZE,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBet.isTurbo,
			});
		},
		onSymbolLand: ({ rawSymbol, symbolIndex }) => {
			onSymbolLand({ rawSymbol, symbolIndex });
			// it has reached its place: its slight tumble (landPose, ReelSymbol)
			symbolLanded(reelIndex, symbolIndex);
			// once the reel's board rows have all dropped in (the top one lands last): a bat ring on them
			// turns into the tall wild (tallWilds; in a free spin it turns back once the spin is done), or
			// in the bonus a sticky bat going to this reel lands on one and does it from there (stickyBats)
			if (symbolIndex !== 1) return;
			const rows = reel.reelState.symbols.slice(1, 1 + BOARD_DIMENSIONS.y);
			const inBonus = stateGame.gameType === 'freegame';
			const bat = inBonus ? stickyBatOn(reelIndex) : undefined;
			if (rows.some((reelSymbol) => reelSymbol.rawSymbol.name === 'W')) {
				startTallWild(reelIndex, reel.reelState.symbols, inBonus);
			} else if (bat) {
				startTallWild(reelIndex, reel.reelState.symbols, true, bat);
			}
		},
		landLead,
	});

	reel.reelState.spinOptions = () =>
		reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type MultiplierSymbol = {
	initX: number;
	initY: number;
	symbolX: Tween<number>;
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
});

// The board: the user's blue stone frame round its dark blue panel (art-source/board-frame.py cuts
// board-frame.webp, FRAME_PICTURE px, from their picture). The panel (FRAME_INNER, in the picture's
// px) is fitted round the cells, FRAME_MARGIN from its walls, so the outer symbols almost touch them
// (the cells were sized to fill the panel: SYMBOL_SIZE x REEL_WIDTH; the panel is 648 x 499 units,
// as it was round 120-unit cells with roomier margins); the picture's panel is a little wider still,
// so it is squeezed across (~6%).
const FRAME_PICTURE = { width: 1284, height: 993 };
const FRAME_INNER = { x: 74, y: 105, width: 1139, height: 826 };
const FRAME_MARGIN = { x: 4, y: 3.5 };
// how far the frame (its rocks) reaches above and below the board's middle, in board units
const FRAME_SCALE_Y = (BOARD_SIZES.height + FRAME_MARGIN.y * 2) / FRAME_INNER.height;
const FRAME_REACH = {
	above: (FRAME_INNER.y + FRAME_INNER.height / 2) * FRAME_SCALE_Y,
	below: (FRAME_PICTURE.height - FRAME_INNER.y - FRAME_INNER.height / 2) * FRAME_SCALE_Y,
};

// Where the board goes. On desktop it is grown (the user, 2026-11-12: "make the board bigger so it almost
// touches the top") so its frame reaches from FRAME_SPAN.top (of the main layout's height: its rocks
// just under the top of the screen) to FRAME_SPAN.bottom (where it reached before, clear of the panel
// bar's spin disc): ~9% bigger. Elsewhere it is its own size, its middle at BOARD_Y_RATIO of the height.
// Everything on it (BoardContainer) is drawn at its scale; what is placed by it outside (the frame, the
// anticipation columns, the bat, the free spins counter) takes its scale into account.
const BOARD_Y_RATIO = { desktop: 0.47, tablet: 0.5, landscape: 0.5, portrait: 0.5 };
const FRAME_SPAN: Partial<Record<keyof typeof BOARD_Y_RATIO, { top: number; bottom: number }>> = {
	desktop: { top: 0.01, bottom: 0.829 },
};

const boardLayout = () => {
	const main = stateLayoutDerived.mainLayout();
	const type = stateLayoutDerived.layoutType();
	const span = FRAME_SPAN[type];
	const scale = span
		? ((span.bottom - span.top) * main.height) / (FRAME_REACH.above + FRAME_REACH.below)
		: 1;
	return {
		x: main.width * 0.5,
		y: span ? span.top * main.height + FRAME_REACH.above * scale : main.height * BOARD_Y_RATIO[type],
		scale,
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
		// (its own size, in board units: on screen times scale)
		...BOARD_SIZES,
	};
};

// where the frame picture's top left goes and its scale (see BoardFrame), and its edges
const boardFrameLayout = () => {
	const board = boardLayout();
	const scale = {
		x: ((board.width + FRAME_MARGIN.x * 2) / FRAME_INNER.width) * board.scale,
		y: ((board.height + FRAME_MARGIN.y * 2) / FRAME_INNER.height) * board.scale,
	};
	// board.x/y is the board's centre; the picture goes so its panel is centred there
	const x = board.x - (FRAME_INNER.x + FRAME_INNER.width / 2) * scale.x;
	const y = board.y - (FRAME_INNER.y + FRAME_INNER.height / 2) * scale.y;
	return {
		x,
		y,
		scale,
		right: x + FRAME_PICTURE.width * scale.x,
		bottom: y + FRAME_PICTURE.height * scale.y,
	};
};

// The logo (Logo: the user's title, LOGO_ART), on wide
// screens in the room left of the board frame (from margin inside the screen's left edge to gap left of
// the frame; it was right of it, over the bat, till 2026-11-13: "move the logo to the left and move free
// spins sign down"), at the top of the screen (top below its edge): fill of the room's width, at most
// maxWidth; not shown where that would be narrower than minWidth. The free spins sign goes below it
// (FreeSpinCounter).
const LOGO = {
	...LOGO_ART,
	fill: 0.96,
	maxWidth: SYMBOL_SIZE * 3.4,
	minWidth: SYMBOL_SIZE * 1.6,
	gap: SYMBOL_SIZE * 0.08,
	margin: SYMBOL_SIZE * 0.1,
	// (0.1 till 2026-11-13, the user: "move the logo down a bit")
	top: SYMBOL_SIZE * 0.4,
};
const logoLayout = () => {
	const frame = boardFrameLayout();
	const main = stateLayoutDerived.mainLayout();
	const canvas = stateLayoutDerived.canvasSizes();
	const left = main.width / 2 - canvas.width / 2 / main.scale + LOGO.margin;
	const right = frame.x - LOGO.gap;
	const width = Math.min(LOGO.maxWidth, (right - left) * LOGO.fill);
	const scale = width / LOGO.width;
	const top = main.height / 2 - canvas.height / 2 / main.scale + LOGO.top;
	return {
		// (x: the skeleton's origin, so that what shows of it is centred in the room, at middle)
		x: (left + right) / 2 - LOGO.shiftX * scale,
		middle: (left + right) / 2,
		y: top + LOGO.above * scale,
		bottom: top + (LOGO.above + LOGO.below) * scale,
		width,
		scale,
		shown: stateLayoutDerived.layoutType() === 'desktop' && width >= LOGO.minWidth,
	};
};

// the background picture covering the canvas, centred (see Background)
const backgroundLayout = () => {
	const canvas = stateLayoutDerived.canvasSizes();
	const scale = Math.max(canvas.width / PICTURE.width, canvas.height / PICTURE.height);
	return {
		x: (canvas.width - PICTURE.width * scale) / 2,
		y: (canvas.height - PICTURE.height * scale) / 2,
		scale,
	};
};

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardFrameLayout,
	logoLayout,
	backgroundLayout,
	boardRaw,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
