import type { BetType } from 'rgs-requests';

import type { RawSymbol, GameType, Position, Side, SymbolName } from './types';

// The board lands: 8 reels of 10 symbols, the first and last the empty squares above and below it.
type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

// a multiplier spot on the board: taking one of the other side's pieces on it puts it into the spin's
// multiplier (a + adds its value, a x multiplies by it) before the capture pays, and uses it up
export type SpotOp = '+' | 'x';
export type SpotValue = { op: SpotOp; value: number };
// `cells`: in the SUPER BONUS, every square a spot merged from spots side by side covers (its own square,
// the anchor, the first of them); a piece taken on any of them collects it whole (game/spotShape.ts)
export type Spot = Position & SpotValue & { cells?: Position[] };

// The landed board's multiplier spots (none: no event). In the SUPER BONUS the spots are sticky, all +:
// the ones still there from the spins before carry `was`, their value before this spin's new ones landed
// (less than `value` where a new + landed on one); a spot without it is new; `max` a MAX square
// (SUPER_SPOT_MAX: taking a piece on it is the max win).
type BookEventMultiplierSpots = {
	index: number;
	type: 'multiplierSpots';
	spots: (Spot & { was?: number; max?: boolean })[];
};

// SUPER BONUS: once the spots are on the board, your king (at `king`) throws multipliers at them, in
// order: each spot's value from `was` times `mult` to `value` (up to a MAX square: `max`)
export type KingThrow = Position & { mult: number; was: number; value: number; max?: boolean };
type BookEventKingThrow = {
	index: number;
	type: 'kingThrow';
	king: Position;
	throws: KingThrow[];
};

// CHEATER MODE: your queen (at `queen`) collects every multiplier spot, in the order given (every + first,
// then every x); the spin's multiplier is `multiplier` after them
type BookEventQueenCollect = {
	index: number;
	type: 'queenCollect';
	queen: Position;
	spots: Spot[];
	multiplier: number;
};

// A move, yours ("you") or the other side's ("them"): the piece's symbol, where from and to, the symbol
// it takes (if any), what a pawn becomes (if it promotes), whether it gives check or mate, what it pays
// (your captures only; in hundredths of the bet, the multiplier already in it) at the spin's multiplier
// `multiplier`, with the multiplier spot it took the piece on (`spot`, if any; used up) already in it.
type BookEventMove = {
	index: number;
	type: 'move';
	side: Side;
	from: Position;
	to: Position;
	piece: SymbolName;
	captured?: SymbolName;
	promotion?: SymbolName;
	check: boolean;
	mate: boolean;
	win: number;
	multiplier: number;
	spot?: SpotValue;
};

// The position landed with your king in check: your first move must get out of it
type BookEventInCheck = {
	index: number;
	type: 'inCheck';
};

// a move in the engine's analysis: the squares, the piece, what it takes (if anything), whether it
// gives check or mate, and (yours) the score after it, in hundredths of a pawn from your side, a mate
// far above any material (100000 less the plies to it)
export type AnalysedMove = {
	from: Position;
	to: Position;
	piece: SymbolName;
	captured?: SymbolName | '';
	check: boolean;
	mate: boolean;
};
export type Analysis = {
	// the engine's move, the quiet one it ends the spin on
	best: AnalysedMove & { score: number };
	// the best capture or check it passed over, with the other side's best reply to it and the score
	// after that reply; none when no capture or check was possible
	forcing?: AnalysedMove & { score: number; reply?: AnalysedMove };
};

// The spin's moves are over: why (see the math's sequence_end_event); a quiet end comes with the
// engine's analysis of why
type BookEventSequenceEnd = {
	index: number;
	type: 'sequenceEnd';
	reason: 'quiet' | 'mate' | 'mated' | 'stalemate' | 'repetition' | 'limit';
	analysis?: Analysis;
};

// Checkmate, by you (the free spins follow, or more of them) or by the other side
type BookEventCheckmate = {
	index: number;
	type: 'checkmate';
	by: Side;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

// a checkmate in the free spins: `added` more spins, `totalFs` in all now
type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number;
	added: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

// the spin's multiplier after a capture (in the free spins it carries over the spins; the SUPER BONUS's
// spins start from x1 again, with one of these before the spin lands)
type BookEventUpdateGlobalMult = {
	index: number;
	type: 'updateGlobalMult';
	globalMult: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

// customised
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventMultiplierSpots
	| BookEventKingThrow
	| BookEventQueenCollect
	| BookEventMove
	| BookEventInCheck
	| BookEventSequenceEnd
	| BookEventCheckmate
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventFreeSpinRetrigger
	| BookEventUpdateFreeSpin
	| BookEventUpdateGlobalMult
	| BookEventFreeSpinEnd
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
