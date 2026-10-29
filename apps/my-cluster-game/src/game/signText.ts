import { FillGradient, type TextStyleOptions } from 'pixi.js';

// Lettering like the logo's, for the bonus meter's count and the rune boxes' powers: Germania One
// (see assets.ts), heavier, yellow turning a little orange towards its bottom (a gradient over each
// text's own height), outlined dark brown.
export const SIGN_FONT = "'Germania One', serif";

const SIGN_FILL = new FillGradient({
	type: 'linear',
	start: { x: 0, y: 0 },
	end: { x: 0, y: 1 },
	colorStops: [
		{ offset: 0, color: 0xffe14d },
		{ offset: 0.55, color: 0xffcc33 },
		{ offset: 1, color: 0xf59a2a },
	],
	textureSpace: 'local',
});
const SIGN_OUTLINE = 0x2a1206;

export const signTextStyle = (fontSize: number): TextStyleOptions => ({
	fontFamily: SIGN_FONT,
	fontSize,
	fontWeight: 'bold',
	fill: SIGN_FILL,
	stroke: { color: SIGN_OUTLINE, width: fontSize * 0.1, join: 'round' },
});
