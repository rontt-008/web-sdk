import _ from 'lodash';
import { Tween } from 'svelte/motion';
import { cubicInOut } from 'svelte/easing';

import { stateBet, stateBetDerived } from 'state-shared';
import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { BonusType, GameType, Position, RawSymbol, SymbolState } from './types';
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
	// already gone (its soul flew to the bonus meter): not drawn, and taken off without fading
	gone?: boolean;
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
	// the free spins' bonus, from freeSpinTrigger (the super bonus's powers are bigger, see runes.ts)
	bonusType: 'normal' as BonusType,
	// Fehu's multiplier, doubled by each Fehu symbol collected in the free spins (fehuSymbols); none
	// yet: the bonus's own (BONUS_POWERS)
	fehuMult: undefined as number | undefined,
	// the power spins Ingwaz gives, one more for each Ingwaz symbol collected (ingwazSymbols); none
	// yet: one
	ingwazSpins: undefined as number | undefined,
	tumbleBoardAdding: [] as TumbleSymbol[][],
	tumbleBoardBase: [] as TumbleSymbol[][],
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
	// the cells ("reel:row", the books' rows) whose symbols have flown to the bonus meter as souls:
	// left empty until the tumble takes them off (see flownKey)
	flown: [] as string[],
});

export const flownKey = ({ reel, row }: Position) => `${reel}:${row}`;

// how far above the middle of the screen the board sits, so its frame clears the UI under it (on
// wide screens its posts reach almost to the top of the screen, and their feet just behind the bar)
const BOARD_RAISE = { desktop: 27, landscape: 55, tablet: 55, portrait: 40 };
// how far right of the middle (left when negative) in the bonus: on wide screens a little left,
// sharing the room between the rune ladder on its left and the logo, bonus meter and fox on its
// right (further left makes those bigger and the ladder smaller); on phones held sideways, right to
// clear the menu, mute and buy bonus buttons on the left
const BOARD_SHIFT = { desktop: -30, landscape: 100, tablet: 0, portrait: 0 };
// In the base game it is up to this much further left, where the rune ladder isn't (it only shows
// in the bonus), so the fox right of it has room to be bigger; never so far that its frame leaves
// the screen (BOARD_SCREEN_MARGIN from the edge). Between the two it slides softly (slideBoard).
const BASE_SLIDE = { desktop: LAYOUT_UNIT * 1.6, landscape: 0, tablet: 0, portrait: 0 };
const BOARD_SCREEN_MARGIN = LAYOUT_UNIT * 0.04;
const BOARD_SLIDE_DURATION = 1200;
// where the board is: 0 in the base game's place, 1 in the bonus's
const boardSlide = new Tween(0, { easing: cubicInOut });

// slides the board to its place for the game type, done when it is there; `instant` puts it there
// straight away (a round resumed in the bonus)
const slideBoard = (gameType: GameType, { instant = false } = {}) =>
	boardSlide.set(gameType === 'freegame' ? 1 : 0, {
		duration: instant ? 0 : BOARD_SLIDE_DURATION / stateBetDerived.timeScale(),
	});

// the board's middle, left to right, at `slide` (0 its base game place, 1 its bonus place)
const boardX = (slide: number) => {
	const layoutType = stateLayoutDerived.layoutType();
	const main = stateLayoutDerived.mainLayout();
	const bonusX = main.width * 0.5 + BOARD_SHIFT[layoutType];
	const screenLeft = main.width / 2 - main.x / main.scale;
	const frameLeft = bonusX - boardFrameReach().left;
	const room = Math.max(0, frameLeft - screenLeft - BOARD_SCREEN_MARGIN);
	return bonusX - Math.min(BASE_SLIDE[layoutType], room) * (1 - slide);
};

const boardLayout = () => ({
	x: boardX(boardSlide.current),
	y: stateLayoutDerived.mainLayout().height * 0.5 - BOARD_RAISE[stateLayoutDerived.layoutType()],
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

// the middle of a cell of the board in the main layout, for a book's position (rows counted from 1)
const cellCentre = ({ reel, row }: Position) => {
	const board = boardLayout();
	return {
		x: board.x - board.width / 2 + (reel + 0.5) * SYMBOL_SIZE,
		y: board.y - board.height / 2 + (row - 0.5) * SYMBOL_SIZE,
	};
};

// The board frame art (static/assets/board-frame.webp, made from art-source/board-frame-plain.webp
// by art-source/board-frame.py): its size, the inner edges of its branches (the opening, which
// BoardFrame fills with a panel), and how far the branches and leaves reach, in the art's pixels
// (`upperRight`: how far right they reach down to 450 px, beside the bonus meter).
const BOARD_FRAME_ART = {
	width: 1342,
	height: 1342,
	opening: { left: 186, top: 234, right: 1175, bottom: 1148 },
	visible: { left: 64, top: 102, right: 1287, bottom: 1256, upperRight: 1273 },
};
// between the outer symbols and the branches
const BOARD_FRAME_MARGIN = LAYOUT_UNIT * 0.1;

// the frame's size, wherever the board is: the board's units per pixel of the art (`scale`), the
// same both ways so the art keeps its shape (the opening is a little wider than tall, so there is
// more panel left and right of the board), and how far its art reaches left of the board's middle
const boardFrameReach = () => {
	const { opening, visible } = BOARD_FRAME_ART;
	const scale = Math.max(
		(BOARD_SIZES.width + BOARD_FRAME_MARGIN * 2) / (opening.right - opening.left),
		(BOARD_SIZES.height + BOARD_FRAME_MARGIN * 2) / (opening.bottom - opening.top),
	);
	return { scale, left: ((opening.left + opening.right) / 2 - visible.left) * scale };
};

// the frame drawn so its opening fits the board plus a margin, centred on it; `opening` and
// `visible` are where its opening and its art reach
const boardFrameLayout = () => {
	const board = boardLayout();
	const { width, height, opening, visible } = BOARD_FRAME_ART;
	const { scale } = boardFrameReach();
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
			upperRight: board.x + (visible.upperRight - openingX) * scale,
		},
	};
};

// The logo (Logo) with the bonus meter (BonusMeter) under it, both keeping their shapes (their art
// is LOGO_ART and BONUS_METER_ART, width x height): right of the board frame, the logo as big as
// fits between it (clear of it) and the screen's edge in the bonus, from the top of the screen down
// to no lower than the middle of the board with the meter under it as wide (the fox stands below
// them; no wider than maxWidth on very wide screens). The meter only shows in the base game, where
// the board is further left (see boardX): it is as wide as the room there, up to meterGrowth times
// the logo, still no lower than the middle of the board; in the bonus the spin sign (`sign`) takes
// its place, as wide as the logo. With too little room there (phones held upright, almost square
// screens), the meter (and sign) over the middle of the frame's top as wide as it, and the logo over
// it as big as fits.
export const LOGO_ART = { width: 1579, height: 849 };
export const BONUS_METER_ART = { width: 1783, height: 541 };
const SIDE = {
	gap: LAYOUT_UNIT * 0.04,
	between: LAYOUT_UNIT * 0.1,
	above: LAYOUT_UNIT * 0.15,
	margin: LAYOUT_UNIT * 0.04,
	minWidth: LAYOUT_UNIT * 2.5,
	maxWidth: LAYOUT_UNIT * 7,
	meterGrowth: 1.4,
};
const LOGO_ASPECT = LOGO_ART.width / LOGO_ART.height;
const BONUS_METER_ASPECT = BONUS_METER_ART.width / BONUS_METER_ART.height;

const sideLayout = () => {
	const board = boardLayout();
	const frame = boardFrameLayout().visible;
	const main = stateLayoutDerived.mainLayout();
	const screenRight = main.width / 2 + stateLayoutDerived.canvasSizes().width / 2 / main.scale;
	const screenTop = main.height / 2 - main.y / main.scale;
	const left = frame.upperRight + SIDE.gap;
	const room = screenRight - SIDE.margin - left;
	// sized for the room in the bonus wherever the board is (further left in the base game, see
	// boardX), so only the fox under them grows and shrinks as the board slides
	const bonusRoom = room - (boardX(1) - board.x);

	if (bonusRoom >= SIDE.minWidth) {
		const top = screenTop + SIDE.margin;
		const fits = (board.y - top - SIDE.between) / (1 / LOGO_ASPECT + 1 / BONUS_METER_ASPECT);
		const width = Math.min(SIDE.maxWidth, bonusRoom, fits);
		const x = left + (room - width) / 2;
		const logo = { x, y: top, width, height: width / LOGO_ASPECT };
		const y = logo.y + logo.height + SIDE.between;
		const meterWidth = Math.min(
			SIDE.maxWidth,
			room,
			width * SIDE.meterGrowth,
			(board.y - y) * BONUS_METER_ASPECT,
		);
		const meter = {
			x: left + (room - meterWidth) / 2,
			y,
			width: meterWidth,
			height: meterWidth / BONUS_METER_ASPECT,
		};
		return { logo, meter, sign: { x, y, width } };
	}

	const middle = (frame.left + frame.right) / 2;
	const bottom = frame.top - SIDE.above;
	const meterWidth = Math.min(
		frame.right - frame.left,
		(bottom - screenTop - SIDE.margin) * BONUS_METER_ASPECT,
	);
	const meterHeight = meterWidth / BONUS_METER_ASPECT;
	const meter = {
		x: middle - meterWidth / 2,
		y: bottom - meterHeight,
		width: meterWidth,
		height: meterHeight,
	};
	const logoHeight = Math.max(
		0,
		Math.min(meterWidth / LOGO_ASPECT, meter.y - SIDE.between - screenTop - SIDE.margin),
	);
	const logoWidth = logoHeight * LOGO_ASPECT;
	const logo = {
		x: middle - logoWidth / 2,
		y: meter.y - SIDE.between - logoHeight,
		width: logoWidth,
		height: logoHeight,
	};
	return { logo, meter, sign: { x: meter.x, y: meter.y, width: meter.width } };
};

const logoLayout = () => sideLayout().logo;
const bonusMeterLayout = () => sideLayout().meter;
const spinSignLayout = () => sideLayout().sign;

// The background picture (static/assets/background.webp): its size, and how far down it the dirt
// path in front of the rocks on the right is, where the fox stands, in its pixels.
const BACKGROUND_ART = { width: 1672, height: 941, ground: 745 };

// the picture keeps its shape on every screen (wide, tall or square): scaled to cover the screen,
// centred on it, with the overflow cropped by the screen's edges
const backgroundLayout = () => {
	const canvas = stateLayoutDerived.canvasSizes();
	const scale = Math.max(
		canvas.width / BACKGROUND_ART.width,
		canvas.height / BACKGROUND_ART.height,
	);
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
	slideBoard,
	boardLayout,
	cellCentre,
	boardFrameLayout,
	bonusMeterLayout,
	spinSignLayout,
	logoLayout,
	backgroundLayout,
	backgroundGround,
	boardRaw,
	tumbleBoardCombined,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
