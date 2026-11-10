import type * as PIXI from 'pixi.js';
import type { TextStyleOptions } from 'pixi.js';

import { TITLE_FONT } from './titleText';

// The game's printed look, the start screen cards' (InfoCard): cream paper with a thin ink border and a
// solid ink shadow straight below and right of it, flat serif lettering in ink with red accents, like a
// page of a chess book. The wins and the words over the board are printed the same way: the win cards
// (WinCard), the slips (PrintSlip, MoveLabel) and the pays on the squares (MoveWinAmounts).
export const PRINT_COLOURS = {
	paper: 0xf7f2e6,
	ink: 0x1d1915,
	red: 0x8b2e22,
	caption: 0x4a443c,
	// the SUPER BONUS's golden king's gold, where a print is on ink
	gold: 0xe8b23a,
};

// the lettering: a serif, flat (no outline)
export const printStyle = (
	size: number,
	fill: number,
	options: { bold?: boolean; spacing?: number } = {},
): TextStyleOptions => ({
	fontFamily: TITLE_FONT,
	fontSize: size,
	fontWeight: options.bold ? 'bold' : 'normal',
	letterSpacing: size * (options.spacing ?? 0),
	fill,
});

// a sheet of the paper from its top left corner: its shadow `offset` below and right of it, its border
// `border` wide, drawn inside its edge
export const drawPaper = (
	graphics: PIXI.Graphics,
	sheet: { x?: number; y?: number; width: number; height: number; offset: number; border: number; fill?: number },
) => {
	const { x = 0, y = 0, width, height, offset, border } = sheet;
	graphics
		.rect(x + offset, y + offset, width, height)
		.fill(PRINT_COLOURS.ink)
		.rect(x, y, width, height)
		.fill(sheet.fill ?? PRINT_COLOURS.paper)
		.stroke({ color: PRINT_COLOURS.ink, width: border, alignment: 1 });
};

// a band of chessboard squares, `cols` by `rows` of `cell`, ink on the paper, from its top left corner
// (`dark`: whether its first square is ink)
export const drawChecker = (
	graphics: PIXI.Graphics,
	band: { x: number; y: number; cols: number; rows: number; cell: number; dark?: boolean; colour?: number },
) => {
	const { x, y, cols, rows, cell } = band;
	for (let col = 0; col < cols; col++) {
		for (let row = 0; row < rows; row++) {
			if ((col + row) % 2 === (band.dark === false ? 1 : 0)) {
				graphics.rect(x + col * cell, y + row * cell, cell, cell).fill(band.colour ?? PRINT_COLOURS.ink);
			}
		}
	}
};

// The big wins' ranks are the pieces', lowest to highest: a BIG WIN is a knight, a SUPER WIN a bishop,
// a MEGA WIN a rook, an EPIC WIN a queen and the MAX WIN the golden king (WinCard's ladder; the win
// climbs it as it counts up). By the win levels' aliases (winLevelMap).
export const WIN_RANKS = [
	{ alias: 'big', piece: 'bN', text: 'BIG WIN' },
	{ alias: 'superwin', piece: 'bB', text: 'SUPER WIN' },
	{ alias: 'mega', piece: 'bR', text: 'MEGA WIN' },
	{ alias: 'epic', piece: 'bQ', text: 'EPIC WIN' },
	{ alias: 'max', piece: 'gK', text: 'MAX WIN' },
] as const;

// the rank a win is at, `progress` (0 to 1) of the way through its count up to the rank of `alias`
// (none for a win below the big ones)
export const winRankAt = (alias: string | undefined, progress: number) => {
	const top = WIN_RANKS.findIndex((rank) => rank.alias === alias);
	if (top < 0) return undefined;
	const index = Math.min(top, Math.floor(Math.min(1, Math.max(0, progress)) * (top + 1)));
	return { index, top, ...WIN_RANKS[index] };
};

// the text drawn at the size it's seen at (the layout scales it), so it's crisp
export const printResolution = (layoutScale: number) =>
	Math.max(1, layoutScale * Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2));
