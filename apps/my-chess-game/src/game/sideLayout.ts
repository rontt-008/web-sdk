import { stateLayoutDerived } from './stateLayout';
import { stateGameDerived } from './stateGame.svelte';
import { SYMBOL_SIZE } from './constants';

// Where the multiplier badge (ComboMultiplier) and the side toggle (SideToggle) go, each a box
// `width` wide: on wide screens one above the other to the right of the board; on tall and square
// ones in a row above the board, the toggle left and the multiplier right.
export const sidePanelLayout = () => {
	const board = stateGameDerived.boardLayout();
	const layoutType = stateLayoutDerived.layoutType();
	const width = SYMBOL_SIZE * 2.6;
	const height = SYMBOL_SIZE * 0.8;
	const gap = SYMBOL_SIZE * 0.7;
	const beside = layoutType === 'desktop' || layoutType === 'landscape';
	if (beside) {
		const x = board.x + board.width / 2 + gap + width / 2;
		const top = board.y - board.height / 2;
		return {
			width,
			height,
			multiplier: { x, y: top + height / 2 + SYMBOL_SIZE * 0.1 },
			toggle: { x, y: top + height * 1.5 + SYMBOL_SIZE * 0.4 },
		};
	}
	const y = board.y - board.height / 2 - gap - height / 2;
	return {
		width,
		height,
		multiplier: { x: board.x + board.width / 2 - width / 2, y },
		toggle: { x: board.x - board.width / 2 + width / 2, y },
	};
};
