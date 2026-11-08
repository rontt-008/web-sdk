import type { TextStyleOptions } from 'pixi.js';

// The game's own plain lettering, on the table: the start screen's title CHESS and "press anywhere to
// continue". A serif (no font is bundled; games load nothing from other hosts, so it's the device's own
// Georgia or Times), bold, cream like the start screen cards' paper, widely spaced (`spacing` of the
// font size), with a soft shadow below it.
export const TITLE_FONT = ['Georgia', 'Times New Roman', 'serif'];
export const TITLE_TEXT = { fill: 0xf7f2e6, shadow: 0x1a0d06 };

export const titleTextStyle = (fontSize: number, spacing = 0.3): TextStyleOptions => ({
	fontFamily: TITLE_FONT,
	fontSize,
	fontWeight: 'bold',
	letterSpacing: fontSize * spacing,
	fill: TITLE_TEXT.fill,
	dropShadow: {
		color: TITLE_TEXT.shadow,
		alpha: 0.55,
		distance: fontSize * 0.035,
		blur: fontSize * 0.08,
		angle: Math.PI / 2,
	},
});

// Pixi puts the letter spacing after the last letter too, so a spaced text centred on its anchor sits
// half a space left of the middle: this much to add to its x (at its scale)
export const spacingShift = (fontSize: number, spacing = 0.3, scale = 1) => (fontSize * spacing * scale) / 2;
