import { stateLayoutDerived } from './stateLayout';
import { stateGameDerived } from './stateGame.svelte';
import { SYMBOL_SIZE } from './constants';

// Where the things round the board go: the multiplier badge (ComboMultiplier, a circle `size` across),
// the side toggle (SideToggle), the spin's win (SpinWin) and whose move it is (TurnTag), the last two
// boxes `width` by `height`. On wide screens all four in a column to the right of the board, clear of
// the picture's gold frame round it (about a square and a half wide); on tall and square ones the toggle
// and a smaller multiplier in a row above the board, and the turn tag and the spin win below it, under
// the move log, left and right.
export const sidePanelLayout = () => {
	const board = stateGameDerived.boardLayout();
	const layoutType = stateLayoutDerived.layoutType();
	const width = SYMBOL_SIZE * 2.6;
	const height = SYMBOL_SIZE * 0.8;
	const tagHeight = SYMBOL_SIZE * 0.6;
	const clear = SYMBOL_SIZE * 1.7;
	const gap = SYMBOL_SIZE * 0.3;
	const beside = layoutType === 'desktop' || layoutType === 'landscape';
	if (beside) {
		const size = SYMBOL_SIZE * 2.8;
		const x = board.x + board.width / 2 + clear + size / 2;
		const top = board.y - board.height / 2;
		const toggleY = top + size + gap + height / 2;
		const spinWinY = toggleY + height / 2 + gap + height / 2;
		const turnY = spinWinY + height / 2 + gap + tagHeight / 2;
		return {
			width,
			height,
			tagHeight,
			multiplier: { x, y: top + size / 2, size },
			toggle: { x, y: toggleY },
			spinWin: { x, y: spinWinY },
			turn: { x, y: turnY },
		};
	}
	const size = SYMBOL_SIZE * 1.5;
	const y = board.y - board.height / 2 - clear - height / 2;
	const below = board.y + board.height / 2 + SYMBOL_SIZE * 2.1;
	return {
		width,
		height,
		tagHeight,
		multiplier: { x: board.x + board.width / 2 - size / 2, y, size },
		toggle: { x: board.x - board.width / 2 + width / 2, y },
		spinWin: { x: board.x + board.width / 2 - width / 2, y: below },
		turn: { x: board.x - board.width / 2 + width / 2, y: below },
	};
};
