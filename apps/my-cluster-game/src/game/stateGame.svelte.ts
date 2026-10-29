import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { GameType, RawSymbol, SymbolState } from './types';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import {
	SYMBOL_SIZE,
	LAYOUT_UNIT,
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

	if (rawSymbol.name === 'W') {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: 'sfx_multiplier_landing',
		});
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
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
		onSymbolLand,
	});

	reel.reelState.spinOptions = () =>
		reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type TumbleSymbol = {
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

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
	tumbleBoardAdding: [] as TumbleSymbol[][],
	tumbleBoardBase: [] as TumbleSymbol[][],
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
});

// how far above the middle of the screen the board sits, so its frame clears the UI under it (on
// wide screens its posts reach almost to the top of the screen, and their feet just behind the bar)
const BOARD_RAISE = { desktop: 27, landscape: 55, tablet: 55, portrait: 40 };
// how far right of the middle (left when negative): on wide screens a little left, to leave the fox
// room on the right; on phones held sideways, right to clear the menu, mute and buy bonus buttons on
// the left
const BOARD_SHIFT = { desktop: -80, landscape: 100, tablet: 0, portrait: 0 };

const boardLayout = () => ({
	x:
		stateLayoutDerived.mainLayout().width * 0.5 +
		BOARD_SHIFT[stateLayoutDerived.layoutType()],
	y:
		stateLayoutDerived.mainLayout().height * 0.5 -
		BOARD_RAISE[stateLayoutDerived.layoutType()],
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

// The board frame art (static/assets/board-frame.webp, made from art-source/board-frame-plain.webp
// by art-source/board-frame.py): its size, the inner edges of its branches (the opening, which
// BoardFrame fills with a panel), and how far the branches and leaves reach, in the art's pixels.
const BOARD_FRAME_ART = {
	width: 1342,
	height: 1342,
	opening: { left: 186, top: 234, right: 1175, bottom: 1148 },
	visible: { left: 64, top: 102, right: 1287, bottom: 1256 },
};
// between the outer symbols and the branches
const BOARD_FRAME_MARGIN = LAYOUT_UNIT * 0.1;

// the frame drawn so its opening fits the board plus a margin, centred on it; `opening` and
// `visible` are where its opening and its art reach
const boardFrameLayout = () => {
	const board = boardLayout();
	const { width, height, opening, visible } = BOARD_FRAME_ART;
	// the board's units per pixel of the art, the same both ways so the art keeps its shape: the
	// opening is a little wider than tall, so there is more panel left and right of the board
	const scale = Math.max(
		(board.width + BOARD_FRAME_MARGIN * 2) / (opening.right - opening.left),
		(board.height + BOARD_FRAME_MARGIN * 2) / (opening.bottom - opening.top),
	);
	const openingX = (opening.left + opening.right) / 2;
	const openingY = (opening.top + opening.bottom) / 2;

	return {
		x: board.x,
		y: board.y,
		anchor: { x: openingX / width, y: openingY / height },
		width: width * scale,
		height: height * scale,
		opening: {
			left: board.x - (openingX - opening.left) * scale,
			right: board.x + (opening.right - openingX) * scale,
			top: board.y - (openingY - opening.top) * scale,
			bottom: board.y + (opening.bottom - openingY) * scale,
		},
		visible: {
			left: board.x - (openingX - visible.left) * scale,
			right: board.x + (visible.right - openingX) * scale,
			top: board.y - (openingY - visible.top) * scale,
			bottom: board.y + (visible.bottom - openingY) * scale,
		},
	};
};

// The background picture (static/assets/background.webp): its size, and how far down it the dirt
// path in front of the rocks on the right is, where the fox stands, in its pixels.
const BACKGROUND_ART = { width: 1672, height: 941, ground: 745 };

// the picture keeps its shape on every screen (wide, tall or square): scaled to cover the screen,
// centred on it, with the overflow cropped by the screen's edges
const backgroundLayout = () => {
	const canvas = stateLayoutDerived.canvasSizes();
	const scale = Math.max(canvas.width / BACKGROUND_ART.width, canvas.height / BACKGROUND_ART.height);
	return {
		x: (canvas.width - BACKGROUND_ART.width * scale) / 2,
		y: (canvas.height - BACKGROUND_ART.height * scale) / 2,
		scale,
		width: BACKGROUND_ART.width,
		height: BACKGROUND_ART.height,
	};
};

// how far down the main layout (the board's) the background's ground is
const backgroundGround = () => {
	const background = backgroundLayout();
	const main = stateLayoutDerived.mainLayout();
	const canvasY = background.y + BACKGROUND_ART.ground * background.scale;
	return main.height / 2 + (canvasY - main.y) / main.scale;
};

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const tumbleBoardCombined = () => {
	const tumbleBoardCombined = stateGame.tumbleBoardBase.map((tumbleReelBase, reelIndex) => {
		const tumbleReelAdding = stateGame.tumbleBoardAdding[reelIndex] ?? [];
		return [...tumbleReelAdding, ...tumbleReelBase];
	});

	return tumbleBoardCombined;
};

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

// win levels

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardFrameLayout,
	backgroundLayout,
	backgroundGround,
	boardRaw,
	tumbleBoardCombined,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
