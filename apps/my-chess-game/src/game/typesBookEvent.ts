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

// a multiplier spot on the board: taking one of the other side's pieces on it pays the capture times
// its multiplier too, and uses it up
export type Spot = Position & { multiplier: number };

// The landed board's multiplier spots (none: no event)
type BookEventMultiplierSpots = {
	index: number;
	type: 'multiplierSpots';
	spots: Spot[];
};

// The CHEATER SPIN: your queen (at `queen`) collects every multiplier spot; the spin's multiplier is their
// sum, `multiplier`
type BookEventQueenCollect = {
	index: number;
	type: 'queenCollect';
	queen: Position;
	spots: Spot[];
	multiplier: number;
};

// A move, yours ("you") or the other side's ("them"): the piece's symbol, where from and to, the symbol
// it takes (if any), what a pawn becomes (if it promotes), whether it gives check or mate, what it pays
// (your captures only; in hundredths of the bet, the multipliers already in it) at the spin's multiplier
// `multiplier`, and the multiplier spot it took the piece on (`spot`, if any; used up).
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
	spot?: number;
};

// The position landed with your king in check: your first move must get out of it
type BookEventInCheck = {
	index: number;
	type: 'inCheck';
};

// The spin's moves are over: why (see the math's sequence_end_event)
type BookEventSequenceEnd = {
	index: number;
	type: 'sequenceEnd';
	reason: 'quiet' | 'mate' | 'mated' | 'stalemate' | 'repetition' | 'limit';
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

// the spin's multiplier after a capture (in the free spins it carries over the spins)
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
