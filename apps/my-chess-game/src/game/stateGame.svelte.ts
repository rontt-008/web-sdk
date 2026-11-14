import _ from 'lodash';
import { Tween } from 'svelte/motion';

import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';
import { cubicInOut } from 'svelte/easing';
import { PORTRAIT_UI_HEIGHT, PORTRAIT_PANEL_FOLD } from 'components-ui-pixi';

import type { GameType, PieceColour, Position, RawSymbol, Side, SymbolName } from './types';
import type { Analysis, Spot, SpotValue } from './typesBookEvent';
import type { PlayedMove } from './chess';
import { TILT, squareToQuad, quadToSquare, type Quad } from './tilt';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { chessSound } from './chessSounds';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	BOARD_FRAME,
	SANDBOX_LEVELS,
	SANDBOX_DEFAULT_ELO,
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
		// the column's bottom piece lands, the rest up the column after it: their clatter, a note higher
		// each column across the board
		onReelStopping: () => chessSound.drop(reelIndex),
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
const ELO_KEY = 'my-chess-game:elo';

// the strength played against on the start screen (SANDBOX_LEVELS), kept between visits
const loadElo = (): number => {
	try {
		const elo = Number(localStorage.getItem(ELO_KEY));
		return SANDBOX_LEVELS.some((level) => level.elo === elo) ? elo : SANDBOX_DEFAULT_ELO;
	} catch {
		return SANDBOX_DEFAULT_ELO;
	}
};

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
	// the spin's multiplier: 1, one more for every piece you take, a spot's + or x when you take a piece
	// on one (in the free spins it carries on)
	multiplier: 1,
	// the last move's squares (with an arrow between them), the square a capture is about to land on
	// (ringed while the piece slides), the square of a king in check and the lines of the check (from
	// each piece giving it: two in a double check), lit on the board (BoardSquares)
	lastMove: undefined as { from: Position; to: Position } | undefined,
	attackSquare: undefined as Position | undefined,
	checkSquare: undefined as Position | undefined,
	checkLines: [] as { from: Position; to: Position }[],
	// whose move it is (the notebook; the other side's pieces dim meanwhile), none between spins
	turn: undefined as Side | undefined,
	// how many of the spin's moves have been played, what the spin has won so far (SidePanel) and the
	// multiplier spot its last capture put into the multiplier, if any
	movesThisSpin: 0,
	spinWin: 0,
	lastSpot: undefined as SpotValue | undefined,
	// the free spins (the bonus): the one being played (1 for the first, 0 before it) and how many in
	// all; shown where the spin's win is outside the bonus (SidePanel)
	freeSpins: { current: 0, total: 0 },
	// the spin's moves in words, and as played (the notebook)
	moveLog: [] as string[],
	moves: [] as PlayedMove[],
	// The start screen's game of chess (Sandbox): until the first spin the player moves the pieces of the
	// starting position about, any legal move, your side and the other side in turn. The side to move,
	// the piece picked up and the squares it can go to.
	sandbox: true,
	sandboxTurn: 'you' as Side,
	selected: undefined as Position | undefined,
	targets: [] as Position[],
	// the piece being dragged (drawn over the others)
	dragging: undefined as number | undefined,
	// the strength played against (SANDBOX_LEVELS), in Elo
	sandboxElo: loadElo(),
	// the engine's best moves for the player, asked for with the lightbulb (BoardHints), the best first
	hints: [] as { rank: number; from: Position; to: Position }[],
	// the square the player's last move went to on the practice board, when the engine judged it a
	// blunder (BLUNDER): lit red (BoardSquares)
	blunder: undefined as Position | undefined,
	// the engine's reasons for the spin's quiet end (the notebook's WHY NO CAPTURE, StickyNote), none until it ends so
	analysis: undefined as Analysis | undefined,
	// the multiplier spots on the board (BoardSquares), each gone when a capture on it uses it up or the
	// cheater spin's queen collects it
	spots: [] as Spot[],
	scatterCounter: 0,
});

export const setSandboxElo = (elo: number) => {
	stateGame.sandboxElo = elo;
	try {
		localStorage.setItem(ELO_KEY, String(elo));
	} catch {
		// nothing kept: the choice lasts the visit
	}
};

export const setYourColour = (colour: PieceColour) => {
	stateGame.yourColour = colour;
	try {
		localStorage.setItem(COLOUR_KEY, colour);
	} catch {
		// nothing kept: the choice lasts the visit
	}
};

// How big the board is drawn on each kind of screen (its own units, BOARD_SIZES, are SYMBOL_SIZE a
// square, scaled up by this: 600 across on desktop, 640 on tall screens), and how far above the middle of
// the screen it sits, so it and its wooden frame clear the UI under it. On phones held sideways the UI's
// buttons come in close at both sides of its bottom corners, so it's smaller there. Its width and height
// here are the drawn ones, without the frame (`frame`: how far the frame reaches out past each side);
// its pivot is in its own units.
const BOARD_SCALE = { desktop: 15 / 14, landscape: 0.92, tablet: 0.95, portrait: 8 / 7 };
const BOARD_RAISE = { desktop: 69, landscape: 52, tablet: 62, portrait: 200 };

// How far the UI reaches up from the bottom of the screen, in the standard layout's units (it's drawn
// against the screen's bottom): on tall screens the portrait panel, on almost square ones the desktop
// panel's spin disc (the tablet's is 1.3x), on phones held sideways the landscape bar.
const UI_HEIGHT = { desktop: 150, tablet: 205, landscape: 175, portrait: PORTRAIT_UI_HEIGHT };

// How far the portrait bar's panel has come down, its drawer folded (LayoutPortraitBar: by the drawer's
// arrow button, and in the free spins): 0 up, 1 down (PORTRAIT_PANEL_FOLD), in step with the bar's own
// slide (NotebookStrip follows its drawerFold and drawerUnfold), so the notebook's strip comes down too.
export const uiFold = new Tween(0, { duration: 400, easing: cubicInOut });

// the screen's edges, and the UI's top, in the main layout's units (the main layout is centred on the
// screen, so on a screen of another shape they reach past it): `uiTop` with the portrait bar's panel up,
// `uiTopNow` where it is now (lower while its drawer is folded)
const screenBounds = () => {
	const canvas = stateLayoutDerived.canvasSizes();
	const main = stateLayoutDerived.mainLayout();
	const toMainY = (y: number) => main.height * 0.5 + (y - canvas.height * 0.5) / main.scale;
	const uiTop = canvas.height - UI_HEIGHT[stateLayoutDerived.layoutType()] * stateLayoutDerived.mainLayoutStandard().scale;
	return {
		left: main.width * 0.5 - (canvas.width * 0.5) / main.scale,
		right: main.width * 0.5 + (canvas.width * 0.5) / main.scale,
		top: toMainY(0),
		bottom: toMainY(canvas.height),
		uiTop: toMainY(uiTop),
		uiTopNow: toMainY(
			uiTop +
				(stateLayoutDerived.layoutType() === 'portrait'
					? uiFold.current * PORTRAIT_PANEL_FOLD * stateLayoutDerived.mainLayoutStandard().scale
					: 0),
		),
	};
};

// On tall and almost square screens the notebook's strip (NotebookStrip) lies between the board's frame
// and the UI: on short screens the board goes up (this much at most) to leave room for the strip's head
// (STRIP_ROOM: its band and head with the gaps round it).
export const STRIP_ROOM = 104;
const EXTRA_RAISE = { desktop: 0, landscape: 0, tablet: 40, portrait: 60 };

const boardLayout = () => {
	const layoutType = stateLayoutDerived.layoutType();
	const scale = BOARD_SCALE[layoutType];
	const y = stateLayoutDerived.mainLayout().height * 0.5 - BOARD_RAISE[layoutType];
	const frameBottom = y + (BOARD_SIZES.height * scale) / 2 + BOARD_FRAME.reach * scale;
	const short = EXTRA_RAISE[layoutType] ? frameBottom + STRIP_ROOM - screenBounds().uiTop : 0;
	return {
		x: stateLayoutDerived.mainLayout().width * 0.5,
		y: y - Math.min(EXTRA_RAISE[layoutType], Math.max(0, short)),
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
		scale,
		width: BOARD_SIZES.width * scale,
		height: BOARD_SIZES.height * scale,
		frame: BOARD_FRAME.reach * scale,
	};
};

// the middle of a square in the board's own units (the board container's), for a book's position
const squareCentre = ({ reel, row }: Position) => ({
	x: (reel + 0.5) * SYMBOL_SIZE,
	y: (row - 0.5) * SYMBOL_SIZE,
});

// The board as it lies tilted on the table (TILT), in the main layout: its corners (top left, top right,
// bottom right, bottom left), and where a point of the board (in its own units) is seen
const boardQuad = (): Quad => {
	const layout = boardLayout();
	const bottom = layout.y + layout.height / 2;
	const top = bottom - layout.height * TILT.depth;
	const far = (layout.width * TILT.far) / 2;
	const near = (layout.width * TILT.near) / 2;
	return [layout.x - far, top, layout.x + far, top, layout.x + near, bottom, layout.x - near, bottom];
};

const boardPoint = (x: number, y: number) =>
	squareToQuad(boardQuad())(x / BOARD_SIZES.width, y / BOARD_SIZES.height);

// a point of the main layout as a point of the tilted board, in the board's own units (off the board
// too, past its edges): where a dragged piece is drawn
const boardPointAt = (x: number, y: number) => {
	const { u, v } = quadToSquare(boardQuad())(x, y);
	return { x: u * BOARD_SIZES.width, y: v * BOARD_SIZES.height };
};

// the square under a point of the main layout (the tilted board's), or none off the board
const squareAt = (x: number, y: number): Position | undefined => {
	const { u, v } = quadToSquare(boardQuad())(x, y);
	if (u < 0 || u >= 1 || v < 0 || v >= 1) return undefined;
	return { reel: Math.floor(u * BOARD_DIMENSIONS.x), row: Math.floor(v * BOARD_DIMENSIONS.y) + 1 };
};

// where a point of the main layout is seen once the table it's on is tilted with the board (the side
// panel lies on the table beside the board, in the same plane)
const tablePoint = (x: number, y: number) => {
	const layout = boardLayout();
	const left = layout.x - layout.width / 2;
	const top = layout.y - layout.height / 2;
	return boardPoint((x - left) / layout.scale, (y - top) / layout.scale);
};

// the middle of a square in the main layout, as seen on the tilted board
const cellCentre = (position: Position) => {
	const local = squareCentre(position);
	return boardPoint(local.x, local.y);
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

// a piece added to the play board for `position`, drawn at `at` (the board's units) to start with: a
// missing piece coming in from the side (Sandbox)
const addPiece = (symbol: SymbolName, position: Position, at: { x: number; y: number }): PlayPiece => {
	const piece = makePiece(symbol, position);
	piece.x.set(at.x, { duration: 0 });
	piece.y.set(at.y, { duration: 0 });
	stateGame.pieces = [...stateGame.pieces, piece];
	return stateGame.pieces[stateGame.pieces.length - 1];
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
	screenBounds,
	boardQuad,
	boardPoint,
	squareAt,
	boardPointAt,
	tablePoint,
	squareCentre,
	cellCentre,
	boardRaw,
	playBoardRaw,
	initPlayBoard,
	addPiece,
	pieceAt,
	kingSquare,
	reelsFromPlayBoard,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
