import _ from 'lodash';
import { Tween } from 'svelte/motion';

import { stateBet } from 'state-shared';
import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { GameType, PieceColour, Position, RawSymbol, SymbolName } from './types';
import { stateLayoutDerived } from './stateLayout';
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
} from './constants';

// The reels: the board the pieces drop onto each spin (the SDK's cascading reels, one a column). Once
// landed, the play board (stateGame.pieces, PlayBoard) takes over to move the pieces about; the reels
// take over again, where the pieces stand, for the next spin (reelsFromPlayBoard).
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
		onSymbolLand: () => {},
	});

	reel.reelState.spinOptions = () =>
		reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

// a piece on the play board: its symbol, the square it is on (the books' rows, 1-8), where it is drawn
// in the board's units (tweened as it moves), and whether it has been taken (bursting, then gone)
export type PlayPiece = {
	id: number;
	symbol: SymbolName;
	reel: number;
	row: number;
	x: Tween<number>;
	y: Tween<number>;
	scale: Tween<number>;
	alpha: Tween<number>;
	gone: boolean;
};

const COLOUR_KEY = 'my-chess-game:colour';

// the colour your pieces are drawn in, kept between visits (the toggle, SideToggle)
const loadColour = (): PieceColour => {
	try {
		return localStorage.getItem(COLOUR_KEY) === 'black' ? 'black' : 'white';
	} catch {
		return 'white';
	}
};

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	pieces: [] as PlayPiece[],
	// the play board in place of the reels (between a spin's landing and the next spin)
	playBoardShown: false,
	yourColour: loadColour(),
	// the spin's multiplier: 1, one more for every piece you take (in the free spins it carries on)
	multiplier: 1,
	// the last move's squares, and the square of a king in check, lit on the board (BoardSquares)
	lastMove: undefined as { from: Position; to: Position } | undefined,
	checkSquare: undefined as Position | undefined,
	// the spin's moves in words (MoveLog)
	moveLog: [] as string[],
	scatterCounter: 0,
});

export const setYourColour = (colour: PieceColour) => {
	stateGame.yourColour = colour;
	try {
		localStorage.setItem(COLOUR_KEY, colour);
	} catch {
		// nothing kept: the choice lasts the visit
	}
};

// how far above the middle of the screen the board sits, so its frame clears the UI under it
const BOARD_RAISE = { desktop: 28, landscape: 40, tablet: 50, portrait: 70 };

const boardLayout = () => ({
	x: stateLayoutDerived.mainLayout().width * 0.5,
	y: stateLayoutDerived.mainLayout().height * 0.5 - BOARD_RAISE[stateLayoutDerived.layoutType()],
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

// the middle of a square in the board's own units (the board container's), for a book's position
const squareCentre = ({ reel, row }: Position) => ({
	x: (reel + 0.5) * SYMBOL_SIZE,
	y: (row - 0.5) * SYMBOL_SIZE,
});

// the same in the main layout
const cellCentre = (position: Position) => {
	const layout = boardLayout();
	const local = squareCentre(position);
	return { x: layout.x - layout.width / 2 + local.x, y: layout.y - layout.height / 2 + local.y };
};

let nextPieceId = 1;

const makePiece = (symbol: SymbolName, position: Position): PlayPiece => {
	const { x, y } = squareCentre(position);
	return {
		id: nextPieceId++,
		symbol,
		reel: position.reel,
		row: position.row,
		x: new Tween(x),
		y: new Tween(y),
		scale: new Tween(1),
		alpha: new Tween(1),
		gone: false,
	};
};

// the play board set from a landed board (the reveal's: reels of 10 symbols, rows 1-8 the board)
const initPlayBoard = (rawBoard: RawSymbol[][]) => {
	stateGame.pieces = rawBoard.flatMap((reel, reelIndex) =>
		reel.flatMap((rawSymbol, row) =>
			row >= 1 && row <= BOARD_DIMENSIONS.y && rawSymbol.name !== 'E'
				? [makePiece(rawSymbol.name, { reel: reelIndex, row })]
				: [],
		),
	);
};

const pieceAt = ({ reel, row }: Position) =>
	stateGame.pieces.find((piece) => !piece.gone && piece.reel === reel && piece.row === row);

const kingSquare = (symbol: 'WK' | 'BK'): Position | undefined => {
	const king = stateGame.pieces.find((piece) => !piece.gone && piece.symbol === symbol);
	return king ? { reel: king.reel, row: king.row } : undefined;
};

// the play board's pieces as a landed board (reels of 10 symbols, empty above and below)
const playBoardRaw = (): RawSymbol[][] =>
	_.range(BOARD_DIMENSIONS.x).map((reel) =>
		_.range(BOARD_DIMENSIONS.y + 2).map((row) => {
			const piece = row >= 1 && row <= BOARD_DIMENSIONS.y ? pieceAt({ reel, row }) : undefined;
			return { name: piece?.symbol ?? 'E' };
		}),
	);

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

// the reels take over from the play board where its pieces stand (so nothing jumps as the next spin
// starts): the play board goes and the reels show
const reelsFromPlayBoard = () => {
	if (!stateGame.playBoardShown) return;
	enhancedBoard.settle(playBoardRaw());
	stateGame.playBoardShown = false;
};

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	boardLayout,
	squareCentre,
	cellCentre,
	boardRaw,
	playBoardRaw,
	initPlayBoard,
	pieceAt,
	kingSquare,
	reelsFromPlayBoard,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
