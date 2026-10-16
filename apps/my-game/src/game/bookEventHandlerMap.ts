import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateUi } from 'state-shared';

import { eventEmitter } from './eventEmitter';
import { playBookEvent, markBigWilds, getBonusType, FIRST_VISIBLE_ROW } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';
import config from './config';

// how many times the scatters flip over when they trigger free spins
const SCATTER_TRIGGER_FLIPS = 2;

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

// a win on any row of a big wild animates the big wild itself, once
const toBigWildAnchor = (position: Position) => {
	const reelSymbols = stateGame.board[position.reel].reelState.symbols;
	if (!reelSymbols[position.row].rawSymbol.bigWild) return position;
	const anchorRow = reelSymbols.findIndex((reelSymbol) => reelSymbol.rawSymbol.bigWild?.anchor);
	return { reel: position.reel, row: anchorRow };
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: _.uniqWith(positions.map(toBigWildAnchor), _.isEqual),
	});
};

// the rest of the board is shaded while these symbols animate
const animateSymbolsHighlighted = async ({ positions }: { positions: Position[] }) => {
	stateGame.winHighlight = _.uniqWith(positions.map(toBigWildAnchor), _.isEqual);
	await animateSymbols({ positions });
};

// SUPER free spins: the moves of a bigWildWalk, for the reveal after it to slide the big wilds
let walkingWildMoves: BookEventOfType<'bigWildWalk'>['moves'] = [];

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		const board = markBigWilds(bookEvent.board);
		const moves = walkingWildMoves;
		walkingWildMoves = [];
		// the reels the walking big wilds move onto don't spin
		const heldReels = moves.map(({ to }) => to).filter((reel) => reel >= 0);
		const spin = stateGameDerived.enhancedBoard.spin({
			revealEvent: { ...bookEvent, board },
			paddingBoard: config.paddingReels[bookEvent.gameType],
			heldReels,
		});
		if (moves.length > 0) {
			// the walking big wilds walk over while the other reels spin; once there, they are on the
			// board (their reels get the reveal's big wilds) and it draws them again
			await Promise.all([spin, eventEmitter.broadcastAsync({ type: 'walkingWildsMove' })]);
			for (const reelIndex of heldReels) {
				const reelSymbols = stateGame.board[reelIndex].reelState.symbols;
				board[reelIndex].forEach((rawSymbol, row) => {
					if (reelSymbols[row]) reelSymbols[row].rawSymbol = rawSymbol;
				});
			}
			stateGame.hiddenReels = [];
			eventEmitter.broadcast({ type: 'walkingWildsHide' });
		} else {
			await spin;
		}
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	// before the reveal: the big wilds that walk on are taken off their reels, as they look there.
	// The reels they move onto keep their symbols, which they slide over; but a reel whose own big
	// wild walks away while another moves onto it doesn't, or that big wild would stay behind too.
	bigWildWalk: async (bookEvent: BookEventOfType<'bigWildWalk'>) => {
		if (bookEvent.moves.length === 0) return;
		eventEmitter.broadcast({ type: 'walkingWildsShow', moves: bookEvent.moves });
		stateGame.hiddenReels = bookEvent.moves
			.map(({ to }) => to)
			.filter((reel) => bookEvent.moves.some(({ from }) => from === reel));
		walkingWildMoves = bookEvent.moves;
	},
	bigWildThrow: async (bookEvent: BookEventOfType<'bigWildThrow'>) => {
		if (bookEvent.positions.length === 0) return;
		// the big wild pulses while its wilds fly out
		await Promise.all([
			animateSymbols({ positions: [{ reel: bookEvent.reel, row: FIRST_VISIBLE_ROW }] }),
			eventEmitter.broadcastAsync({
				type: 'wildThrow',
				reel: bookEvent.reel,
				positions: bookEvent.positions,
			}),
		]);
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		// The wins are shown one after another: the rest of the board is shaded, the symbols of the
		// win hop and a line is drawn through them with the win's amount on it. Big wins then get
		// their own screen (see setWin).
		for (const win of bookEvent.wins) {
			await Promise.all([
				animateSymbolsHighlighted({ positions: win.positions }),
				eventEmitter.broadcastAsync({
					type: 'winLineShow',
					positions: win.positions,
					amount: win.win,
				}),
			]);
		}
		stateGame.winHighlight = undefined;
	},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// the scatters flip over twice, the rest of the board shaded
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		for (const _flip of _.range(SCATTER_TRIGGER_FLIPS)) {
			await animateSymbolsHighlighted({ positions: bookEvent.positions });
		}
		stateGame.winHighlight = undefined;
		stateGame.bonusType = getBonusType(bookEvent.positions.length);
		// show free spin intro: it cuts straight in over the blurred scene, without a transition
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});
		stateGame.gameType = 'freegame';
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerButtonShow' });
		eventEmitter.broadcast({ type: 'drawerFold' });
	},
	// 2 or more FS symbols during free spins add spins: the symbols animate, "+2 FREE SPINS" pops up
	// over the board and the counter's total goes up. How many is the math's call (totalFs is the new
	// total), so the frontend only shows the difference.
	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinRetrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbolsHighlighted({ positions: bookEvent.positions });
		stateGame.winHighlight = undefined;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_respins' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinRetriggerShow',
			extraSpins: bookEvent.totalFs - stateUi.freeSpinCounterTotal,
		});
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
		stateUi.freeSpinCounterTotal = bookEvent.totalFs;
	},
	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		stateUi.freeSpinCounterShow = true;
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount + 1,
			total: bookEvent.total,
		});
		stateUi.freeSpinCounterCurrent = bookEvent.amount + 1;
		stateUi.freeSpinCounterTotal = bookEvent.total;
	},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		// the free spin counter is drawn over the blurred scene, so it goes before the total win shows
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		stateUi.freeSpinCounterShow = false;
		stateGame.gameType = 'basegame';
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		// cuts straight back to the base game, without a transition, as the intro cuts in
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		// the counter was hidden before the total win, so its text no longer shows
		stateGame.bonusType = undefined;
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		// Smaller wins are only shown on their lines (see winInfo) and in the UI's win amount; big
		// ones (15x the bet and up) count up on their own screen afterwards.
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];
		if (winLevelData?.type !== 'big') return;

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'bigWinShow',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
	},
	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// Do nothing
	},
	// the round has reached the max win; the win and its max win celebration come with the events
	// that follow (setWin, freeSpinEnd)
	wincap: async (bookEvent: BookEventOfType<'wincap'>) => {},
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

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGlobalMultEvent) playBookEvent(lastUpdateGlobalMultEvent, { bookEvents });
	},
};
