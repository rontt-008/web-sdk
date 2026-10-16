import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

// book events shared with scatter game
type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

// Sent when the round reaches the max win; the round ends there (amount: the capped total win)
type BookEventWincap = {
	index: number;
	type: 'wincap';
	amount: number;
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	// every FS symbol that landed; how many picks the bonus: 3 normal, 4 super, 5 mythic
	positions: Position[];
};

// During free spins, 2 or more FS symbols add spins (as many as the symbols, set in the math's
// freespin_triggers for the freegame). totalFs is the new total, extra spins included.
type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number;
	// every FS symbol that landed
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		kind: number;
		win: number;
		positions: Position[];
		meta: {
			lineIndex: number;
			multiplier: number;
			winWithoutMult: number;
			globalMult: number;
			lineMultiplier: number;
		};
	}[];
};

// customised

// Sent right after a reveal that has a big wild (a reel with any W on it): that big wild throws
// 0 to 3 normal wilds onto the board. The reveal board does not include them (a W in it would
// become a big wild), so the math must count them as W when it works out the wins that follow.
type BookEventBigWildThrow = {
	index: number;
	type: 'bigWildThrow';
	// the big wild's reel
	reel: number;
	// where the thrown wilds land, counted like other positions (row 0 is the padding row above)
	positions: Position[];
};

// SUPER free spins, sent before a reveal: the big wilds of the spin before each move one reel left,
// carrying their multiplier. The reels they move onto don't spin; the reveal's board already has
// them there.
type BookEventBigWildWalk = {
	index: number;
	type: 'bigWildWalk';
	// reels; to is -1 when the big wild walks off the first reel
	moves: { from: number; to: number; multiplier: number }[];
};

type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventFreeSpinRetrigger
	| BookEventUpdateFreeSpin
	| BookEventCreateBonusSnapshot
	| BookEventFinalWin
	| BookEventWincap
	| BookEventSetWin
	| BookEventFreeSpinEnd
	// customised
	| BookEventBigWildThrow
	| BookEventBigWildWalk
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
