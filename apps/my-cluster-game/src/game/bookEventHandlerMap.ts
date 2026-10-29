import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet } from 'state-shared';
import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';
import type { RuneName, RuneOffset } from './runes';

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateBet.activeBetModeKey === 'SUPERSPIN' || stateGame.gameType === 'freegame') {
		// check if SUPERSPIN, when finishing a bet.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

// the runes as the book's events so far leave them: the one behind the board (none once the power
// spins start or all are collected) with its lit spots, those collected, and where each lies or lay
const runesSoFar = ({ bookEvents }: { bookEvents: BookEvent[] }) => {
	let rune: RuneName | undefined;
	const offsets: Partial<Record<RuneName, RuneOffset>> = {};
	let lit: Position[] = [];
	const collected: RuneName[] = [];
	for (const bookEvent of bookEvents) {
		if (bookEvent.type === 'runeShow') {
			rune = bookEvent.rune;
			offsets[bookEvent.rune] = bookEvent.offset;
			lit = [];
		}
		if (bookEvent.type === 'runeLight') lit = [...lit, ...bookEvent.positions];
		if (bookEvent.type === 'runeComplete') {
			collected.push(bookEvent.rune);
			rune = undefined;
		}
		if (bookEvent.type === 'powerSpinsTrigger') rune = undefined;
	}
	return { rune, offsets, lit, collected };
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		// each base game spin counts its connected symbols from nothing
		if (bookEvent.gameType === 'basegame') eventEmitter.broadcast({ type: 'bonusMeterReset' });
		await stateGameDerived.enhancedBoard.spin({ revealEvent: bookEvent });
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		const promise1 = async () => {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
			// a wild in two clusters once: a symbol animated twice would wait forever for its first win
			await animateSymbols({
				positions: _.uniqBy(
					_.flatten(bookEvent.wins.map((win) => win.positions)),
					(position) => `${position.reel}:${position.row}`,
				),
			});
		};

		const promise2 = async () => {
			await eventEmitter.broadcastAsync({
				type: 'showClusterWinAmounts',
				// winWithoutMult is in bets, the book's amounts in hundredths of the bet: the cluster's
				// win before its multipliers, "X" the spots' and the free spin's multipliers, then its win
				wins: bookEvent.wins.map((win) => {
					return {
						win: win.meta.winWithoutMult * BOOK_AMOUNT_MULTIPLIER,
						mult: win.meta.clusterMult * win.meta.globalMult,
						result: win.win,
						reel: win.meta.overlay.reel,
						row: win.meta.overlay.row,
					};
				}),
			});
		};

		await Promise.all([promise1(), promise2()]);
	},
	updateTumbleWin: async (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
		if (bookEvent.amount > 0) {
			eventEmitter.broadcast({ type: 'tumbleWinAmountShow' });
			eventEmitter.broadcast({
				type: 'tumbleWinAmountUpdate',
				amount: bookEvent.amount,
				animate: false,
			});
		}
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	updateBonusMeter: async (bookEvent: BookEventOfType<'updateBonusMeter'>) => {
		await eventEmitter.broadcastAsync({ type: 'bonusMeterUpdate', amount: bookEvent.amount });
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// the bonus meter full (a bought bonus may not have filled it); it goes for the free spins
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await eventEmitter.broadcastAsync({ type: 'bonusMeterFull' });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'bonusMeterHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		await eventEmitter.broadcastAsync({
			type: 'globalMultiplierUpdate',
			multiplier: 1, // resets when multiplier === 1
		});
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
			title: 'FREE SPIN',
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// animate scatters
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// show free spin intro
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'boardFrameGlowShow' });
		eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		await eventEmitter.broadcastAsync({
			type: 'globalMultiplierUpdate',
			multiplier: 1, // resets when multiplier === 1
		});
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
		});
	},
	updateGlobalMult: async (bookEvent: BookEventOfType<'updateGlobalMult'>) => {
		eventEmitter.broadcast({ type: 'globalMultiplierShow' });
		if (bookEvent.globalMult === 1) {
			eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		}
		await eventEmitter.broadcastAsync({
			type: 'globalMultiplierUpdate',
			multiplier: bookEvent.globalMult, // resets when multiplier === 1
		});
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'boardFrameGlowHide' });
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		eventEmitter.broadcast({ type: 'runesReset' });
		eventEmitter.broadcast({ type: 'bonusMeterReset' });
		eventEmitter.broadcast({ type: 'bonusMeterShow' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	tumbleBoard: async (bookEvent: BookEventOfType<'tumbleBoard'>) => {
		eventEmitter.broadcast({ type: 'boardHide' });
		eventEmitter.broadcast({ type: 'tumbleBoardShow' });
		eventEmitter.broadcast({ type: 'tumbleBoardInit', addingBoard: bookEvent.newSymbols });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_explosion_b' });
		await eventEmitter.broadcastAsync({
			type: 'tumbleBoardExplode',
			explodingPositions: bookEvent.explodingSymbols,
		});
		eventEmitter.broadcast({ type: 'tumbleBoardRemoveExploded' });
		await eventEmitter.broadcastAsync({ type: 'tumbleBoardSlideDown' });
		eventEmitter.broadcast({
			type: 'boardSettle',
			board: stateGameDerived
				.tumbleBoardCombined()
				.map((tumbleReel) => tumbleReel.map((tumbleSymbol) => tumbleSymbol.rawSymbol)),
		});
		eventEmitter.broadcast({ type: 'tumbleBoardReset' });
		eventEmitter.broadcast({ type: 'tumbleBoardHide' });
		eventEmitter.broadcast({ type: 'boardShow' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},
	runeShow: async (bookEvent: BookEventOfType<'runeShow'>) => {
		await eventEmitter.broadcastAsync({
			type: 'runesShow',
			rune: bookEvent.rune,
			offset: bookEvent.offset,
		});
	},
	runeLight: async (bookEvent: BookEventOfType<'runeLight'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
		await eventEmitter.broadcastAsync({ type: 'runesLight', positions: bookEvent.positions });
	},
	runeComplete: async (bookEvent: BookEventOfType<'runeComplete'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win' });
		await eventEmitter.broadcastAsync({ type: 'runesComplete', rune: bookEvent.rune });
	},
	powerSpinsTrigger: async (bookEvent: BookEventOfType<'powerSpinsTrigger'>) => {
		// the free spins are over: their rune goes, and the power spins start
		await eventEmitter.broadcastAsync({ type: 'runesHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		await eventEmitter.broadcastAsync({
			type: 'powerSpinsIntro',
			totalSpins: bookEvent.totalSpins,
			runes: bookEvent.runes,
		});
		// back to x1 from the last free spin's, so the power spins' x3 (Fehu) counts up from it
		await eventEmitter.broadcastAsync({ type: 'globalMultiplierUpdate', multiplier: 1 });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},
	updatePowerSpin: async (bookEvent: BookEventOfType<'updatePowerSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
			title: 'POWER SPIN',
		});
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		eventEmitter.broadcast({ type: 'globalMultiplierHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
	},
	// customised
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastUpdateGlobalMultEvent = findLastBookEvent('updateGlobalMult' as const);
		const lastUpdatePowerSpinEvent = findLastBookEvent('updatePowerSpin' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastUpdatePowerSpinEvent) playBookEvent(lastUpdatePowerSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGlobalMultEvent) playBookEvent(lastUpdateGlobalMultEvent, { bookEvents });
		if (lastFreeSpinTriggerEvent) {
			eventEmitter.broadcast({ type: 'runesRestore', ...runesSoFar({ bookEvents }) });
		}
	},
};
