import type { ColorMatrix } from 'pixi.js';

// A duller, a little greyer look for art brighter than the dusk scene (the board): colours keep this
// share of their saturation, then are mixed this much with mid grey. The board frame's art has it
// baked in (art-source/board-frame.py, with the same numbers).
export const LOOK = { saturation: 0.6, grey: 0.08 };
// the fox's, 25% more vibrant: a quarter more of its saturation kept, a quarter less grey
export const FOX_LOOK = { saturation: LOOK.saturation * 1.25, grey: LOOK.grey * 0.75 };
type Look = typeof LOOK;
const LUMINANCE = [0.2126, 0.7152, 0.0722];
const MID_GREY = 0.5;

// a row of a look's colour matrix: [red, green, blue, alpha, offset] into the channel
const lookRow = (channel: number, look: Look = LOOK) => [
	...LUMINANCE.map((weight, k) => {
		const kept = (1 - look.saturation) * weight + (k === channel ? look.saturation : 0);
		return (1 - look.grey) * kept;
	}),
	0,
	look.grey * MID_GREY,
];

// for a ColorMatrixFilter
export const lookMatrix = (look: Look = LOOK) =>
	[
		...lookRow(0, look),
		...lookRow(1, look),
		...lookRow(2, look),
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
