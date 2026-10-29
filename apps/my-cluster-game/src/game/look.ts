import type { ColorMatrix } from 'pixi.js';

// A duller, a little greyer look for art brighter than the dusk scene (the fox, the board): colours
// keep this share of their saturation, then are mixed this much with mid grey. The board frame's art
// has it baked in (art-source/board-frame.py, with the same numbers).
export const LOOK = { saturation: 0.6, grey: 0.08 };
const LUMINANCE = [0.2126, 0.7152, 0.0722];
const MID_GREY = 0.5;

// a row of the look's colour matrix: [red, green, blue, alpha, offset] into the channel
const lookRow = (channel: number) => [
	...LUMINANCE.map((weight, k) => {
		const kept = (1 - LOOK.saturation) * weight + (k === channel ? LOOK.saturation : 0);
		return (1 - LOOK.grey) * kept;
	}),
	0,
	LOOK.grey * MID_GREY,
];

// for a ColorMatrixFilter
export const LOOK_MATRIX = [
	...lookRow(0),
	...lookRow(1),
	...lookRow(2),
	...[0, 0, 0, 1, 0],
] as ColorMatrix;

// a colour (0xrrggbb) in the look
export const lookColor = (color: number) => {
	const rgb = [color >> 16, color >> 8, color].map((channel) => (channel & 0xff) / 255);
	return [0, 1, 2].reduce((out, channel) => {
		const row = lookRow(channel);
		const value = row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2] + row[4];
		const byte = Math.round(Math.min(1, Math.max(0, value)) * 255);
		return (out << 8) | byte;
	}, 0);
};
