import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import { SYMBOL_SIZE, REEL_PADDING, SYMBOL_INFO_MAP, BOARD_DIMENSIONS } from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import type { RawSymbol, SymbolState } from './types';

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
export const getSymbolX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

export const getSymbolKey = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.multiplier !== undefined) {
		return `${rawSymbol.name}_${rawSymbol.multiplier}` as keyof typeof SYMBOL_INFO_MAP;
	}
	return rawSymbol.name as keyof typeof SYMBOL_INFO_MAP;
};

export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}) => {
	const symbolKey = getSymbolKey({ rawSymbol });
	return SYMBOL_INFO_MAP[symbolKey][state];
};

// A board's square blocks of wilds (Hagall's power in the power spins: 2x2 in the bonus, 3x3 in the
// super bonus), each drawn as one big wild (BigWild): 3x3 ones first, then 2x2 ones of the wilds
// left, each found from the left and the top, so no cell is in two. Each with its side, its cells,
// where its middle is across the board, and the cell it moves with as it falls (`lead`: in its
// middle reel, or the left of its middle two, the cell at or just under its middle) with how far
// above that its middle is; in `reels`, whose reels start with the padding row above the board, as
// the boards' do.
export const WILD_BLOCK_SIZES = [3, 2];

export const findWildBlocks = <Cell>(reels: Cell[][], isWild: (cell: Cell) => boolean) => {
	const taken = new Set<Cell>();
	const blocks: {
		size: number;
		cells: Cell[];
		x: number;
		leadReel: number;
		lead: Cell;
		leadOffset: number;
	}[] = [];
	for (const size of WILD_BLOCK_SIZES) {
		for (let reel = 0; reel + size <= reels.length; reel++) {
			for (let index = 1; index + size <= BOARD_DIMENSIONS.y + 1; index++) {
				const cells = _.range(reel, reel + size).flatMap((r) =>
					_.range(index, index + size).map((i) => reels[r]?.[i]),
				);
				if (!cells.every((cell) => cell !== undefined && isWild(cell) && !taken.has(cell)))
					continue;
				cells.forEach((cell) => taken.add(cell));
				const leadReel = reel + Math.floor((size - 1) / 2);
				blocks.push({
					size,
					cells,
					x: getSymbolX(reel) + ((size - 1) / 2) * SYMBOL_SIZE,
					leadReel,
					lead: reels[leadReel][index + Math.floor(size / 2)],
					leadOffset: ((size - 1) / 2 - Math.floor(size / 2)) * SYMBOL_SIZE,
				});
			}
		}
	}
	return blocks;
};
