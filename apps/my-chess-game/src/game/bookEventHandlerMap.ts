import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateBetDerived } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { MOVE_TIMING } from './constants';
import { describeMove } from './chess';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';

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
	if (stateGame.gameType === 'freegame') {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const pause = (ms: number) => waitForTimeout(ms / stateBetDerived.timeScale());

// the free spins' sign, counter and multiplier put up as a bonus starts (or is resumed)
const showFreeSpinSetup = (totalFs: number) => {
	stateGame.gameType = 'freegame';
	eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
	eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', current: undefined, total: totalFs });
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	// the pieces drop onto the board: the reels take over from the play board (where the last spin's
	// pieces stand, so nothing jumps), spin, and once landed the play board takes over again
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		stateGame.lastMove = undefined;
		stateGame.checkSquare = undefined;
		stateGame.moveLog = [];
		// a base game spin's multiplier is its own; the free spins' carries on
		if (bookEvent.gameType === 'basegame') stateGame.multiplier = 1;
		eventEmitter.broadcast({ type: 'moveLabelHide' });
		stateGameDerived.reelsFromPlayBoard();
		eventEmitter.broadcast({ type: 'boardShow' });
		await stateGameDerived.enhancedBoard.spin({ revealEvent: bookEvent });
		// the last pieces to land settle before anything moves
		await pause(150);
		stateGameDerived.initPlayBoard(bookEvent.board);
		stateGame.playBoardShown = true;
		eventEmitter.broadcast({ type: 'boardHide' });
	},
	// a move, yours or the other side's: the piece slides over, a taken piece bursts as it arrives
	// and its pay floats up, a check is called
	move: async (bookEvent: BookEventOfType<'move'>) => {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: bookEvent.captured ? 'sfx_multiplier_explosion_a' : 'sfx_royals_landing',
		});
		stateGame.moveLog = [...stateGame.moveLog, describeMove(bookEvent)];
		await eventEmitter.broadcastAsync({ type: 'playBoardMove', move: bookEvent });
		if (bookEvent.win > 0) {
			eventEmitter.broadcast({
				type: 'moveWinShow',
				position: bookEvent.to,
				amount: bookEvent.win,
				multiplier: bookEvent.multiplier,
			});
		}
		if (bookEvent.check && !bookEvent.mate) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_stop_1' });
			eventEmitter.broadcast({
				type: 'moveLabel',
				text: 'CHECK',
				kind: bookEvent.side === 'you' ? 'good' : 'bad',
				hold: MOVE_TIMING.label,
			});
		}
		await pause(MOVE_TIMING.pause);
	},
	// the spin's multiplier after a capture
	updateGlobalMult: async (bookEvent: BookEventOfType<'updateGlobalMult'>) => {
		const grew = bookEvent.globalMult > stateGame.multiplier;
		stateGame.multiplier = bookEvent.globalMult;
		if (grew) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
			eventEmitter.broadcast({ type: 'multiplierPulse' });
		}
	},
	checkmate: async (bookEvent: BookEventOfType<'checkmate'>) => {
		if (bookEvent.by === 'you') {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win' });
			await eventEmitter.broadcastAsync({
				type: 'moveLabel',
				text: 'CHECKMATE!',
				kind: 'mate',
				hold: MOVE_TIMING.mate,
			});
		} else {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_reset' });
			await eventEmitter.broadcastAsync({
				type: 'moveLabel',
				text: 'CHECKMATED',
				kind: 'bad',
				hold: MOVE_TIMING.label,
			});
		}
	},
	sequenceEnd: async (bookEvent: BookEventOfType<'sequenceEnd'>) => {
		const texts = { stalemate: 'STALEMATE', repetition: 'DRAW', limit: 'MOVE LIMIT' } as const;
		const text = texts[bookEvent.reason as keyof typeof texts];
		if (!text) return;
		await eventEmitter.broadcastAsync({ type: 'moveLabel', text, kind: 'info', hold: MOVE_TIMING.label });
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });
		eventEmitter.broadcast({ type: 'moveLabelHide' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		showFreeSpinSetup(bookEvent.totalFs);
		stateGame.multiplier = 1;
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	// a checkmate in the free spins: more spins
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinRetrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_respins' });
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
		await eventEmitter.broadcastAsync({
			type: 'moveLabel',
			text: `+${bookEvent.added} FREE SPINS`,
			kind: 'good',
			hold: MOVE_TIMING.mate,
		});
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
		});
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'moveLabelHide' });
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
		stateGame.multiplier = 1;
		await eventEmitter.broadcastAsync({ type: 'transition' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
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
	finalWin: async () => {},
	// customised
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T>(type: T) {
			return _.findLast(bookEvents, (bookEvent) => bookEvent.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastFreeSpinTriggerEvent = findLastBookEvent('freeSpinTrigger' as const);
		const lastFreeSpinRetriggerEvent = findLastBookEvent('freeSpinRetrigger' as const);
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastUpdateGlobalMultEvent = findLastBookEvent('updateGlobalMult' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastFreeSpinRetriggerEvent) {
			eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: lastFreeSpinRetriggerEvent.totalFs });
		}
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGlobalMultEvent) playBookEvent(lastUpdateGlobalMultEvent, { bookEvents });
	},
};
