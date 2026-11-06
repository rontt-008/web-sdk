import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateBetDerived } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import { cameraDerived } from './camera.svelte';
import { MOVE_TIMING } from './constants';
import { describeMove } from './chess';
import { chessSound } from './chessSounds';
import { spotCovers } from './spotShape';
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

// the spin's multiplier spots are put on the board before its pieces drop (the reveal looks ahead to
// its multiplierSpots event), so the spots' own event has nothing left to show
let spotsShownEarly = false;

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
		stateGame.attackSquare = undefined;
		stateGame.checkSquare = undefined;
		stateGame.checkLines = [];
		stateGame.turn = undefined;
		stateGame.movesThisSpin = 0;
		stateGame.spinWin = 0;
		stateGame.lastSpot = undefined;
		stateGame.moveLog = [];
		stateGame.moves = [];
		stateGame.analysis = undefined;
		stateGame.hints = [];
		stateGame.blunder = undefined;
		stateGame.spots = [];
		// a base game spin's multiplier is its own; the free spins' carries on
		if (bookEvent.gameType === 'basegame') stateGame.multiplier = 1;
		eventEmitter.broadcast({ type: 'moveLabelHide' });
		// the camera backs out for the spin
		cameraDerived.reset(400, 0);
		// the last spin's pieces have dropped off the board as the spin started (actor.ts); a resumed
		// round's are still on it, so the reels take over from them
		stateGameDerived.reelsFromPlayBoard();
		eventEmitter.broadcast({ type: 'boardShow' });
		// the spin's spots land on the empty board first, a beat before the pieces drop
		const following = bookEvents.slice(bookEvents.indexOf(bookEvent) + 1);
		const spotsEvent = following.find((event) => event.type === 'reveal' || event.type === 'multiplierSpots');
		spotsShownEarly = spotsEvent?.type === 'multiplierSpots';
		if (spotsEvent?.type === 'multiplierSpots') {
			stateGame.spots = spotsEvent.spots.map(({ was: _was, max: _max, ...spot }) => spot);
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
			await pause(MOVE_TIMING.pause);
		}
		await stateGameDerived.enhancedBoard.spin({ revealEvent: bookEvent });
		// the last pieces to land settle before anything moves
		await pause(150);
		stateGameDerived.initPlayBoard(bookEvent.board);
		stateGame.playBoardShown = true;
		eventEmitter.broadcast({ type: 'boardHide' });
	},
	// the spin's multiplier spots: already on the board since before the pieces landed (the reveal put
	// them there); otherwise (a book resumed mid-way) they light up now
	multiplierSpots: async (bookEvent: BookEventOfType<'multiplierSpots'>) => {
		if (spotsShownEarly) {
			spotsShownEarly = false;
			return;
		}
		stateGame.spots = bookEvent.spots.map(({ was: _was, max: _max, ...spot }) => spot);
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
		await pause(MOVE_TIMING.pause);
	},
	// SUPER BONUS: your king throws his multipliers at the sticky spots, one after another: each flies
	// from him to its spot (PlayBoard), and the spot counts up to its new value there, its look climbing
	// with it (BoardSquares); a MAX square made is called
	kingThrow: async (bookEvent: BookEventOfType<'kingThrow'>) => {
		stateGame.moveLog = [
			...stateGame.moveLog,
			`KING THROWS ${bookEvent.throws.map((thrown) => `x${thrown.mult} (+${thrown.was}→+${thrown.value})`).join(' ')}`,
		];
		eventEmitter.broadcast({ type: 'moveLabel', text: 'THE KING THROWS', kind: 'good', hold: MOVE_TIMING.short });
		await eventEmitter.broadcastAsync({ type: 'playBoardPulse', positions: [bookEvent.king], times: 1 });
		await eventEmitter.broadcastAsync({ type: 'playBoardThrow', king: bookEvent.king, throws: bookEvent.throws });
		if (bookEvent.throws.some((thrown) => thrown.max)) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win' });
			await eventEmitter.broadcastAsync({ type: 'moveLabel', text: 'MAX SQUARE!', kind: 'mate', hold: MOVE_TIMING.mate });
		}
		await pause(MOVE_TIMING.pause);
	},
	// CHEATER MODE: your queen draws every spot in, the multiplier adding up as they arrive
	queenCollect: async (bookEvent: BookEventOfType<'queenCollect'>) => {
		stateGame.moveLog = [
			...stateGame.moveLog,
			`QUEEN COLLECTS ${bookEvent.spots.map((spot) => `${spot.op}${spot.value}`).join(' ')} = x${bookEvent.multiplier}`,
		];
		// a hold on the queen first, so the collecting is seen as hers
		eventEmitter.broadcast({ type: 'moveLabel', text: 'THE QUEEN COLLECTS', kind: 'good', hold: MOVE_TIMING.queenHold });
		await eventEmitter.broadcastAsync({ type: 'playBoardPulse', positions: [bookEvent.queen], times: 2 });
		await eventEmitter.broadcastAsync({
			type: 'playBoardCollect',
			queen: bookEvent.queen,
			spots: bookEvent.spots,
		});
		stateGame.spots = [];
		stateGame.multiplier = bookEvent.multiplier;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_win' });
		eventEmitter.broadcast({ type: 'multiplierPulse' });
		await pause(MOVE_TIMING.pause);
	},
	// a move, yours or the other side's: the piece slides over, a taken piece bursts as it arrives
	// and its pay floats up (with the spot it was taken on, used up), a check is called
	move: async (bookEvent: BookEventOfType<'move'>) => {
		stateGame.turn = bookEvent.side;
		stateGame.checkLines = [];
		// a beat before the spin's first move: the mover (and what it will take) pulse, so the eye is on
		// the right square before anything slides
		if (stateGame.movesThisSpin === 0) {
			await eventEmitter.broadcastAsync({
				type: 'playBoardPulse',
				positions: bookEvent.captured ? [bookEvent.from, bookEvent.to] : [bookEvent.from],
				times: 2,
			});
		}
		if (bookEvent.captured) stateGame.attackSquare = bookEvent.to;
		// the move's sounds (the piece landing, a capture, a promotion, a check) are the play board's,
		// each as it happens
		stateGame.moveLog = [...stateGame.moveLog, describeMove(bookEvent)];
		stateGame.moves = [
			...stateGame.moves,
			{
				side: bookEvent.side,
				piece: bookEvent.piece,
				from: bookEvent.from,
				to: bookEvent.to,
				captured: bookEvent.captured,
				promotion: bookEvent.promotion,
				check: bookEvent.check,
				mate: bookEvent.mate,
			},
		];
		await eventEmitter.broadcastAsync({ type: 'playBoardMove', move: bookEvent });
		stateGame.attackSquare = undefined;
		stateGame.movesThisSpin += 1;
		if (bookEvent.spot) {
			// the spot the piece was taken on, whole (a merged one covers more squares than this one)
			stateGame.spots = stateGame.spots.filter((spot) => !spotCovers(spot, bookEvent.to));
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_win' });
		}
		if (bookEvent.win > 0) {
			stateGame.spinWin += bookEvent.win;
			stateGame.lastSpot = bookEvent.spot;
			eventEmitter.broadcast({
				type: 'moveWinShow',
				position: bookEvent.to,
				amount: bookEvent.win,
				multiplier: bookEvent.multiplier,
				spot: bookEvent.spot,
			});
		}
		if (bookEvent.promotion) {
			eventEmitter.broadcast({ type: 'moveLabel', text: 'QUEEN!', kind: 'good', hold: MOVE_TIMING.short });
		}
		if (bookEvent.check && !bookEvent.mate) {
			eventEmitter.broadcast({
				type: 'moveLabel',
				text: 'CHECK',
				kind: bookEvent.side === 'you' ? 'good' : 'bad',
				hold: MOVE_TIMING.label,
			});
		}
		await pause(bookEvent.captured ? MOVE_TIMING.pause + MOVE_TIMING.captureHold : MOVE_TIMING.pause);
	},
	// landed with your king in check: it is lit, and the check called, before your first move
	inCheck: async () => {
		stateGame.checkSquare = stateGameDerived.kingSquare('WK');
		stateGame.moveLog = [...stateGame.moveLog, 'LANDED IN CHECK'];
		chessSound.check('them');
		await eventEmitter.broadcastAsync({
			type: 'moveLabel',
			text: 'CHECK',
			kind: 'bad',
			hold: MOVE_TIMING.label,
		});
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
		stateGame.turn = undefined;
		// the mated king flashes, the camera closing in on him
		const king = stateGameDerived.kingSquare(bookEvent.by === 'you' ? 'BK' : 'WK');
		if (king) {
			eventEmitter.broadcast({ type: 'playBoardPulse', positions: [king], times: 3 });
			cameraDerived.zoomTo(king, cameraDerived.ZOOM.mate, cameraDerived.TIMING.zoomIn * 1.4);
		}
		chessSound.mate(bookEvent.by);
		if (bookEvent.by === 'you') {
			await eventEmitter.broadcastAsync({
				type: 'moveLabel',
				text: 'CHECKMATE!',
				kind: 'mate',
				hold: MOVE_TIMING.mate,
			});
		} else {
			await eventEmitter.broadcastAsync({
				type: 'moveLabel',
				text: 'CHECKMATED',
				kind: 'bad',
				hold: MOVE_TIMING.label,
			});
		}
		cameraDerived.reset();
	},
	// why the spin's moves are over (a mate has its own label): a quiet end would look like a freeze
	sequenceEnd: async (bookEvent: BookEventOfType<'sequenceEnd'>) => {
		stateGame.turn = undefined;
		stateGame.analysis = bookEvent.analysis;
		const texts = {
			quiet: stateGame.movesThisSpin === 0 ? 'NO CAPTURE' : 'NO FORCING MOVE',
			stalemate: 'STALEMATE',
			repetition: 'DRAW',
			limit: 'MOVE LIMIT',
		} as const;
		const text = texts[bookEvent.reason as keyof typeof texts];
		if (!text) return;
		await eventEmitter.broadcastAsync({ type: 'moveLabel', text, kind: 'info', hold: MOVE_TIMING.short });
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		// a fist slams the board (FistSlam), and the bonus comes in
		await eventEmitter.broadcastAsync({ type: 'fistSlam' });
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
		// the multiplier the bonus starts with comes with its updateGlobalMult (the cheater spin's carries on)
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
