import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import {
	SYMBOL_SIZE,
	REEL_WIDTH,
	REEL_PADDING,
	SYMBOL_INFO_MAP,
	BOARD_DIMENSIONS,
	BIG_WILD_INFO,
	BONUS_SCATTER_COUNT,
} from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import type { BonusType, RawSymbol, SymbolName, SymbolState } from './types';

// general utils
export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });
export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	await playBookEvents(bet.state);
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

// resume bet
const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'updateGlobalMult',
	'freeSpinTrigger',
	'updateFreeSpin',
	'setTotalWin',
];

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex >= resumingIndex,
	);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
		),
	};

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return { ...betToResume, state: stateToResume };
};

// other utils
export const getSymbolX = (reelIndex: number) => REEL_WIDTH * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

// typed explicitly: an inferred union would drop symbol infos that only add fields (e.g. shadow)
export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}): (typeof SYMBOL_INFO_MAP)[SymbolName][SymbolState] | typeof BIG_WILD_INFO => {
	if (rawSymbol.bigWild) return BIG_WILD_INFO;
	return SYMBOL_INFO_MAP[rawSymbol.name][state];
};

// The animation a sprite symbol plays in a state (see motion.ts): in a win the big wild swells,
// scatters flip over and the rest hop; landing, the big wild slams down and scatters and wilds pop.
// Other symbols do nothing as they land (the cats jiggle with the reel's bounce, see ReelSymbol).
export type SymbolMotion = 'hop' | 'flip' | 'punch' | 'pop' | 'slam';

export const getSymbolMotion = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}): SymbolMotion | undefined => {
	if (state === 'win') {
		if (rawSymbol.bigWild) return 'punch';
		if (rawSymbol.name === 'S') return 'flip';
		return 'hop';
	}
	if (state === 'land') {
		if (rawSymbol.bigWild) return 'slam';
		if (rawSymbol.name === 'S' || rawSymbol.name === 'W') return 'pop';
	}
	return undefined;
};

// 3 FS symbols give the normal bonus, 4 the super bonus and 5 the mythic bonus
export const getBonusType = (scatterCount: number): BonusType => {
	if (scatterCount >= BONUS_SCATTER_COUNT.mythic) return 'mythic';
	if (scatterCount >= BONUS_SCATTER_COUNT.super) return 'super';
	return 'normal';
};

// The math has no big wild symbol: a reel that lands a W on any visible row is shown as one.
// Every visible row of that reel becomes a W; the top one draws the big wild over the whole reel
// and the ones under it draw nothing.
export const FIRST_VISIBLE_ROW = 1; // reels are padded with one symbol above the board

export const markBigWilds = (board: RawSymbol[][]) =>
	board.map((reel) => {
		const visibleRows = _.range(FIRST_VISIBLE_ROW, FIRST_VISIBLE_ROW + BOARD_DIMENSIONS.y);
		const wildRows = visibleRows.filter((row) => reel[row]?.name === 'W');
		if (wildRows.length === 0) return reel;

		const wild = reel[wildRows[0]];
		const multiplier = _.max(wildRows.map((row) => reel[row].multiplier));
		return reel.map((rawSymbol, row) => {
			if (row === FIRST_VISIBLE_ROW) return { ...wild, bigWild: { anchor: true, multiplier } };
			if (visibleRows.includes(row)) return { ...wild, bigWild: { anchor: false } };
			return rawSymbol;
		});
	});
