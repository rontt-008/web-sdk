import { stateLayoutDerived } from './stateLayout';
import { stateGameDerived } from './stateGame.svelte';
import { SYMBOL_SIZE } from './constants';

// the side toggle's pill (SideToggle), for lining things up with it
const TOGGLE_HEIGHT = 70;

// Where the things round the board go: the side panel (SidePanel: the multiplier, the spin's win, whose
// move it is, the moves and the pieces taken), the multiplier badge (ComboMultiplier, a circle `size`
// across), the side toggle (SideToggle), the spin's win (SpinWin) and whose move it is (TurnTag), the
// last two boxes `width` by `height`. Those the layout leaves out aren't drawn.
// - desktop: the side panel in a column to the right of the board, from its top, and the toggle under
//   it along the board's bottom (the panel has the multiplier, spin win and turn, so no badge or boxes)
// - phones held sideways: no room to read a panel, so the badge, toggle, spin win and turn tag in a
//   column to the right
// - tall and square screens: the toggle and a smaller badge in a row just above the board, and the turn
//   tag and the spin win below it, under the move log, left and right
export const sidePanelLayout = () => {
	const board = stateGameDerived.boardLayout();
	const layoutType = stateLayoutDerived.layoutType();
	const width = SYMBOL_SIZE * 2.6;
	const height = SYMBOL_SIZE * 0.8;
	const tagHeight = SYMBOL_SIZE * 0.6;
	const gap = SYMBOL_SIZE * 0.3;
	const top = board.y - board.height / 2;
	const bottom = board.y + board.height / 2;

	if (layoutType === 'desktop') {
		const clear = SYMBOL_SIZE * 0.5;
		const x = board.x + board.width / 2 + clear;
		const panelWidth = Math.min(stateLayoutDerived.mainLayout().width - x - clear, SYMBOL_SIZE * 5);
		return {
			width,
			height,
			tagHeight,
			panel: { x, y: top, width: panelWidth, height: board.height - TOGGLE_HEIGHT - gap },
			multiplier: undefined,
			toggle: { x: x + panelWidth / 2, y: bottom - TOGGLE_HEIGHT / 2 },
			spinWin: undefined,
			turn: undefined,
		};
	}

	if (layoutType === 'landscape') {
		const clear = SYMBOL_SIZE * 0.9;
		const size = SYMBOL_SIZE * 2.8;
		const x = board.x + board.width / 2 + clear + size / 2;
		const toggleY = top + size + gap + height / 2;
		const spinWinY = toggleY + height / 2 + gap + height / 2;
		const turnY = spinWinY + height / 2 + gap + tagHeight / 2;
		return {
			width,
			height,
			tagHeight,
			panel: undefined,
			multiplier: { x, y: top + size / 2, size },
			toggle: { x, y: toggleY },
			spinWin: { x, y: spinWinY },
			turn: { x, y: turnY },
		};
	}

	const clear = SYMBOL_SIZE * 0.5;
	const size = SYMBOL_SIZE * 1.5;
	const y = top - clear - height / 2;
	const below = bottom + SYMBOL_SIZE * 1.75;
	return {
		width,
		height,
		tagHeight,
		panel: undefined,
		multiplier: { x: board.x + board.width / 2 - size / 2, y, size },
		toggle: { x: board.x - board.width / 2 + width / 2, y },
		spinWin: { x: board.x + board.width / 2 - width / 2, y: below },
		turn: { x: board.x - board.width / 2 + width / 2, y: below },
	};
};
