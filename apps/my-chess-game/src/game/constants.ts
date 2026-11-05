import type { RawSymbol, SymbolState, SymbolName, PieceKind } from './types';

// a square of the board, in the main layout's units
export const SYMBOL_SIZE = 70;

// the first board: the pieces set up for a game of chess (your side at the bottom, as white), padded
// with the empty squares above and below
const BACK_RANK: PieceKind[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
export const INITIAL_BOARD: RawSymbol[][] = BACK_RANK.map((kind) => [
	{ name: 'E' },
	{ name: `B${kind}` as SymbolName },
	{ name: 'BP' },
	{ name: 'E' },
	{ name: 'E' },
	{ name: 'E' },
	{ name: 'E' },
	{ name: 'WP' },
	{ name: `W${kind}` as SymbolName },
	{ name: 'E' },
]);

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

// The board's wooden frame (static/assets/board-frame.webp, art-source/board-frame.py: its opening 1024
// px, the board's width, with 69 px round it): how far its picture reaches out past the board on each
// side, and how far the wood itself does, in the board's units (for its shadow on the table)
export const BOARD_FRAME = {
	margin: (69 / 1024) * BOARD_SIZES.width,
	reach: 35,
};

// the rules, as the math has them (math-sdk games/my_chess_game/game_config.py)
export const FREE_SPINS = 10;
export const RETRIGGER_SPINS = 3;
export const MAX_FREE_SPINS = 25;
export const MAX_MOVES = 10;
// what each of the other side's pieces pays when you take it, x the bet (then x the spin's multiplier)
export const CAPTURE_PAYS: Record<Exclude<PieceKind, 'K'>, number> = {
	P: 0.2,
	N: 0.6,
	B: 0.6,
	R: 1.0,
	Q: 2.0,
};
export const PIECE_NAMES: Record<PieceKind, string> = {
	P: 'Pawn',
	N: 'Knight',
	B: 'Bishop',
	R: 'Rook',
	Q: 'Queen',
	K: 'King',
};

// How a move plays, in ms (divided by the turbo's time scale): the beat before a spin's first move (the
// mover and its target pulsing), the piece's slide, the pause after a move before the next (longer
// after a capture, so its pay is read), the taken piece's burst, how long a label (CHECK, CHECKMATE,
// an end's reason) stays up, and the hold on the cheater spin's queen before the spots fly to her.
export const MOVE_TIMING = {
	firstBeat: 650,
	slide: 550,
	pause: 450,
	captureHold: 350,
	burst: 300,
	label: 900,
	short: 700,
	mate: 1500,
	queenHold: 700,
	// the last spin's pieces dropping off the board as the next starts, and the stagger between its columns
	drop: 420,
	dropStagger: 45,
};

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const SPIN_OPTIONS_SHARED = {
	reelFallInDelay: 60,
	reelPaddingMultiplierNormal: 1.25,
	reelPaddingMultiplierAnticipated: 18,
	reelFallOutDelay: 110,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 3.5,
	symbolFallInInterval: 24,
	symbolFallInBounceSpeed: 0.15,
	symbolFallInBounceSizeMulti: 0.5,
	symbolFallOutSpeed: 3.5,
	symbolFallOutInterval: 16,
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

// the board's colours: the light and dark squares, the frame round it, the last move's squares and the
// square of a king in check
export const BOARD_COLOURS = {
	light: 0xe8d9b8,
	dark: 0x8d6a46,
	frame: 0x2a2126,
	frameEdge: 0x0a0a0c,
	lastMove: 0xf2c94c,
	check: 0xe03b2f,
	label: 0xe8d9b8,
	spot: 0xffd34d,
	// the blue of a + spot (a x spot is the gold)
	spotAdd: 0x5cc8ff,
};

// the multiplier spots, as the math has them: a + spot adds to the spin's multiplier, a x spot multiplies it
export const SPOT_ADD_VALUES = [1, 2, 3, 5, 10, 20, 50, 100];
export const SPOT_MULT_VALUES = [2, 3, 4, 5, 6, 8, 10];
export const CHEAT_SPOTS = { min: 2, max: 4 };
