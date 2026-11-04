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

// A move, yours ("you") or the other side's ("them"): the piece's symbol, where from and to, the symbol
// it takes (if any), what a pawn becomes (if it promotes), whether it gives check or mate, and what it
// pays (your captures only; in hundredths of the bet, the multiplier already in it) at the spin's
// multiplier `multiplier`.
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
	| BookEventMove
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
