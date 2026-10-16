import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { PORTRAIT_UI_HEIGHT, LayoutDesktopBar, getDesktopBarBounds } from 'components-ui-pixi';
import { createEnhanceBoard, createReelForSpinning } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { BonusType, GameType, Position, RawSymbol, SymbolState } from './types';
import { stateLayoutDerived } from './stateLayout';
import { uiTheme } from './uiTheme';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
} from './constants';

const onSymbolLand = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.name === 'S') {
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()],
		});
	}

	// once per big wild, not for each W it covers
	if (rawSymbol.name === 'W' && rawSymbol.bigWild?.anchor !== false) {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: 'sfx_multiplier_landing',
		});
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForSpinning({
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
		onSymbolLand,
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
	// the free spins bonus being played, set from the trigger
	bonusType: undefined as BonusType | undefined,
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
	// blurs the background, board and logo behind a screen shown over them (see SceneBlur)
	blurScene: false,
	// while a win is shown, the positions in it (big wilds by their top row): the rest of the board
	// is shaded (see ReelSymbol)
	winHighlight: undefined as Position[] | undefined,
	// SUPER free spins: reels that show nothing while big wilds walk (one walks off a reel another is
	// moving onto)
	hiddenReels: [] as number[],
});

// vertical position of the board's centre; raised on screens where the bottom UI would overlap it
// (portrait places it from the UI instead, see portraitBoardY)
const BOARD_Y_RATIO = { desktop: 0.47, landscape: 0.5, tablet: 0.5 };

// on desktop the board sits right of centre so the logo beside it and the board are centred together
// (landscape keeps it centred, clear of the spin buttons on the right)
const BOARD_X_OFFSET = { desktop: SYMBOL_SIZE, portrait: 0, landscape: 0, tablet: 0 };

// On phones held upright the UI keeps to the bottom of the screen, so a fixed board height leaves a
// gap above it that grows with the screen's height. The board's frame ends this far above the UI's
// top instead.
const PORTRAIT_GAP_ABOVE_UI = SYMBOL_SIZE * 0.35;
// the board frame, with its leaves, reaches this far below the board (see BoardFrame)
const FRAME_BELOW_BOARD = SYMBOL_SIZE * 0.95;

const portraitBoardY = () => {
	const canvas = stateLayoutDerived.canvasSizes();
	const main = stateLayoutDerived.mainLayout();
	// the UI's top on the screen, which keeps to the bottom, then in the board's units (the board's
	// layout is centred on the screen)
	const uiTop = canvas.height - PORTRAIT_UI_HEIGHT * stateLayoutDerived.mainLayoutStandard().scale;
	const uiTopOnBoard = main.height * 0.5 + (uiTop - canvas.height * 0.5) / main.scale;
	return uiTopOnBoard - PORTRAIT_GAP_ABOVE_UI - FRAME_BELOW_BOARD - BOARD_SIZES.height * 0.5;
};

const boardY = () => {
	const layoutType = stateLayoutDerived.layoutType();
	if (layoutType === 'portrait') return portraitBoardY();
	return stateLayoutDerived.mainLayout().height * BOARD_Y_RATIO[layoutType];
};

const boardLayout = () => ({
	x:
		stateLayoutDerived.mainLayout().width * 0.5 +
		BOARD_X_OFFSET[stateLayoutDerived.layoutType()],
	y: boardY(),
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

// the screen's edges, in the game's layout (which is scaled about the screen's
// middle, see MainContainer)
const screenEdges = () => {
	const main = stateLayoutDerived.mainLayout();
	const canvas = stateLayoutDerived.canvasSizes();
	return {
		left: main.width * 0.5 - (canvas.width * 0.5) / main.scale,
		right: main.width * 0.5 + (canvas.width * 0.5) / main.scale,
		top: main.height * 0.5 - (canvas.height * 0.5) / main.scale,
		bottom: main.height * 0.5 + (canvas.height * 0.5) / main.scale,
	};
};

// Where the UI's bar along the bottom of the screen is, in the game's layout: its two ends and the
// top of its panels. Only on the screens where the UI is drawn as that bar (see uiTheme's layouts).
const uiBarBounds = () => {
	const layoutType = stateLayoutDerived.layoutType();
	if (uiTheme.layouts?.[layoutType] !== LayoutDesktopBar) return undefined;
	const standard = stateLayoutDerived.mainLayoutStandard();
	const main = stateLayoutDerived.mainLayout();
	const canvas = stateLayoutDerived.canvasSizes();
	const bar = getDesktopBarBounds({ theme: uiTheme, layoutType, standard });
	// the UI's standard layout is centred across the screen and drawn against its bottom; the game's
	// is centred on the screen (see MainContainer)
	const toGameX = (x: number) =>
		main.width * 0.5 + ((x - standard.width * 0.5) * standard.scale) / main.scale;
	const toGameY = (y: number) =>
		main.height * 0.5 +
		(canvas.height * 0.5 - (standard.height - y) * standard.scale) / main.scale;
	return { left: toGameX(bar.left), right: toGameX(bar.right), top: toGameY(bar.top) };
};

const LOGO_RATIO = 1400 / 596;

// Beside the board, the logo keeps close to the screen's left edge, but on very wide screens no
// further than this from the board. Its top is up level with the top of the board's frame, clear
// of the game's name in the screen's corner, so the free spin counter under it keeps clear of the
// cat on its rock below (see LogoCat).
const LOGO_BESIDE_BOARD = {
	width: SYMBOL_SIZE * 3.25,
	screenMargin: SYMBOL_SIZE * 0.1,
	maxGapToBoard: SYMBOL_SIZE * 1.5,
	// down from the board's middle, in board heights
	top: 0.71,
};

// wide screens have room for the logo (and the free spin counter under it) beside the board
const isLogoBesideBoard = () => ['desktop', 'landscape'].includes(stateLayoutDerived.layoutType());

const logoLayout = () => {
	const board = boardLayout();
	const boardLeft = board.x - board.width * 0.5;
	const boardTop = board.y - board.height * 0.5;

	if (isLogoBesideBoard()) {
		const { width, screenMargin, maxGapToBoard, top } = LOGO_BESIDE_BOARD;
		const height = width / LOGO_RATIO;
		return {
			x: Math.max(
				screenEdges().left + screenMargin + width * 0.5,
				boardLeft - maxGapToBoard - width * 0.5,
			),
			y: board.y - board.height * top + height * 0.5,
			width,
			height,
		};
	}

	// no room beside the board on narrow screens, so sit above it instead, leaving room for the frame
	const spaceAbove = boardTop - SYMBOL_SIZE;
	const height = Math.min(SYMBOL_SIZE * 1.9, spaceAbove * 0.95);
	return {
		x: board.x,
		y: spaceAbove * 0.5,
		width: height * LOGO_RATIO,
		height,
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
	screenEdges,
	uiBarBounds,
	isLogoBesideBoard,
	logoLayout,
	boardRaw,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
