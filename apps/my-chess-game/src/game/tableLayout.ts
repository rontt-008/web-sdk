import { stateLayoutDerived } from './stateLayout';
import { SYMBOL_SIZE } from './constants';

// The wooden table (static/assets/table.webp, art-source/table.png: TABLE its size in px) as it's drawn
// (Background): over the whole screen, its top left corner in the screen's, so the lamp and the book are
// always in view and what's cut off is plain wood (right and bottom); a little more than the screen
// (MARGIN), so the camera's zoom and shake never show its edge. In the main layout's units (its
// container is centred on the screen), with `scale` its units per px of the picture.
export const TABLE = { width: 1731, height: 909 };
const MARGIN = SYMBOL_SIZE * 0.15;

export const tableLayout = () => {
	const main = stateLayoutDerived.mainLayout();
	const canvas = stateLayoutDerived.canvasSizes();
	const width = canvas.width / main.scale + MARGIN * 2;
	const height = canvas.height / main.scale + MARGIN * 2;
	const scale = Math.max(width / TABLE.width, height / TABLE.height);
	return {
		x: main.width / 2 - canvas.width / main.scale / 2 - MARGIN,
		y: main.height / 2 - canvas.height / main.scale / 2 - MARGIN,
		width: TABLE.width * scale,
		height: TABLE.height * scale,
		scale,
	};
};
