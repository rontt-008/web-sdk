import { stateLayoutDerived } from './stateLayout';
import { stateGameDerived, STRIP_ROOM } from './stateGame.svelte';
import { SYMBOL_SIZE } from './constants';

// the side toggle's pill (SideToggle), for lining things up with it
const TOGGLE_HEIGHT = 70;
const TOGGLE_WIDTH = 100;

// the notebook pad's width in its own units (NotebookPad), as on desktop
export const PAD_WIDTH = SYMBOL_SIZE * 5;

// the strip of the notebook under the board (NotebookStrip): the gaps over and under it, and how tall
// it is at most, in the main layout's units
const STRIP_GAP = { above: 10, below: 12 };
const STRIP_MAX = 196;

type Rect = { x: number; y: number; width: number; height: number };

// Where the things round the board go, in the main layout's units:
// - `panel`: the notebook lying on the table beside the board (SidePanel; NotebookPad, its own units
//   `zoom` times smaller), seen through the camera
// - `strip`: the notebook's strip under the board (NotebookStrip), flat, not through the camera
// - `overlay`: where the whole notebook opens over the board on phones (NotebookOverlay), its own
//   units `zoom` times smaller
// - `note`: the sticky note of the engine's reasons (StickyNote), its top right corner
// - `toggle`: the side toggle (SideToggle), drawn `scale` times its size
// - `controls`: the practice board's buttons in a row (SandboxControls), its right end and middle, drawn
//   `scale` times their size; without it, in a column left of the board's near corner
// Those the layout leaves out aren't drawn.
// - desktop: the notebook in a column to the right of the board, from its top, and the toggle under
//   it along the board's bottom
// - phones held sideways: the same left of the board (the UI's spin buttons are in a column on the
//   right), drawn bigger to be read; a press opens it bigger still over the board
// - tall and almost square screens: a row just above the board, the toggle at its left end and the
//   practice board's buttons at its right end (a little bigger, for fingers); the strip under it
//   between the board and the UI, a press on it opens the whole notebook over the board, and the
//   sticky note over the board's top right corner
export const sidePanelLayout = () => {
	const board = stateGameDerived.boardLayout();
	const screen = stateGameDerived.screenBounds();
	const layoutType = stateLayoutDerived.layoutType();
	// the board's edges with its wooden frame round it
	const top = board.y - board.height / 2 - board.frame;
	const bottom = board.y + board.height / 2 + board.frame;
	const left = board.x - board.width / 2 - board.frame;
	const right = board.x + board.width / 2 + board.frame;
	const gap = SYMBOL_SIZE * 0.3;
	const none = {
		panel: undefined as (Rect & { zoom: number }) | undefined,
		strip: undefined as Rect | undefined,
		overlay: undefined as (Rect & { zoom: number }) | undefined,
		note: undefined as { x: number; y: number } | undefined,
		controls: undefined as { x: number; y: number; scale: number } | undefined,
	};

	if (layoutType === 'desktop') {
		const clear = SYMBOL_SIZE * 0.4;
		const x = right + clear;
		const width = Math.min(stateLayoutDerived.mainLayout().width - x - clear, PAD_WIDTH);
		return {
			...none,
			panel: { x, y: top, width, height: bottom - top - TOGGLE_HEIGHT - gap, zoom: 1 },
			toggle: { x: x + width / 2, y: bottom - TOGGLE_HEIGHT / 2, scale: 1 },
		};
	}

	if (layoutType === 'landscape') {
		// clear of the practice board's buttons left of the board's near corner (SandboxControls), and of
		// the screen's edge; as wide as there's room for, up to a limit
		const panelRight = left - SYMBOL_SIZE * 1.1;
		const panelLeft = Math.max(screen.left + 24, panelRight - SYMBOL_SIZE * 7.5);
		const width = panelRight - panelLeft;
		// the whole notebook opened over the board, from near the screen's top to the UI's bar
		const overlayWidth = SYMBOL_SIZE * 9;
		const overlayTop = Math.max(screen.top + 16, 0);
		const overlayHeight = screen.uiTop - 16 - overlayTop;
		return {
			...none,
			panel: { x: panelLeft, y: top, width, height: bottom - top - TOGGLE_HEIGHT - gap, zoom: width / PAD_WIDTH },
			overlay: {
				x: board.x - overlayWidth / 2,
				y: overlayTop,
				width: overlayWidth,
				height: overlayHeight,
				zoom: overlayWidth / PAD_WIDTH,
			},
			toggle: { x: panelLeft, y: bottom - TOGGLE_HEIGHT / 2, scale: 1 },
		};
	}

	// tall and almost square screens: the strip sized for the room between the board and the UI, and
	// coming down with the portrait bar's panel as its drawer folds (uiTopNow)
	const stripTop = bottom + STRIP_GAP.above;
	const stripRoom = screen.uiTop - STRIP_GAP.below - stripTop;
	const stripHeight = Math.min(STRIP_MAX, Math.max(STRIP_ROOM - STRIP_GAP.above - STRIP_GAP.below, stripRoom));
	const overlayWidth = Math.min(right - left, screen.right - screen.left - 32);
	const zoom = overlayWidth / PAD_WIDTH;
	const overlayTop = screen.top + 24;
	// no taller than a pad of the desktop's shape needs to be
	const overlayHeight = Math.min(screen.uiTop - 16 - overlayTop, SYMBOL_SIZE * 9 * zoom);
	// the row just above the board: the board's far edge is drawn a little lower than its flat top
	// (TILT's depth), the row's middle half its height above that
	const ROW_SCALE = 1.3;
	const rowY = top + board.height * 0.04 - 8 - (TOGGLE_HEIGHT * ROW_SCALE) / 2;
	return {
		...none,
		strip: { x: left, y: stripTop + screen.uiTopNow - screen.uiTop, width: right - left, height: stripHeight },
		overlay: {
			x: board.x - overlayWidth / 2,
			y: overlayTop + (screen.uiTop - 16 - overlayTop - overlayHeight) / 2,
			width: overlayWidth,
			height: overlayHeight,
			zoom,
		},
		note: { x: right - SYMBOL_SIZE * 0.2, y: top + SYMBOL_SIZE * 0.6 },
		toggle: { x: left + 8 + (TOGGLE_WIDTH * ROW_SCALE) / 2, y: rowY, scale: ROW_SCALE },
		controls: { x: right - 8, y: rowY, scale: ROW_SCALE },
	};
};
