import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';
import type { RuneName, RuneOffset } from './runes';

type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		win: number;
		positions: Position[];
		meta: {
			globalMult: number;
			clusterMult: number;
			winWithoutMult: number;
			overlay: Position;
		};
	}[];
};

type BookEventSetTumbleWin = {
	index: number;
	type: 'updateTumbleWin';
	amount: number;
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

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

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

type BookEventTumbleBoard = {
	index: number;
	type: 'tumbleBoard';
	explodingSymbols: Position[];
	newSymbols: RawSymbol[][];
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

// new
type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number;
	positions: Position[];
};

// the runes (see runes.ts): a rune shows behind the symbols, `offset` from where RUNES has it, its
// spots under winning clusters light up, and with all lit it is collected (and the next one shows)
type BookEventRuneShow = {
	index: number;
	type: 'runeShow';
	rune: RuneName;
	offset: RuneOffset;
};

type BookEventRuneLight = {
	index: number;
	type: 'runeLight';
	rune: RuneName;
	positions: Position[];
};

type BookEventRuneComplete = {
	index: number;
	type: 'runeComplete';
	rune: RuneName;
};

// in a base game spin, after each win: how many symbols its clusters have had so far, all its tumbles
// together (with BONUS_TRIGGER, the free spins start)
type BookEventUpdateBonusMeter = {
	index: number;
	type: 'updateBonusMeter';
	amount: number;
};

// after the free spins: the power spins, with the collected runes' powers
type BookEventPowerSpinsTrigger = {
	index: number;
	type: 'powerSpinsTrigger';
	totalSpins: number;
	runes: RuneName[];
};

type BookEventUpdatePowerSpin = {
	index: number;
	type: 'updatePowerSpin';
	amount: number;
	total: number;
};

// customised
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTumbleWin
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventUpdateFreeSpin
	| BookEventUpdateGlobalMult
	| BookEventTumbleBoard
	| BookEventCreateBonusSnapshot
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventFreeSpinEnd
	// new
	| BookEventFreeSpinRetrigger
	| BookEventRuneShow
	| BookEventRuneLight
	| BookEventRuneComplete
	| BookEventUpdateBonusMeter
	| BookEventPowerSpinsTrigger
	| BookEventUpdatePowerSpin
	// customised
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
