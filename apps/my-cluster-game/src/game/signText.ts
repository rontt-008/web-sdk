import { FillGradient, type TextStyleOptions } from 'pixi.js';

// Lettering like the logo's, for the game's own texts (on the board, the bonus meter and signs, the
// win and bonus screens, the start screen; not the UI's bar and menus, which keep their own font):
// Germania One (see assets.ts), heavier, in a gradient over each text's own height, light at the top
// and deep at the bottom (its line, of which the capitals take about 0.26 to 0.78, so the stops are
// set on them), outlined dark brown, the outline OUTLINE_WIDTH of the font size.
export const SIGN_FONT = "'Germania One', serif";

// a gradient's colours: over the capitals' upper part, their middle, lower down, and their bottom
const signFill = ([top, middle, lower, bottom]: [number, number, number, number]) =>
	new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		colorStops: [
			{ offset: 0, color: top },
			{ offset: 0.3, color: top },
			{ offset: 0.5, color: middle },
			{ offset: 0.66, color: lower },
			{ offset: 0.8, color: bottom },
			{ offset: 1, color: bottom },
		],
		textureSpace: 'local',
	});

// yellow turning deep orange, the game's own; green for the bonus and orange-red for the super bonus,
// as their zones on the bonus meter are; red and purple for the bigger cluster wins (ClusterWinAmount)
const SIGN_FILLS = {
	yellow: signFill([0xffe14d, 0xffc933, 0xf7921e, 0xd9480f]),
	green: signFill([0xa6f07a, 0x62d94c, 0x2fb53c, 0x17802b]),
	orange: signFill([0xff8c3a, 0xff6526, 0xe83c16, 0xb81e0a]),
	red: signFill([0xff7a6e, 0xf2433a, 0xc8201f, 0x8a0d12]),
	purple: signFill([0xe3aaff, 0xc06cf5, 0x9236d9, 0x5e1a9c]),
};
export type SignColour = keyof typeof SIGN_FILLS;

const SIGN_OUTLINE = 0x2a1206;
const OUTLINE_WIDTH = 0.1;

export const signTextStyle = (
	fontSize: number,
	colour: SignColour = 'yellow',
): TextStyleOptions => ({
	fontFamily: SIGN_FONT,
	fontSize,
	fontWeight: 'bold',
	fill: SIGN_FILLS[colour],
	stroke: { color: SIGN_OUTLINE, width: fontSize * OUTLINE_WIDTH, join: 'round' },
});

export const bonusSignTextStyle = (fontSize: number) => signTextStyle(fontSize, 'green');
export const superSignTextStyle = (fontSize: number) => signTextStyle(fontSize, 'orange');
