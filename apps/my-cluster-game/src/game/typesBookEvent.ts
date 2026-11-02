import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position, BonusType } from './types';
import type { BoardRuneName, RuneName, RuneOffset } from './runes';

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
	// the bonus, the super bonus or the mythic bonus (none: the bonus)
	bonusType?: BonusType;
	// the mythic bonus's two runes collected from the start (a random two); the free spins show the
	// other two, and the power spins have all that are collected
	collected?: RuneName[];
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
// spots under winning clusters light up, and with all lit it is collected (and the next one shows).
// In the base game the rune is Mannaz (`rune: 'mannaz'`): it is always there, in the middle (no
// runeShow, no offset), unlit as each spin starts; its runeLight and runeComplete come in the
// same places, and a runeComplete for it is followed by the mythic bonus's freeSpinTrigger.
type BookEventRuneShow = {
	index: number;
	type: 'runeShow';
	rune: RuneName;
	offset: RuneOffset;
};

type BookEventRuneLight = {
	index: number;
	type: 'runeLight';
	rune: BoardRuneName;
	positions: Position[];
};

type BookEventRuneComplete = {
	index: number;
	type: 'runeComplete';
	rune: BoardRuneName;
};

// in the free spins, as symbols land (the spin's, or a tumble's new ones): Fehu symbols at these cells,
// each doubling Fehu's multiplier, now `multiplier`; the tumbleBoard after it fills their cells
type BookEventFehuSymbols = {
	index: number;
	type: 'fehuSymbols';
	positions: Position[];
	multiplier: number;
};

// the same for Ingwaz symbols, each giving Ingwaz one more power spin: it now gives `spins`
type BookEventIngwazSymbols = {
	index: number;
	type: 'ingwazSymbols';
	positions: Position[];
	spins: number;
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

// now and then (any spin) a gust of wind blows wilds onto these cells as the board lands, before its
// wins
type BookEventWindWilds = {
	index: number;
	type: 'windWilds';
	positions: Position[];
};

// more rarely, instead a gust takes every symbol of one kind (`symbol`) off the board, at
// `positions`; the tumbleBoard after it fills their cells
type BookEventWindSweep = {
	index: number;
	type: 'windSweep';
	symbol: SymbolName;
	positions: Position[];
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
	| BookEventFehuSymbols
	| BookEventIngwazSymbols
	| BookEventUpdateBonusMeter
	| BookEventPowerSpinsTrigger
	| BookEventUpdatePowerSpin
	| BookEventWindWilds
	| BookEventWindSweep
	// customised
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
