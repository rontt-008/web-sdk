import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateBetDerived } from 'state-shared';
import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { SYMBOL_MOTIONS } from './motion';
import { findWildBlocks, playBookEvent } from './utils';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived, flownKey } from './stateGame.svelte';
import { LOW_SYMBOLS } from './constants';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { BonusType, Position } from './types';
import { BONUS_POWERS, NO_OFFSET, type RuneName, type RuneOffset } from './runes';

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
		// the mythic bonus starts with two collected
		if (bookEvent.type === 'freeSpinTrigger') collected.push(...(bookEvent.collected ?? []));
		if (bookEvent.type === 'runeShow' && bookEvent.rune !== 'mannaz') {
			rune = bookEvent.rune;
			offsets[bookEvent.rune] = bookEvent.offset ?? NO_OFFSET;
			lit = [];
		}
		// (the base game's Mannaz, before the bonus, isn't one of them)
		if (bookEvent.type === 'runeLight' && bookEvent.rune !== 'mannaz') {
			lit = [...lit, ...bookEvent.positions];
		}
		if (bookEvent.type === 'runeComplete' && bookEvent.rune !== 'mannaz') {
			collected.push(bookEvent.rune);
			rune = undefined;
		}
		if (bookEvent.type === 'powerSpinsTrigger') rune = undefined;
	}
	return { rune, offsets, lit, collected };
};

// what the spins' sign calls the free spins of each bonus
const SPIN_TITLES: Record<BonusType, string> = {
	normal: 'FREE SPIN',
	super: 'SUPER SPIN',
	mythic: 'MYTHIC SPIN',
};

// a rune symbol's land animation (fLand, iLand in constants.ts) lasts 1.5 s; one still landing after
// this long (in ms, plus the animation) isn't waited for any longer
const RUNE_LAND = { length: 1500, slack: 500 };

// Until the symbols at these cells have played their land animation through: a spin waits only for
// the other symbols' short settle (see reveal), a tumble for all of it (TumbleBoard).
const waitForLanded = async (positions: Position[]) => {
	const until = Date.now() + RUNE_LAND.length / stateBetDerived.timeScale() + RUNE_LAND.slack;
	const landing = () =>
		positions.some(
			({ reel, row }) => stateGame.board[reel]?.reelState.symbols[row]?.symbolState === 'land',
		);
	while (landing() && Date.now() < until) await waitForTimeout(1000 / 60);
};

// Rune symbols landed in a free spin (Fehu's or Ingwaz's): each plays its land animation as it
// lands, then bursts into a soul that flies into its rune's box (MeterSouls in RuneTablets), as the
// winning leaves' fly to the bonus meter in the base game. The symbol goes as its soul sets off, its
// cell left empty (stateGame.flown) for the tumble after it to fill (tumbleBoard); as each lands the
// rune's power grows by a step (`onland`) and its box pulses. Done when they have all landed.
const throwRuneSouls = async ({
	rune,
	symbol,
	positions,
	onland,
}: {
	rune: RuneName;
	symbol: string;
	positions: Position[];
	onland: () => void;
}) => {
	await waitForLanded(positions);
	await eventEmitter.broadcastAsync({
		type: 'runeSouls',
		rune,
		souls: positions.map((position) => ({
			...stateGameDerived.cellCentre(position),
			symbol,
			onleave: () => stateGame.flown.push(flownKey(position)),
			onland: () => {
				onland();
				eventEmitter.broadcast({ type: 'runesPulse', rune });
			},
		})),
	});
};

// Mannaz in a base game spin: the book shows it (runeShow) after the spin's reveal and any wind, but
// it comes up as the reveal starts, before the symbols land, rather than after them; its runeShow
// then finds it there (mannazUp)
let mannazUp = false;

const showMannaz = async () => {
	eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_reveal' });
	await eventEmitter.broadcastAsync({ type: 'mannazShow' });
};

// whether the spin this reveal starts shows Mannaz: a runeShow of it before the next reveal
const spinShowsMannaz = (reveal: BookEvent, bookEvents: BookEvent[]) => {
	const after = bookEvents.slice(bookEvents.indexOf(reveal) + 1);
	const next = after.findIndex((bookEvent) => bookEvent.type === 'reveal');
	return (next < 0 ? after : after.slice(0, next)).some(
		(bookEvent) => bookEvent.type === 'runeShow' && bookEvent.rune === 'mannaz',
	);
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
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		stateGame.gameType = bookEvent.gameType;
		stateGame.flown = [];
		// the board already in its place for the game type, unless a round is resumed in the bonus
		stateGameDerived.slideBoard(bookEvent.gameType, { instant: true });
		// each base game spin counts its connected symbols from nothing, and starts without Mannaz
		// (it only shows in some spins, with a runeShow)
		if (bookEvent.gameType === 'basegame') {
			eventEmitter.broadcast({ type: 'bonusMeterReset' });
			eventEmitter.broadcast({ type: 'mannazReset' });
		}
		// a spin with Mannaz brings it up over the empty board as its symbols fall in
		mannazUp = bookEvent.gameType === 'basegame' && spinShowsMannaz(bookEvent, bookEvents);
		await Promise.all([
			stateGameDerived.enhancedBoard.spin({ revealEvent: bookEvent }),
			mannazUp && showMannaz(),
		]);
		// done when the last symbols to fall in (the top row) have landed, so their squash isn't cut
		// short by a win or the next spin
		await waitForTimeout(SYMBOL_MOTIONS.land.duration / stateBetDerived.timeScale());
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},
	// now and then a gust of wind blows wilds onto the landed board before its wins (Wind; the fox
	// gusts too): each cell turns wild as its wild lands on it, settling in; done when the last has
	// settled, so the wins count them (and the tumbles keep them, from the board's symbols)
	windWilds: async (bookEvent: BookEventOfType<'windWilds'>) => {
		const turnWild = ({ reel, row }: Position) => {
			const reelSymbol = stateGame.board[reel].reelState.symbols[row];
			if (reelSymbol.rawSymbol.name === 'W') return;
			reelSymbol.rawSymbol = { name: 'W', wild: true };
			reelSymbol.symbolState = 'land';
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
		};
		await eventEmitter.broadcastAsync({
			type: 'windGust',
			positions: bookEvent.positions,
			onland: turnWild,
		});
		// any the gust didn't get to (no board to blow them over)
		bookEvent.positions.forEach(turnWild);
		await waitForTimeout(SYMBOL_MOTIONS.land.duration / stateBetDerived.timeScale());
	},
	// more rarely a gust takes every symbol of one kind off the board (Wind; the fox gusts too): each
	// is lifted off its cell as the gust reaches it, the cell left empty (as for the leaves whose
	// souls flew to the bonus meter, stateGame.flown) for the tumble after it to fill (tumbleBoard)
	windSweep: async (bookEvent: BookEventOfType<'windSweep'>) => {
		await eventEmitter.broadcastAsync({
			type: 'windSweep',
			positions: bookEvent.positions,
			onleave: (position) => stateGame.flown.push(flownKey(position)),
		});
	},
	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		// a wild in two clusters once: a symbol animated twice would wait forever for its first win
		const positions = _.uniqBy(
			_.flatten(bookEvent.wins.map((win) => win.positions)),
			(position) => `${position.reel}:${position.row}`,
		);

		// clusters through a big wild (a 2x2 or 3x3 block of wilds, see findWildBlocks) show their wins
		// one at a time, and the board waits for the last to come up before it tumbles
		const bigWildCells = new Set(
			findWildBlocks(
				stateGame.board.map((reel) => reel.reelState.symbols),
				(reelSymbol) => reelSymbol.rawSymbol.name === 'W',
			).flatMap((block) => block.cells),
		);
		const oneByOne = positions.some((position) =>
			bigWildCells.has(stateGame.board[position.reel]?.reelState.symbols[position.row]),
		);
		let onshown = () => {};
		const allShown = new Promise<void>((resolve) => (onshown = resolve));

		// each cluster's win floats up from it; not waited for, it floats on as the board tumbles
		eventEmitter.broadcast({
			type: 'showClusterWinAmounts',
			oneByOne,
			onshown,
			// winWithoutMult is in bets, the book's amounts in hundredths of the bet: the cluster's
			// win before its multipliers, "X" its multipliers (the free spins have none: only Fehu's
			// in the power spins), then its win
			wins: bookEvent.wins.map((win) => {
				return {
					win: win.meta.winWithoutMult * BOOK_AMOUNT_MULTIPLIER,
					mult: win.meta.clusterMult * win.meta.globalMult,
					result: win.win,
					reel: win.meta.overlay.reel,
					row: win.meta.overlay.row,
					positions: win.positions,
				};
			}),
		});

		// the symbols' hits, then in the base game each winning leaf bursts into a soul that flies into
		// the bonus meter (MeterSouls): done when the last has set off, so the board tumbles while
		// they fly (the meter fills when they land, see BonusMeter)
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
		await Promise.all([animateSymbols({ positions }), oneByOne ? allShown : undefined]);
		if (stateGame.gameType !== 'basegame') return;
		const leaves = positions.filter((position) => {
			const symbol =
				stateGame.board[position.reel]?.reelState.symbols[position.row]?.rawSymbol.name;
			return symbol && LOW_SYMBOLS.includes(symbol);
		});
		if (!leaves.length) return;
		await new Promise<void>((resolve) => {
			let left = 0;
			eventEmitter.broadcast({
				type: 'bonusMeterSouls',
				souls: leaves.map((position) => ({
					...stateGameDerived.cellCentre(position),
					symbol: stateGame.board[position.reel].reelState.symbols[position.row].rawSymbol.name,
					// the leaf goes as its soul sets off, as if it flew to the meter itself
					onleave: () => {
						stateGame.flown.push(flownKey(position));
						if (++left === leaves.length) resolve();
					},
				})),
			});
		});
	},
	// the spin's win so far isn't shown in a box by the board (the user removed the sample's tumble win
	// panel); the clusters' own amounts show on the board and the total in the UI bar
	updateTumbleWin: async () => {},
	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},
	// the meter fills when the souls flying to it have landed (BonusMeter), not waited for here, so
	// the board tumbles meanwhile
	updateBonusMeter: async (bookEvent: BookEventOfType<'updateBonusMeter'>) => {
		eventEmitter.broadcast({ type: 'bonusMeterUpdate', amount: bookEvent.amount });
	},
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		// the bonus, the super bonus or the mythic bonus: the intro, the spins' sign and the runes'
		// powers say which
		stateGame.bonusType = bookEvent.bonusType ?? 'normal';
		const collected = bookEvent.collected ?? [];
		// Fehu's multiplier and Ingwaz's spins back to their own, until their symbols add to them
		stateGame.fehuMult = undefined;
		stateGame.ingwazSpins = undefined;
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		// the bonus meter full (a bought bonus may not have filled it); it goes for the free spins.
		// The mythic bonus is Mannaz's, already flaring, not the meter's
		if (stateGame.bonusType !== 'mythic')
			await eventEmitter.broadcastAsync({ type: 'bonusMeterFull' });
		// the fox is surprised (on wide screens, where it shows), and as its surprise hits, the gale
		await eventEmitter.broadcastAsync({ type: 'foxSurprised' });
		// a gale sweeps the screen (WindTransition). Under it the free spins' setup is put in place,
		// so nothing moves once it clears: the board in its bonus place right, where the rune ladder
		// has room, the fox smaller (Mannaz fades as the game type changes), the spins' sign instead of
		// the meter, the mythic bonus's two runes already collected in their boxes; and the intro is
		// there, its spins on it (its music and jingle start under the wind). It waits for a press.
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		let intro: Promise<unknown> | undefined;
		await eventEmitter.broadcastAsync({
			type: 'windTransition',
			oncovered: () => {
				stateGame.gameType = 'freegame';
				stateGameDerived.slideBoard('freegame', { instant: true });
				eventEmitter.broadcast({ type: 'bonusMeterHide' });
				if (collected.length) {
					eventEmitter.broadcast({ type: 'runesRestore', offsets: {}, lit: [], collected });
				}
				eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
				eventEmitter.broadcast({
					type: 'freeSpinCounterUpdate',
					current: undefined,
					total: bookEvent.totalFs,
					title: SPIN_TITLES[stateGame.bonusType],
				});
				eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
				eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
				eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
				intro = eventEmitter.broadcastAsync({
					type: 'freeSpinIntroUpdate',
					totalFreeSpins: bookEvent.totalFs,
				});
			},
		});
		await intro;
		eventEmitter.broadcast({ type: 'freeSpinIntroHide' });
		// the runes already collected pulse in their boxes, one after the other
		for (const rune of collected) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
			await eventEmitter.broadcastAsync({ type: 'runesPulse', rune });
		}
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
	// the global multiplier, only Fehu's (x5, x10 in the super bonus) in the power spins (the user
	// removed the free spins' one, the spin's number), isn't shown on its own (nor the sample's
	// multiplier box); the cluster wins show it
	updateGlobalMult: async () => {},
	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		stateGame.gameType = 'basegame';
		// no Mannaz back in the base game until a spin shows it, and then unlit (after the mythic bonus
		// it was all lit)
		eventEmitter.broadcast({ type: 'mannazReset' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		// a gale sweeps the screen (WindTransition). Under it the end screen and the bonus's pieces
		// go and the base game's setup is put back, so nothing moves once it clears: the board in its
		// base game place further left, the fox bigger again, the meter back
		await eventEmitter.broadcastAsync({
			type: 'windTransition',
			oncovered: () => {
				eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
				eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
				stateGame.bonusType = 'normal';
				eventEmitter.broadcast({ type: 'runesReset' });
				eventEmitter.broadcast({ type: 'bonusMeterReset' });
				eventEmitter.broadcast({ type: 'bonusMeterShow' });
				stateGameDerived.slideBoard('basegame', { instant: true });
			},
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
		await eventEmitter.broadcastAsync({ type: 'drawerUnfold' });
		eventEmitter.broadcast({ type: 'drawerButtonHide' });
	},
	tumbleBoard: async (bookEvent: BookEventOfType<'tumbleBoard'>) => {
		eventEmitter.broadcast({ type: 'boardHide' });
		eventEmitter.broadcast({ type: 'tumbleBoardShow' });
		eventEmitter.broadcast({ type: 'tumbleBoardInit', addingBoard: bookEvent.newSymbols });
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
	// a rune shows behind the symbols: the free spins' next rune, or now and then in a base game spin
	// Mannaz, across the board (over the symbols, MannazBoard)
	runeShow: async (bookEvent: BookEventOfType<'runeShow'>) => {
		if (bookEvent.rune === 'mannaz') {
			// up already when its spin's reveal brought it in (not when played on its own, a story)
			if (!mannazUp) await showMannaz();
			mannazUp = false;
			return;
		}
		await eventEmitter.broadcastAsync({
			type: 'runesShow',
			rune: bookEvent.rune,
			offset: bookEvent.offset ?? NO_OFFSET,
		});
	},
	// a rune's spots under the wins light up: the free spins' rune, or in the base game Mannaz
	runeLight: async (bookEvent: BookEventOfType<'runeLight'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
		if (bookEvent.rune === 'mannaz') {
			await eventEmitter.broadcastAsync({ type: 'mannazLight', positions: bookEvent.positions });
			return;
		}
		await eventEmitter.broadcastAsync({ type: 'runesLight', positions: bookEvent.positions });
	},
	// all of a rune lit: the free spins' rune is collected; Mannaz flares, and the mythic bonus
	// follows (freeSpinTrigger)
	runeComplete: async (bookEvent: BookEventOfType<'runeComplete'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win' });
		if (bookEvent.rune === 'mannaz') {
			await eventEmitter.broadcastAsync({ type: 'mannazComplete' });
			return;
		}
		await eventEmitter.broadcastAsync({ type: 'runesComplete', rune: bookEvent.rune });
	},
	// Fehu symbols landed in a free spin: their souls fly into Fehu's box (throwRuneSouls), each
	// doubling the multiplier it shows as it lands; then the multiplier is the book's
	fehuSymbols: async (bookEvent: BookEventOfType<'fehuSymbols'>) => {
		await throwRuneSouls({
			rune: 'fehu',
			symbol: 'F',
			positions: bookEvent.positions,
			onland: () => {
				stateGame.fehuMult = (stateGame.fehuMult ?? BONUS_POWERS[stateGame.bonusType].mult) * 2;
			},
		});
		stateGame.fehuMult = bookEvent.multiplier;
	},
	// Ingwaz symbols the same into Ingwaz's box, each one more power spin
	ingwazSymbols: async (bookEvent: BookEventOfType<'ingwazSymbols'>) => {
		await throwRuneSouls({
			rune: 'ingwaz',
			symbol: 'I',
			positions: bookEvent.positions,
			onland: () => {
				stateGame.ingwazSpins = (stateGame.ingwazSpins ?? 1) + 1;
			},
		});
		stateGame.ingwazSpins = bookEvent.spins;
	},
	powerSpinsTrigger: async (bookEvent: BookEventOfType<'powerSpinsTrigger'>) => {
		// the free spins are over: their rune goes, and the power spins start
		await eventEmitter.broadcastAsync({ type: 'runesHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_superfreespin' });
		eventEmitter.broadcast({ type: 'soundOnce', name: 'jng_intro_fs' });
		await eventEmitter.broadcastAsync({
			type: 'powerSpinsIntro',
			totalSpins: bookEvent.totalSpins,
			runes: bookEvent.runes,
		});
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
		const lastUpdateFreeSpinEvent = findLastBookEvent('updateFreeSpin' as const);
		const lastSetTotalWinEvent = findLastBookEvent('setTotalWin' as const);
		const lastUpdateGlobalMultEvent = findLastBookEvent('updateGlobalMult' as const);
		const lastUpdatePowerSpinEvent = findLastBookEvent('updatePowerSpin' as const);
		const lastFehuSymbolsEvent = findLastBookEvent('fehuSymbols' as const);
		const lastIngwazSymbolsEvent = findLastBookEvent('ingwazSymbols' as const);

		if (lastFreeSpinTriggerEvent) await playBookEvent(lastFreeSpinTriggerEvent, { bookEvents });
		// Fehu's multiplier and Ingwaz's spins as their symbols had made them (the trigger set them back)
		if (lastFehuSymbolsEvent) stateGame.fehuMult = lastFehuSymbolsEvent.multiplier;
		if (lastIngwazSymbolsEvent) stateGame.ingwazSpins = lastIngwazSymbolsEvent.spins;
		if (lastUpdateFreeSpinEvent) playBookEvent(lastUpdateFreeSpinEvent, { bookEvents });
		if (lastUpdatePowerSpinEvent) playBookEvent(lastUpdatePowerSpinEvent, { bookEvents });
		if (lastSetTotalWinEvent) playBookEvent(lastSetTotalWinEvent, { bookEvents });
		if (lastUpdateGlobalMultEvent) playBookEvent(lastUpdateGlobalMultEvent, { bookEvents });
		if (lastFreeSpinTriggerEvent) {
			eventEmitter.broadcast({ type: 'runesRestore', ...runesSoFar({ bookEvents }) });
		}
	},
};
